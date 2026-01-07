/**
 * remoteAquascapes.ts
 * 
 * Handles aquascape operations in Supabase.
 * Schema:
 * - public.aquascapes (id, owner_id, tank_id, name, notes, created_at, updated_at)
 * - public.aquascape_versions (id, aquascape_id, owner_id, version, layout, preview_image_path, created_at)
 * - public.v_aquascape_latest (view for quick loads)
 */

import { supabase } from './supabase';

export interface AquascapeLayoutItem {
  id: string;
  type: 'rock' | 'wood' | 'plant';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  meta?: Record<string, any>;
}

export interface AquascapeLayout {
  canvas: {
    w: number;
    h: number;
  };
  items: AquascapeLayoutItem[];
}

export interface Aquascape {
  id: string;
  owner_id: string;
  tank_id: string | null;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AquascapeVersion {
  id: string;
  aquascape_id: string;
  owner_id: string;
  version: number;
  layout: AquascapeLayout;
  preview_image_path: string | null;
  created_at: string;
}

/**
 * Get or create aquascape for a tank
 */
export async function getOrCreateAquascapeForTank({
  tankId,
  ownerId,
  tankName,
}: {
  tankId: string;
  ownerId: string;
  tankName?: string;
}): Promise<{ ok: boolean; aquascape?: Aquascape; error?: string }> {
  try {
    // First try to find existing
    const { data: existing, error: fetchError } = await supabase
      .from('aquascapes')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('tank_id', tankId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Aquascape] Fetch error:', fetchError.message);
      return { ok: false, error: fetchError.message };
    }

    if (existing) {
      return { ok: true, aquascape: existing };
    }

    // Create new aquascape
    const { data: newAquascape, error: insertError } = await supabase
      .from('aquascapes')
      .insert({
        owner_id: ownerId,
        tank_id: tankId,
        name: tankName ? `${tankName} Layout` : 'My Aquascape',
        notes: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Aquascape] Insert error:', insertError.message);
      return { ok: false, error: insertError.message };
    }

    return { ok: true, aquascape: newAquascape };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Aquascape] Exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Get latest aquascape layout for a tank
 */
export async function getLatestAquascapeLayout({
  tankId,
  ownerId,
}: {
  tankId: string;
  ownerId: string;
}): Promise<{
  ok: boolean;
  layout?: AquascapeLayout;
  version?: number;
  createdAt?: string;
  error?: string;
}> {
  try {
    // Query the view for latest version
    const { data, error } = await supabase
      .from('v_aquascape_latest')
      .select('layout, version, created_at')
      .eq('owner_id', ownerId)
      .eq('tank_id', tankId)
      .maybeSingle();

    if (error) {
      console.error('[Aquascape] Fetch latest error:', error.message);
      return { ok: false, error: error.message };
    }

    if (!data) {
      // No version yet, return empty layout
      return {
        ok: true,
        layout: { canvas: { w: 400, h: 300 }, items: [] },
        version: 0,
      };
    }

    return {
      ok: true,
      layout: data.layout as AquascapeLayout,
      version: data.version,
      createdAt: data.created_at,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Aquascape] Exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Save a new aquascape version
 */
export async function saveAquascapeVersion({
  aquascapeId,
  ownerId,
  layout,
}: {
  aquascapeId: string;
  ownerId: string;
  layout: AquascapeLayout;
}): Promise<{ ok: boolean; version?: number; error?: string }> {
  try {
    // Get current max version
    const { data: versions, error: fetchError } = await supabase
      .from('aquascape_versions')
      .select('version')
      .eq('aquascape_id', aquascapeId)
      .order('version', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[Aquascape] Fetch version error:', fetchError.message);
      return { ok: false, error: fetchError.message };
    }

    const currentMaxVersion = versions && versions.length > 0 ? versions[0].version : 0;
    const newVersion = currentMaxVersion + 1;

    // Insert new version
    const { error: insertError } = await supabase
      .from('aquascape_versions')
      .insert({
        aquascape_id: aquascapeId,
        owner_id: ownerId,
        version: newVersion,
        layout,
        preview_image_path: null,
      });

    if (insertError) {
      console.error('[Aquascape] Insert version error:', insertError.message);
      return { ok: false, error: insertError.message };
    }

    // Update aquascape updated_at
    await supabase
      .from('aquascapes')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', aquascapeId);

    return { ok: true, version: newVersion };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Aquascape] Exception:', message);
    return { ok: false, error: message };
  }
}
