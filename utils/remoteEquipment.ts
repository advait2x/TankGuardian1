import { supabase, isSupabaseConfigured } from './supabase';

// Warn once per session per error type
const warnedErrors = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!warnedErrors.has(key)) {
    console.warn(message);
    warnedErrors.add(key);
  }
}

// ============================================
// TYPES
// ============================================

export type EquipmentCategory =
  | 'tank'
  | 'filter'
  | 'heater'
  | 'thermometer'
  | 'light'
  | 'air_pump'
  | 'co2'
  | 'filter_media'
  | 'water_conditioner'
  | 'test_kit'
  | 'maintenance'
  | 'feeder'
  | 'powerhead'
  | 'wavemaker'
  | 'skimmer'
  | 'ato'
  | 'return_pump';

export type EquipmentWaterType = 'freshwater' | 'saltwater' | 'both';
export type EquipmentStatus = 'installed' | 'wishlist' | 'owned' | 'removed';

export interface RemoteEquipmentCatalogItem {
  id: string;
  slug: string;
  brand: string;
  model: string;
  name: string;
  category: EquipmentCategory;
  water_type: EquipmentWaterType;
  min_tank_gal: number | null;
  max_tank_gal: number | null;
  wattage: number | null;
  flow_gph: number | null;
  description: string | null;
  pros: string | null;
  cons: string | null;
  affiliate_url: string | null;
  official_url: string | null;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RemoteTankEquipment {
  id: string;
  tank_id: string;
  equipment_id: string;
  status: EquipmentStatus;
  quantity: number;
  notes: string | null;
  installed_at: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
  // Nested equipment catalog data (from FK relationship)
  equipment_catalog?: RemoteEquipmentCatalogItem;
}

export interface EquipmentTag {
  id: string;
  tag: string;
  created_at: string;
}

export interface EquipmentListResult {
  items: RemoteEquipmentCatalogItem[];
  total?: number;
}

export interface ListEquipmentParams {
  category?: EquipmentCategory;
  waterType?: EquipmentWaterType;
  brand?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// EQUIPMENT CATALOG OPERATIONS
// ============================================

/**
 * List equipment from catalog with filters
 * Returns null on any error (caller should use fallback data)
 */
export async function listEquipmentCatalog(
  params: ListEquipmentParams = {}
): Promise<EquipmentListResult | null> {
  const { category, waterType, brand, search, limit = 50, offset = 0 } = params;

  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    let query = supabase
      .from('equipment_catalog')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Apply water type filter (include 'both' always)
    if (waterType) {
      query = query.or(`water_type.eq.${waterType},water_type.eq.both`);
    }

    // Apply brand filter
    if (brand && brand.trim()) {
      query = query.ilike('brand', `%${brand.trim()}%`);
    }

    // Apply search filter (name, brand, model)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(
        `name.ilike.${searchTerm},brand.ilike.${searchTerm},model.ilike.${searchTerm}`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('brand', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      warnOnce('listEquipmentCatalog', `[Equipment] listEquipmentCatalog error: ${error.message}`);
      return null;
    }

    return {
      items: data || [],
      total: count ?? undefined,
    };
  } catch (err) {
    warnOnce('listEquipmentCatalog-catch', `[Equipment] listEquipmentCatalog exception: ${err}`);
    return null;
  }
}

/**
 * Get a single equipment item by slug
 * Returns null on error or not found
 */
export async function getEquipmentBySlug(
  slug: string
): Promise<RemoteEquipmentCatalogItem | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('equipment_catalog')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      warnOnce(
        `getEquipmentBySlug-${slug}`,
        `[Equipment] getEquipmentBySlug error: ${error.message}`
      );
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getEquipmentBySlug-catch', `[Equipment] getEquipmentBySlug exception: ${err}`);
    return null;
  }
}

/**
 * Get equipment by ID
 * Returns null on error or not found
 */
export async function getEquipmentById(id: string): Promise<RemoteEquipmentCatalogItem | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('equipment_catalog')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      warnOnce(`getEquipmentById-${id}`, `[Equipment] getEquipmentById error: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getEquipmentById-catch', `[Equipment] getEquipmentById exception: ${err}`);
    return null;
  }
}

// ============================================
// TANK EQUIPMENT OPERATIONS
// ============================================

/**
 * Get installed equipment for a tank
 * Uses nested select to include equipment catalog details
 */
export async function getInstalledEquipment(tankId: string): Promise<RemoteTankEquipment[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tank_equipment')
      .select(
        `
        id,
        tank_id,
        equipment_id,
        status,
        quantity,
        notes,
        installed_at,
        created_at,
        equipment_catalog (
          id,
          slug,
          brand,
          model,
          name,
          category,
          water_type,
          min_tank_gal,
          max_tank_gal,
          wattage,
          flow_gph,
          image_key,
          description
        )
      `
      )
      .eq('tank_id', tankId)
      .eq('status', 'installed')
      .order('created_at', { ascending: false });

    if (error) {
      warnOnce(
        `getInstalledEquipment-${tankId}`,
        `[Equipment] getInstalledEquipment error: ${error.message}`
      );
      console.error('[Equipment] getInstalledEquipment error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce('getInstalledEquipment-catch', `[Equipment] getInstalledEquipment exception: ${err}`);
    console.error('[Equipment] getInstalledEquipment exception:', err);
    return [];
  }
}

/**
 * Get wishlist equipment for a tank
 * Uses nested select to include equipment catalog details
 */
export async function getWishlistEquipment(tankId: string): Promise<RemoteTankEquipment[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('tank_equipment')
      .select(
        `
        id,
        tank_id,
        equipment_id,
        status,
        quantity,
        notes,
        created_at,
        equipment_catalog (
          id,
          slug,
          brand,
          model,
          name,
          category,
          water_type,
          min_tank_gal,
          max_tank_gal,
          wattage,
          flow_gph,
          image_key,
          description
        )
      `
      )
      .eq('tank_id', tankId)
      .eq('status', 'wishlist')
      .order('created_at', { ascending: false });

    if (error) {
      warnOnce(
        `getWishlistEquipment-${tankId}`,
        `[Equipment] getWishlistEquipment error: ${error.message}`
      );
      console.error('[Equipment] getWishlistEquipment error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce('getWishlistEquipment-catch', `[Equipment] getWishlistEquipment exception: ${err}`);
    console.error('[Equipment] getWishlistEquipment exception:', err);
    return [];
  }
}

/**
 * Add equipment to a tank (installed or wishlist)
 */
export async function addEquipmentToTank(
  tankId: string,
  equipmentId: string,
  status: 'installed' | 'wishlist' = 'installed',
  quantity: number = 1,
  notes?: string
): Promise<{ data?: RemoteTankEquipment; error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  try {
    const insertData: any = {
      tank_id: tankId,
      equipment_id: equipmentId,
      status,
      quantity,
    };

    if (notes) {
      insertData.notes = notes;
    }

    if (status === 'installed') {
      insertData.installed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tank_equipment')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Equipment] addEquipmentToTank error:', error);
      warnOnce('addEquipmentToTank', `[Equipment] addEquipmentToTank error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[Equipment] addEquipmentToTank exception:', err);
    warnOnce('addEquipmentToTank-catch', `[Equipment] addEquipmentToTank exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Move equipment from wishlist to installed
 */
export async function moveWishlistToInstalled(
  tankEquipmentId: string
): Promise<{ data?: RemoteTankEquipment; error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  try {
    const { data, error } = await supabase
      .from('tank_equipment')
      .update({
        status: 'installed',
        installed_at: new Date().toISOString(),
      })
      .eq('id', tankEquipmentId)
      .select()
      .single();

    if (error) {
      console.error('[Equipment] moveWishlistToInstalled error:', error);
      warnOnce(
        'moveWishlistToInstalled',
        `[Equipment] moveWishlistToInstalled error: ${error.message}`
      );
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[Equipment] moveWishlistToInstalled exception:', err);
    warnOnce(
      'moveWishlistToInstalled-catch',
      `[Equipment] moveWishlistToInstalled exception: ${err}`
    );
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Remove equipment from tank (hard delete)
 */
export async function removeEquipmentFromTank(
  tankEquipmentId: string
): Promise<{ error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  try {
    const { error } = await supabase
      .from('tank_equipment')
      .delete()
      .eq('id', tankEquipmentId);

    if (error) {
      console.error('[Equipment] removeEquipmentFromTank error:', error);
      warnOnce(
        'removeEquipmentFromTank',
        `[Equipment] removeEquipmentFromTank error: ${error.message}`
      );
      return { error: { message: error.message, code: error.code } };
    }

    return {};
  } catch (err) {
    console.error('[Equipment] removeEquipmentFromTank exception:', err);
    warnOnce(
      'removeEquipmentFromTank-catch',
      `[Equipment] removeEquipmentFromTank exception: ${err}`
    );
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Update tank equipment (notes, quantity, etc.)
 */
export async function updateTankEquipment(
  tankEquipmentId: string,
  updates: { quantity?: number; notes?: string }
): Promise<{ data?: RemoteTankEquipment; error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  try {
    const { data, error } = await supabase
      .from('tank_equipment')
      .update(updates)
      .eq('id', tankEquipmentId)
      .select()
      .single();

    if (error) {
      console.error('[Equipment] updateTankEquipment error:', error);
      warnOnce('updateTankEquipment', `[Equipment] updateTankEquipment error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[Equipment] updateTankEquipment exception:', err);
    warnOnce('updateTankEquipment-catch', `[Equipment] updateTankEquipment exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Get recommended equipment for a tank based on water type and size
 * This uses a simple client-side filter for now
 * Later you can use the Supabase RPC function get_recommended_equipment
 */
export async function getRecommendedEquipment(
  waterType: 'freshwater' | 'saltwater' | 'brackish',
  gallons: number,
  limit: number = 10
): Promise<RemoteEquipmentCatalogItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    let query = supabase
      .from('equipment_catalog')
      .select('*')
      .eq('is_active', true)
      .or(`water_type.eq.${waterType},water_type.eq.both`);

    // Filter by tank size if specified
    query = query
      .or(`min_tank_gal.is.null,min_tank_gal.lte.${gallons}`)
      .or(`max_tank_gal.is.null,max_tank_gal.gte.${gallons}`)
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      warnOnce(
        'getRecommendedEquipment',
        `[Equipment] getRecommendedEquipment error: ${error.message}`
      );
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce(
      'getRecommendedEquipment-catch',
      `[Equipment] getRecommendedEquipment exception: ${err}`
    );
    return [];
  }
}
