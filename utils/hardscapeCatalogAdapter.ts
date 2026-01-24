/**
 * Hardscape Catalog Adapter (Decorations)
 * Handles CRUD operations for scape_hardscape table in Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface HardscapeItem {
  id: string;
  slug: string;
  name: string;
  itemType: 'rock' | 'driftwood' | 'cave' | 'ornament' | 'substrate';
  waterType: 'freshwater' | 'saltwater' | 'brackish' | 'both';
  description?: string;
  material?: string;
  affectsWaterChemistry?: boolean;
  careNotes?: string;
  imageKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DBHardscapeRow {
  id: string;
  slug: string;
  name: string;
  item_type: string;
  water_type: string;
  description?: string;
  material?: string;
  affects_water_chemistry?: boolean;
  care_notes?: string;
  image_key?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Convert DB row to UI model
 */
function dbRowToHardscape(row: DBHardscapeRow): HardscapeItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    itemType: row.item_type as 'rock' | 'driftwood' | 'cave' | 'ornament' | 'substrate',
    waterType: row.water_type as 'freshwater' | 'saltwater' | 'brackish' | 'both',
    description: row.description,
    material: row.material,
    affectsWaterChemistry: row.affects_water_chemistry,
    careNotes: row.care_notes,
    imageKey: row.image_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get hardscape catalog with optional filters
 */
export async function getHardscapeCatalog(options?: {
  search?: string;
  itemType?: 'rock' | 'driftwood' | 'cave' | 'ornament' | 'substrate';
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
}): Promise<HardscapeItem[]> {
  if (!isSupabaseConfigured()) {
    console.warn('[HardscapeCatalogAdapter] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('scape_hardscape')
      .select('*')
      .order('name', { ascending: true });

    // Apply type filter
    if (options?.itemType) {
      query = query.eq('item_type', options.itemType);
    }

    // Apply water type filter - handle 'both' water type
    if (options?.waterType) {
      query = query.or(`water_type.eq.${options.waterType},water_type.eq.both`);
    }

    // Apply search filter
    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = options.search.trim().toLowerCase();
      query = query.or(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,material.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[HardscapeCatalogAdapter] Error fetching hardscape:', error);
      return [];
    }

    return (data || []).map(dbRowToHardscape);
  } catch (err) {
    console.error('[HardscapeCatalogAdapter] Exception fetching hardscape:', err);
    return [];
  }
}

/**
 * Get a single hardscape item by slug
 */
export async function getHardscapeBySlug(slug: string): Promise<HardscapeItem | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[HardscapeCatalogAdapter] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('scape_hardscape')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('[HardscapeCatalogAdapter] Error fetching hardscape by slug:', error);
      return null;
    }

    return data ? dbRowToHardscape(data) : null;
  } catch (err) {
    console.error('[HardscapeCatalogAdapter] Exception fetching hardscape by slug:', err);
    return null;
  }
}

/**
 * Get a single hardscape item by ID
 */
export async function getHardscapeById(id: string): Promise<HardscapeItem | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[HardscapeCatalogAdapter] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('scape_hardscape')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[HardscapeCatalogAdapter] Error fetching hardscape by ID:', error);
      return null;
    }

    return data ? dbRowToHardscape(data) : null;
  } catch (err) {
    console.error('[HardscapeCatalogAdapter] Exception fetching hardscape by ID:', err);
    return null;
  }
}
