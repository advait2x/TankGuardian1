import { Tank, FishInstance } from '@/data/types';
import {
  listTanks,
  getTankById,
  createTank,
  updateTank,
  deleteTank,
  listTankItems,
  createTankItem,
  updateTankItem,
  deleteTankItem,
  RemoteTank,
  RemoteTankItem,
  CreateTankParams,
  UpdateTankParams,
  isValidUUID,
} from './remoteTanks';
import { USE_REMOTE_CATALOG } from './config';

/**
 * Map remote tank to local Tank format
 */
function mapRemoteToLocal(remote: RemoteTank, items: RemoteTankItem[] = []): Tank {
  // Convert tank items to fish instances
  const fishInstances: FishInstance[] = items
    .filter(item => item.item_type === 'fish' && item.species_slug)
    .map(item => ({
      instanceId: item.id,
      speciesId: item.species_slug!,
      nickname: item.nickname || '',
      addedAt: item.added_at,
    }));

  // Extract equipment, decor, plant IDs
  const equipmentIds = items
    .filter(item => item.item_type === 'equipment')
    .map(item => item.id);
  const decorIds = items
    .filter(item => item.item_type === 'decor')
    .map(item => item.id);
  const plantIds = items
    .filter(item => item.item_type === 'plant')
    .map(item => item.id);

  return {
    id: remote.id,
    userId: remote.owner_id,
    name: remote.name,
    type: remote.tank_type as any,
    sizeGallons: remote.size_gallons,
    waterType: remote.water_type as any,
    startDate: remote.start_date,
    equipmentIds,
    decorIds,
    plantIds,
    fishInstances,
    parametersLog: [], // Water logs loaded separately
    tasks: [], // Tasks managed separately in local state
  };
}

/**
 * Fetch all tanks for the authenticated user
 * Returns empty array on error or if remote is disabled
 */
export async function fetchUserTanks(userId: string): Promise<{
  ok: boolean;
  tanks?: Tank[];
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  try {
    console.log('[TankAdapter] Fetching tanks for user:', userId);

    // List all tanks (RLS filters by auth.uid())
    const remoteTanks = await listTanks();

    // For each tank, fetch its items
    const tanksWithItems = await Promise.all(
      remoteTanks.map(async (remoteTank) => {
        const items = await listTankItems(remoteTank.id);
        return mapRemoteToLocal(remoteTank, items);
      })
    );

    console.log('[TankAdapter] Fetched tanks:', tanksWithItems.length);

    return { ok: true, tanks: tanksWithItems };
  } catch (err) {
    console.error('[TankAdapter] fetchUserTanks error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Create a new tank in Supabase
 */
export async function saveTank(params: {
  ownerId: string;
  name: string;
  tankType: 'rectangle' | 'cube' | 'bowfront' | 'custom';
  sizeGallons: number;
  waterType: 'freshwater' | 'saltwater' | 'brackish';
  startDate?: string;
}): Promise<{
  ok: boolean;
  tank?: Tank;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  try {
    console.log('[TankAdapter] Creating tank:', params);

    const createParams: CreateTankParams = {
      owner_id: params.ownerId,
      name: params.name,
      tank_type: params.tankType,
      size_gallons: params.sizeGallons,
      water_type: params.waterType,
      start_date: params.startDate,
    };

    const result = await createTank(createParams);

    if (result.error) {
      console.error('[TankAdapter] Create tank error:', result.error);
      return { ok: false, error: result.error.message };
    }

    if (result.data) {
      const tank = mapRemoteToLocal(result.data);
      console.log('[TankAdapter] Tank created:', tank.id);
      return { ok: true, tank };
    }

    return { ok: false, error: 'unknown_error' };
  } catch (err) {
    console.error('[TankAdapter] saveTank error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Update an existing tank
 */
export async function updateTankData(
  tankId: string,
  updates: Partial<{
    name: string;
    tankType: 'rectangle' | 'cube' | 'bowfront' | 'custom';
    sizeGallons: number;
    waterType: 'freshwater' | 'saltwater' | 'brackish';
  }>
): Promise<{
  ok: boolean;
  tank?: Tank;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  // Guard: only make remote calls for valid UUIDs
  if (!isValidUUID(tankId)) {
    console.warn('[TankAdapter] updateTankData skipped: tankId is not a UUID:', tankId);
    return { ok: false, error: 'invalid_uuid' };
  }

  try {
    console.log('[TankAdapter] Updating tank:', tankId, updates);

    const updateParams: UpdateTankParams = {
      name: updates.name,
      tank_type: updates.tankType,
      size_gallons: updates.sizeGallons,
      water_type: updates.waterType,
    };

    const result = await updateTank(tankId, updateParams);

    if (result.error) {
      console.error('[TankAdapter] Update tank error:', result.error);
      return { ok: false, error: result.error.message };
    }

    if (result.data) {
      // Fetch items to get complete tank
      const items = await listTankItems(result.data.id);
      const tank = mapRemoteToLocal(result.data, items);
      console.log('[TankAdapter] Tank updated:', tank.id);
      return { ok: true, tank };
    }

    return { ok: false, error: 'unknown_error' };
  } catch (err) {
    console.error('[TankAdapter] updateTankData error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Delete a tank
 */
export async function removeTank(tankId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  // Guard: only make remote calls for valid UUIDs
  if (!isValidUUID(tankId)) {
    console.warn('[TankAdapter] removeTank skipped: tankId is not a UUID:', tankId);
    return { ok: false, error: 'invalid_uuid' };
  }

  try {
    console.log('[TankAdapter] Deleting tank:', tankId);

    const result = await deleteTank(tankId);

    if (result.error) {
      console.error('[TankAdapter] Delete tank error:', result.error);
      return { ok: false, error: result.error.message };
    }

    console.log('[TankAdapter] Tank deleted:', tankId);
    return { ok: true };
  } catch (err) {
    console.error('[TankAdapter] removeTank error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Add a fish to a tank
 */
export async function addFishToTank(
  tankId: string,
  speciesSlug: string,
  nickname?: string
): Promise<{
  ok: boolean;
  itemId?: string;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  // Guard: only make remote calls for valid UUIDs
  if (!isValidUUID(tankId)) {
    console.warn('[TankAdapter] addFishToTank skipped: tankId is not a UUID:', tankId);
    return { ok: false, error: 'invalid_uuid' };
  }

  try {
    console.log('[TankAdapter] Adding fish to tank:', tankId, speciesSlug);

    const result = await createTankItem({
      tank_id: tankId,
      item_type: 'fish',
      species_slug: speciesSlug,
      nickname: nickname || undefined,
      quantity: 1,
    });

    if (result.error) {
      console.error('[TankAdapter] Add fish error:', result.error);
      return { ok: false, error: result.error.message };
    }

    if (result.data) {
      console.log('[TankAdapter] Fish added:', result.data.id);
      return { ok: true, itemId: result.data.id };
    }

    return { ok: false, error: 'unknown_error' };
  } catch (err) {
    console.error('[TankAdapter] addFishToTank error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Remove a fish from a tank (by item ID)
 */
export async function removeFishFromTank(itemId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  // Guard: only make remote calls for valid UUIDs
  if (!isValidUUID(itemId)) {
    console.warn('[TankAdapter] removeFishFromTank skipped: itemId is not a UUID:', itemId);
    return { ok: false, error: 'invalid_uuid' };
  }

  try {
    console.log('[TankAdapter] Removing fish:', itemId);

    const result = await deleteTankItem(itemId);

    if (result.error) {
      console.error('[TankAdapter] Remove fish error:', result.error);
      return { ok: false, error: result.error.message };
    }

    console.log('[TankAdapter] Fish removed:', itemId);
    return { ok: true };
  } catch (err) {
    console.error('[TankAdapter] removeFishFromTank error:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Update fish nickname
 */
export async function updateFishNickname(
  itemId: string,
  nickname: string
): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, error: 'remote_disabled' };
  }

  // Guard: only make remote calls for valid UUIDs
  if (!isValidUUID(itemId)) {
    console.warn('[TankAdapter] updateFishNickname skipped: itemId is not a UUID:', itemId);
    return { ok: false, error: 'invalid_uuid' };
  }

  try {
    console.log('[TankAdapter] Updating fish nickname:', itemId, nickname);

    const result = await updateTankItem(itemId, { nickname });

    if (result.error) {
      console.error('[TankAdapter] Update nickname error:', result.error);
      return { ok: false, error: result.error.message };
    }

    console.log('[TankAdapter] Nickname updated');
    return { ok: true };
  } catch (err) {
    console.error('[TankAdapter] updateFishNickname error:', err);
    return { ok: false, error: String(err) };
  }
}
