/**
 * aquascapeRemote.ts
 * 
 * Handles aquascape layout persistence with Supabase.
 * Uses aquascapes + aquascape_versions tables + v_aquascape_latest view.
 */

import { supabase } from './supabase';

export interface AquascapeLayoutItem {
  id: string;
  type: 'rock' | 'wood' | 'plant';
  assetKey: string; // Legacy: emoji-based asset key (e.g., 'rock-1')
  catalogItemSlug?: string; // NEW: Reference to scape_flora or scape_hardscape slug
  catalogItemType?: 'flora' | 'hardscape'; // NEW: Which catalog table
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z: number; // z-index for layering
}

export interface AquascapeLayout {
  canvas: {
    w: number;
    h: number;
    zoom: number;
    panX: number;
    panY: number;
    groundY?: number; // Y-coordinate of substrate line in canvas space (deprecated, use substrate.heightPct)
    substrate?: {
      type: 'sand' | 'gravel' | 'black_sand' | 'bare';
      heightPct: number; // 0.0 - 1.0
    };
  };
  items: AquascapeLayoutItem[];
}

export interface AquascapeVersion {
  id: string;
  aquascape_id: string;
  owner_id: string;
  version: number;
  layout: AquascapeLayout;
  created_at: string;
}

/**
 * Fetch latest aquascape layout for a tank
 */
export async function getLatestAquascapeLayout(
  tankId: string,
  ownerId: string
): Promise<{
  ok: boolean;
  layout?: AquascapeLayout;
  version?: number;
  createdAt?: string;
  error?: string;
}> {
  try {
    console.log(`[AquascapeRemote] Loading layout for tank: ${tankId.slice(0, 8)}...`);

    // Query the view for latest version
    const { data, error } = await supabase
      .from('v_aquascape_latest')
      .select('version, layout, created_at')
      .eq('tank_id', tankId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) {
      console.error('[AquascapeRemote] Load error:', error.message);
      return { ok: false, error: error.message };
    }

    if (!data) {
      console.log('[AquascapeRemote] No layout found, using default');
      return { ok: true }; // No layout yet, caller will use default
    }

    console.log(`[AquascapeRemote] Loaded v${data.version} from ${new Date(data.created_at).toLocaleString()}`);
    return {
      ok: true,
      layout: data.layout as AquascapeLayout,
      version: data.version,
      createdAt: data.created_at,
    };
  } catch (err: any) {
    console.error('[AquascapeRemote] Exception:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Save aquascape layout (auto-increments version)
 */
export async function saveAquascapeLayout(
  tankId: string,
  ownerId: string,
  layout: AquascapeLayout
): Promise<{
  ok: boolean;
  version?: number;
  createdAt?: string;
  error?: string;
}> {
  try {
    console.log(`[AquascapeRemote] Saving layout for tank: ${tankId.slice(0, 8)}...`);

    // 1. Ensure aquascapes row exists
    const { data: aquascape, error: aquascapeError } = await supabase
      .from('aquascapes')
      .select('id')
      .eq('tank_id', tankId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (aquascapeError && aquascapeError.code !== 'PGRST116') {
      console.error('[AquascapeRemote] Aquascape lookup error:', aquascapeError.message);
      return { ok: false, error: aquascapeError.message };
    }

    let aquascapeId: string;

    if (!aquascape) {
      // Create new aquascapes row
      const { data: newAquascape, error: createError } = await supabase
        .from('aquascapes')
        .insert([{ tank_id: tankId, owner_id: ownerId }])
        .select('id')
        .single();

      if (createError || !newAquascape) {
        console.error('[AquascapeRemote] Create aquascape error:', createError?.message);
        return { ok: false, error: createError?.message || 'Failed to create aquascape' };
      }

      aquascapeId = newAquascape.id;
      console.log(`[AquascapeRemote] Created new aquascape: ${aquascapeId.slice(0, 8)}...`);
    } else {
      aquascapeId = aquascape.id;
    }

    // 2. Get latest version number
    const { data: versions, error: versionError } = await supabase
      .from('aquascape_versions')
      .select('version')
      .eq('aquascape_id', aquascapeId)
      .order('version', { ascending: false })
      .limit(1);

    if (versionError) {
      console.error('[AquascapeRemote] Version lookup error:', versionError.message);
      return { ok: false, error: versionError.message };
    }

    const newVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1;

    // 3. Insert new version
    const { data: newVersionData, error: insertError } = await supabase
      .from('aquascape_versions')
      .insert([{
        aquascape_id: aquascapeId,
        owner_id: ownerId,
        version: newVersion,
        layout: layout,
      }])
      .select('version, created_at')
      .single();

    if (insertError || !newVersionData) {
      console.error('[AquascapeRemote] Insert version error:', insertError?.message);
      return { ok: false, error: insertError?.message || 'Failed to save version' };
    }

    console.log(`[AquascapeRemote] Saved v${newVersionData.version} at ${new Date(newVersionData.created_at).toLocaleString()}`);
    return {
      ok: true,
      version: newVersionData.version,
      createdAt: newVersionData.created_at,
    };
  } catch (err: any) {
    console.error('[AquascapeRemote] Exception:', err.message);
    return { ok: false, error: err.message };
  }
}
