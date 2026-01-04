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
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export interface RemoteWaterLog {
  id: string;
  tank_id: string;
  owner_id?: string | null;
  device_id: string;
  ph?: number | null;
  temp_f?: number | null;
  ammonia_ppm?: number | null;
  nitrite_ppm?: number | null;
  nitrate_ppm?: number | null;
  salinity_sg?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateWaterLogParams {
  tankId: string;
  ownerId?: string | null;
  deviceId: string;
  ph?: number | null;
  tempF?: number | null;
  ammonia?: number | null;
  nitrite?: number | null;
  nitrate?: number | null;
  notes?: string | null;
}

export interface CreateWaterLogResult {
  data?: RemoteWaterLog;
  error?: {
    message: string;
    code?: string;
  };
}

export interface ListWaterLogsParams {
  tankId: string;
  ownerId?: string | null;
  deviceId?: string;
  limit?: number;
}

/**
 * Create a new water parameter log
 * Validates tankId as UUID and properly assigns owner_id/device_id
 */
export async function createWaterLog(params: CreateWaterLogParams): Promise<CreateWaterLogResult> {
  if (!isSupabaseConfigured()) {
    warnOnce('createWaterLog-no-config', '[WaterLogs] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  // Validate tankId is a valid UUID
  if (!isValidUUID(params.tankId)) {
    console.error('[WaterLog] Invalid tankId (not a UUID):', params.tankId);
    return { 
      error: { 
        message: `Invalid tank ID format. Expected UUID, got: ${params.tankId}`,
        code: 'INVALID_UUID'
      } 
    };
  }

  // Validate ownerId is UUID if provided
  if (params.ownerId && !isValidUUID(params.ownerId)) {
    console.error('[WaterLog] Invalid ownerId (not a UUID):', params.ownerId);
    return { 
      error: { 
        message: `Invalid owner ID format. Expected UUID, got: ${params.ownerId}`,
        code: 'INVALID_UUID'
      } 
    };
  }

  try {
    const insertData = {
      tank_id: params.tankId,
      owner_id: params.ownerId || null,
      device_id: params.deviceId,
      ph: params.ph,
      temp_f: params.tempF,
      ammonia_ppm: params.ammonia,
      nitrite_ppm: params.nitrite,
      nitrate_ppm: params.nitrate,
      notes: params.notes,
    };

    console.log('[WaterLog] Inserting:', insertData);

    const { data, error } = await supabase
      .from('water_logs')
      .insert(insertData)
      .select()
      .single();

    // Debug logging
    console.log('[WaterLog] insert result', { data, error });

    if (error) {
      console.error('[WaterLog] Supabase insert error:', error.message, error.code);
      warnOnce('createWaterLog-error', `[WaterLogs] createWaterLog error: ${error.message}`);
      return { error: { message: error.message, code: error.code } };
    }

    return { data };
  } catch (err) {
    console.error('[WaterLog] createWaterLog exception:', err);
    warnOnce('createWaterLog-catch', `[WaterLogs] createWaterLog exception: ${err}`);
    return { error: { message: String(err), code: 'EXCEPTION' } };
  }
}

/**
 * List water logs for a tank
 * Filters by tank_id and either owner_id (if provided) or device_id
 */
export async function listWaterLogs(params: ListWaterLogsParams): Promise<RemoteWaterLog[]> {
  const { tankId, ownerId, deviceId, limit = 50 } = params;

  if (!isSupabaseConfigured()) {
    return [];
  }

  // Validate tankId is a valid UUID
  if (!isValidUUID(tankId)) {
    console.warn('[WaterLog] listWaterLogs called with invalid tankId:', tankId);
    return [];
  }

  try {
    let query = supabase
      .from('water_logs')
      .select('*')
      .eq('tank_id', tankId);

    // If ownerId exists, filter by owner_id; otherwise filter by device_id
    if (ownerId) {
      if (!isValidUUID(ownerId)) {
        console.warn('[WaterLog] listWaterLogs called with invalid ownerId:', ownerId);
        return [];
      }
      query = query.eq('owner_id', ownerId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else {
      // Need either ownerId or deviceId to filter properly
      console.warn('[WaterLog] listWaterLogs called without ownerId or deviceId');
      return [];
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      warnOnce('listWaterLogs-error', `[WaterLogs] listWaterLogs error: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err) {
    warnOnce('listWaterLogs-catch', `[WaterLogs] listWaterLogs exception: ${err}`);
    return [];
  }
}

/**
 * Get the latest water log for a tank
 * Returns null if no logs or on error
 */
export async function getLatestWaterLog(params: { 
  tankId: string; 
  ownerId?: string | null;
  deviceId?: string;
}): Promise<RemoteWaterLog | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!isValidUUID(params.tankId)) {
    console.warn('[WaterLog] getLatestWaterLog called with invalid tankId:', params.tankId);
    return null;
  }

  try {
    let query = supabase
      .from('water_logs')
      .select('*')
      .eq('tank_id', params.tankId);

    if (params.ownerId) {
      if (!isValidUUID(params.ownerId)) {
        console.warn('[WaterLog] getLatestWaterLog called with invalid ownerId:', params.ownerId);
        return null;
      }
      query = query.eq('owner_id', params.ownerId);
    } else if (params.deviceId) {
      query = query.eq('device_id', params.deviceId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      warnOnce('getLatestWaterLog-error', `[WaterLogs] getLatestWaterLog error: ${error.message}`);
      return null;
    }

    return data;
  } catch (err) {
    warnOnce('getLatestWaterLog-catch', `[WaterLogs] getLatestWaterLog exception: ${err}`);
    return null;
  }
}
