import { supabase, isSupabaseConfigured } from './supabase';

// Warn once per session per error type
const warnedErrors = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!warnedErrors.has(key)) {
    console.warn(message);
    warnedErrors.add(key);
  }
}

/**
 * Validate that a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// TYPES
// ============================================

export interface RemoteTank {
  id: string;
  owner_id: string;
  name: string;
  tank_type: 'rectangle' | 'cube' | 'bowfront' | 'custom';
  size_gallons: number;
  water_type: 'freshwater' | 'saltwater' | 'brackish';
  start_date: string;
  created_at: string;
  updated_at: string;
}

export interface RemoteTankItem {
  id: string;
  tank_id: string;
  item_type: 'fish' | 'equipment' | 'decor' | 'plant';
  species_slug?: string; // For fish
  common_name?: string;
  nickname?: string;
  quantity: number;
  added_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTankParams {
  owner_id: string;
  name: string;
  tank_type: 'rectangle' | 'cube' | 'bowfront' | 'custom';
  size_gallons: number;
  water_type: 'freshwater' | 'saltwater' | 'brackish';
  start_date?: string;
}

export interface UpdateTankParams {
  name?: string;
  tank_type?: 'rectangle' | 'cube' | 'bowfront' | 'custom';
  size_gallons?: number;
  water_type?: 'freshwater' | 'saltwater' | 'brackish';
}

export interface CreateTankItemParams {
  tank_id: string;
  item_type: 'fish' | 'equipment' | 'decor' | 'plant';
  species_slug?: string;
  common_name?: string;
  nickname?: string;
  quantity: number;
}

export interface TankResult {
  data?: RemoteTank;
  error?: { message: string; code: string };
}

export interface TankItemResult {
  data?: RemoteTankItem;
  error?: { message: string; code: string };
}

// ============================================
// TANKS OPERATIONS
// ============================================

/**
 * List all tanks for the authenticated user
 * RLS automatically filters by auth.uid()
 */
export async function listTanks(): Promise<RemoteTank[]> {
  if (!isSupabaseConfigured()) {
    warnOnce('listTanks-no-config', '[Tanks] Supabase not configured');
    return [];
  }

  try {
    // RLS policy handles filtering by owner_id = auth.uid()
    const { data, error } = await supabase
      .from('tanks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      warnOnce('listTanks', `[Tanks] listTanks error: ${error.message}`);
      console.error('[Tanks] List error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce('listTanks-catch', `[Tanks] listTanks exception: ${err}`);
    console.error('[Tanks] List exception:', err);
    return [];
  }
}

/**
 * Get a single tank by ID
 * RLS ensures only owned tanks are returned
 */
export async function getTankById(tankId: string): Promise<RemoteTank | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!isValidUUID(tankId)) {
    console.warn('[Tanks] getTankById called with invalid tankId:', tankId);
    return null;
  }

  try {
    // RLS policy handles filtering by owner_id = auth.uid()
    const { data, error } = await supabase
      .from('tanks')
      .select('*')
      .eq('id', tankId)
      .maybeSingle();

    if (error) {
      warnOnce(`getTankById-${tankId}`, `[Tanks] getTankById error: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getTankById-catch', `[Tanks] getTankById exception: ${err}`);
    return null;
  }
}

/**
 * Create a new tank
 * IMPORTANT: Requires authenticated session with session.user
 */
export async function createTank(params: CreateTankParams): Promise<TankResult> {
  if (!isSupabaseConfigured()) {
    const errorMsg = '[Tanks] Supabase not configured';
    console.error(errorMsg);
    warnOnce('createTank-no-config', errorMsg);
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  // Validate owner_id is a valid UUID
  if (!isValidUUID(params.owner_id)) {
    const errorMsg = `[Tanks] Invalid owner_id (not a UUID): ${params.owner_id}`;
    console.error(errorMsg);
    return {
      error: {
        message: `Invalid owner ID format. Expected UUID, got: ${params.owner_id}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    const insertData = {
      owner_id: params.owner_id,
      name: params.name,
      tank_type: params.tank_type,
      size_gallons: params.size_gallons,
      water_type: params.water_type,
      start_date: params.start_date || new Date().toISOString(),
    };

    console.log('[Tanks] Creating tank:', insertData);

    // RLS policy ensures owner_id = auth.uid()
    const { data, error } = await supabase
      .from('tanks')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[Tanks] Create error:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
      warnOnce('createTank-error', `[Tanks] createTank error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    if (!data) {
      const errorMsg = '[Tanks] No data returned after insert';
      console.error(errorMsg);
      return { error: { message: 'No data returned', code: 'NO_DATA' } };
    }

    console.log('[Tanks] Tank created successfully:', data.id);
    return { data };
  } catch (err) {
    console.error('[Tanks] createTank exception:', err);
    warnOnce('createTank-catch', `[Tanks] createTank exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Update an existing tank
 * RLS ensures only owned tanks can be updated
 */
export async function updateTank(
  tankId: string,
  updates: UpdateTankParams
): Promise<TankResult> {
  if (!isSupabaseConfigured()) {
    warnOnce('updateTank-no-config', '[Tanks] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  if (!isValidUUID(tankId)) {
    console.error('[Tanks] Invalid tankId (not a UUID):', tankId);
    return {
      error: {
        message: `Invalid tank ID format. Expected UUID, got: ${tankId}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    console.log('[Tanks] Updating tank:', tankId, updates);

    // RLS policy ensures owner_id = auth.uid()
    const { data, error } = await supabase
      .from('tanks')
      .update(updates)
      .eq('id', tankId)
      .select()
      .single();

    if (error) {
      console.error('[Tanks] Update error:', error.message, error.code);
      warnOnce('updateTank-error', `[Tanks] updateTank error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[Tanks] updateTank exception:', err);
    warnOnce('updateTank-catch', `[Tanks] updateTank exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Delete a tank
 * RLS ensures only owned tanks can be deleted
 */
export async function deleteTank(tankId: string): Promise<{ error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    warnOnce('deleteTank-no-config', '[Tanks] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  if (!isValidUUID(tankId)) {
    console.error('[Tanks] Invalid tankId (not a UUID):', tankId);
    return {
      error: {
        message: `Invalid tank ID format. Expected UUID, got: ${tankId}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    console.log('[Tanks] Deleting tank:', tankId);

    // RLS policy ensures owner_id = auth.uid()
    const { error } = await supabase
      .from('tanks')
      .delete()
      .eq('id', tankId);

    if (error) {
      console.error('[Tanks] Delete error:', error.message, error.code);
      warnOnce('deleteTank-error', `[Tanks] deleteTank error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return {};
  } catch (err) {
    console.error('[Tanks] deleteTank exception:', err);
    warnOnce('deleteTank-catch', `[Tanks] deleteTank exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

// ============================================
// TANK ITEMS OPERATIONS
// ============================================

/**
 * List all items for a specific tank
 * RLS ensures only items from owned tanks are returned
 */
export async function listTankItems(tankId: string): Promise<RemoteTankItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  if (!isValidUUID(tankId)) {
    console.warn('[TankItems] listTankItems called with invalid tankId:', tankId);
    return [];
  }

  try {
    // RLS policy checks tank ownership via JOIN
    const { data, error } = await supabase
      .from('tank_items')
      .select('*')
      .eq('tank_id', tankId)
      .order('added_at', { ascending: false });

    if (error) {
      warnOnce(`listTankItems-${tankId}`, `[TankItems] listTankItems error: ${error.message}`);
      console.error('[TankItems] List error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce('listTankItems-catch', `[TankItems] listTankItems exception: ${err}`);
    console.error('[TankItems] List exception:', err);
    return [];
  }
}

/**
 * Create a new tank item (fish, equipment, decor, plant)
 * RLS ensures the tank belongs to the authenticated user
 */
export async function createTankItem(params: CreateTankItemParams): Promise<TankItemResult> {
  if (!isSupabaseConfigured()) {
    warnOnce('createTankItem-no-config', '[TankItems] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  if (!isValidUUID(params.tank_id)) {
    console.error('[TankItems] Invalid tank_id (not a UUID):', params.tank_id);
    return {
      error: {
        message: `Invalid tank ID format. Expected UUID, got: ${params.tank_id}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    const insertData = {
      tank_id: params.tank_id,
      item_type: params.item_type,
      species_slug: params.species_slug || null,
      common_name: params.common_name || null,
      nickname: params.nickname || null,
      quantity: params.quantity,
      added_at: new Date().toISOString(),
    };

    console.log('[TankItems] Creating item:', insertData);

    // RLS policy checks tank ownership
    const { data, error } = await supabase
      .from('tank_items')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[TankItems] Create error:', error.message, error.code);
      warnOnce('createTankItem-error', `[TankItems] createTankItem error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[TankItems] createTankItem exception:', err);
    warnOnce('createTankItem-catch', `[TankItems] createTankItem exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Update a tank item
 * RLS ensures the item's tank belongs to the authenticated user
 */
export async function updateTankItem(
  itemId: string,
  updates: Partial<Omit<RemoteTankItem, 'id' | 'tank_id' | 'created_at' | 'updated_at'>>
): Promise<TankItemResult> {
  if (!isSupabaseConfigured()) {
    warnOnce('updateTankItem-no-config', '[TankItems] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  if (!isValidUUID(itemId)) {
    console.error('[TankItems] Invalid itemId (not a UUID):', itemId);
    return {
      error: {
        message: `Invalid item ID format. Expected UUID, got: ${itemId}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    console.log('[TankItems] Updating item:', itemId, updates);

    // RLS policy checks tank ownership via JOIN
    const { data, error } = await supabase
      .from('tank_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[TankItems] Update error:', error.message, error.code);
      warnOnce('updateTankItem-error', `[TankItems] updateTankItem error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[TankItems] updateTankItem exception:', err);
    warnOnce('updateTankItem-catch', `[TankItems] updateTankItem exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * Delete a tank item
 * RLS ensures the item's tank belongs to the authenticated user
 */
export async function deleteTankItem(itemId: string): Promise<{ error?: { message: string; code: string } }> {
  if (!isSupabaseConfigured()) {
    warnOnce('deleteTankItem-no-config', '[TankItems] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  if (!isValidUUID(itemId)) {
    console.error('[TankItems] Invalid itemId (not a UUID):', itemId);
    return {
      error: {
        message: `Invalid item ID format. Expected UUID, got: ${itemId}`,
        code: 'INVALID_UUID'
      }
    };
  }

  try {
    console.log('[TankItems] Deleting item:', itemId);

    // RLS policy checks tank ownership via JOIN
    const { error } = await supabase
      .from('tank_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[TankItems] Delete error:', error.message, error.code);
      warnOnce('deleteTankItem-error', `[TankItems] deleteTankItem error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return {};
  } catch (err) {
    console.error('[TankItems] deleteTankItem exception:', err);
    warnOnce('deleteTankItem-catch', `[TankItems] deleteTankItem exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}
