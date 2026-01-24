import { supabase, isSupabaseConfigured } from './supabase';

// Warn once per session per error type
const warnedErrors = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!warnedErrors.has(key)) {
    console.warn(message);
    warnedErrors.add(key);
  }
}

export interface RemoteFishSpecies {
  id: string;
  slug: string;
  common_name: string;
  scientific_name: string;
  water_type: 'freshwater' | 'saltwater' | 'brackish';
  adult_size_inches: number;
  min_tank_gallons: number;
  diet: string;
  temperament: string;
  care_level: string;
  image_key?: string;
  temp_min?: number;
  temp_max?: number;
  ph_min?: number;
  ph_max?: number;
  care_notes?: string;
  care_notes_short?: string;
}

export interface FishListResult {
  items: RemoteFishSpecies[];
  total?: number;
}

export interface ListFishParams {
  waterType?: 'freshwater' | 'saltwater' | 'brackish';
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * List fish species from Supabase
 * Returns null on any error (caller should use fallback data)
 */
export async function listFishSpecies(params: ListFishParams = {}): Promise<FishListResult | null> {
  const { waterType, search, limit = 50, offset = 0 } = params;

  // If Supabase not configured, return null immediately
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    let query = supabase
      .from('fish_species')
      .select('*', { count: 'exact' });

    // Apply water type filter
    if (waterType) {
      query = query.eq('water_type', waterType);
    }

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`common_name.ilike.${searchTerm},scientific_name.ilike.${searchTerm}`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      warnOnce('listFishSpecies', `[Supabase] listFishSpecies error: ${error.message}`);
      return null;
    }

    return {
      items: data || [],
      total: count ?? undefined,
    };
  } catch (err) {
    warnOnce('listFishSpecies-catch', `[Supabase] listFishSpecies exception: ${err}`);
    return null;
  }
}

/**
 * Get a single fish species by slug
 * Returns null on error or not found
 */
export async function getFishBySlug(slug: string): Promise<RemoteFishSpecies | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('fish_species')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      warnOnce(`getFishBySlug-${slug}`, `[Supabase] getFishBySlug error: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getFishBySlug-catch', `[Supabase] getFishBySlug exception: ${err}`);
    return null;
  }
}

export interface CompatibilityResult {
  level: 'compatible' | 'caution' | 'incompatible';
  notes?: string;
}

/**
 * Get compatibility between two fish species
 * Returns null if no compatibility data found or on error
 */
export async function getCompatibility(
  speciesIdA: string,
  speciesIdB: string
): Promise<CompatibilityResult | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    // Use canonical ordering: fish_a is always the "smaller" ID
    const [fishA, fishB] = [speciesIdA, speciesIdB].sort();

    const { data, error } = await supabase
      .from('fish_compatibility')
      .select('level, notes')
      .eq('fish_a', fishA)
      .eq('fish_b', fishB)
      .maybeSingle();

    if (error) {
      warnOnce('getCompatibility', `[Supabase] getCompatibility error: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getCompatibility-catch', `[Supabase] getCompatibility exception: ${err}`);
    return null;
  }
}

