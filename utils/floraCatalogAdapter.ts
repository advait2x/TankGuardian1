/**
 * Flora Catalog Adapter (Plants & Corals)
 * Handles CRUD operations for scape_flora table in Supabase
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface FloraItem {
  id: string;
  slug: string;
  commonName: string;
  scientificName?: string;
  waterType: 'freshwater' | 'saltwater' | 'brackish' | 'both';
  difficulty: 'easy' | 'medium' | 'hard';
  lightRequirement?: 'low' | 'medium' | 'high';
  growthRate?: 'slow' | 'medium' | 'fast';
  maxHeightInches?: number;
  placement?: 'foreground' | 'midground' | 'background' | 'floating';
  careNotes?: string;
  imageKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DBFloraRow {
  id: string;
  slug: string;
  common_name: string;
  scientific_name?: string;
  water_type: string;
  difficulty: string;
  light_requirement?: string;
  growth_rate?: string;
  max_height_inches?: number;
  placement?: string;
  care_notes?: string;
  image_key?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Convert DB row to UI model
 */
function dbRowToFlora(row: DBFloraRow): FloraItem {
  return {
    id: row.id,
    slug: row.slug,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    waterType: row.water_type as 'freshwater' | 'saltwater' | 'brackish' | 'both',
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
    lightRequirement: row.light_requirement as 'low' | 'medium' | 'high' | undefined,
    growthRate: row.growth_rate as 'slow' | 'medium' | 'fast' | undefined,
    maxHeightInches: row.max_height_inches,
    placement: row.placement as 'foreground' | 'midground' | 'background' | 'floating' | undefined,
    careNotes: row.care_notes,
    imageKey: row.image_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get flora catalog with optional filters
 */
export async function getFloraCatalog(options?: {
  search?: string;
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<FloraItem[]> {
  if (!isSupabaseConfigured()) {
    console.warn('[FloraCatalogAdapter] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('scape_flora')
      .select('*')
      .order('common_name', { ascending: true });

    // Apply water type filter - handle 'both' water type
    if (options?.waterType) {
      query = query.or(`water_type.eq.${options.waterType},water_type.eq.both`);
    }

    // Apply difficulty filter
    if (options?.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }

    // Apply search filter (common name or scientific name)
    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = options.search.trim().toLowerCase();
      query = query.or(
        `common_name.ilike.%${searchTerm}%,scientific_name.ilike.%${searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FloraCatalogAdapter] Error fetching flora:', error);
      return [];
    }

    return (data || []).map(dbRowToFlora);
  } catch (err) {
    console.error('[FloraCatalogAdapter] Exception fetching flora:', err);
    return [];
  }
}

/**
 * Get a single flora item by slug
 */
export async function getFloraBySlug(slug: string): Promise<FloraItem | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[FloraCatalogAdapter] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('scape_flora')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('[FloraCatalogAdapter] Error fetching flora by slug:', error);
      return null;
    }

    return data ? dbRowToFlora(data) : null;
  } catch (err) {
    console.error('[FloraCatalogAdapter] Exception fetching flora by slug:', err);
    return null;
  }
}

/**
 * Get a single flora item by ID
 */
export async function getFloraById(id: string): Promise<FloraItem | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[FloraCatalogAdapter] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('scape_flora')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[FloraCatalogAdapter] Error fetching flora by ID:', error);
      return null;
    }

    return data ? dbRowToFlora(data) : null;
  } catch (err) {
    console.error('[FloraCatalogAdapter] Exception fetching flora by ID:', err);
    return null;
  }
}
