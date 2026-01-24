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
  owner_id: string;
  ph?: number | null;
  temperature?: number | null;  // Database column: temperature (stores Fahrenheit consistently)
  ammonia_ppm?: number | null;
  nitrite_ppm?: number | null;
  nitrate_ppm?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateWaterLogParams {
  tankId: string;
  ph?: number | null;
  temperature?: number | null;  // Temperature in Fahrenheit
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
  limit?: number;
  fromDate?: string;  // ISO date string - filter logs from this date onwards
}

/**
 * Create a new water parameter log
 * REQUIRES authenticated session - owner_id is set by RLS policy (auth.uid())
 * Database columns: id, owner_id, tank_id, ph, temperature, ammonia_ppm, nitrite_ppm, nitrate_ppm, notes, created_at
 */
export async function createWaterLog(params: CreateWaterLogParams): Promise<CreateWaterLogResult> {
  if (!isSupabaseConfigured()) {
    warnOnce('createWaterLog-no-config', '[WaterLogs] Supabase not configured');
    return { error: { message: 'Supabase not configured', code: 'NO_CONFIG' } };
  }

  // REQUIRE authenticated session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    console.error('[WaterLog] No active session - user must be authenticated');
    return {
      error: {
        message: 'Please sign in to save water logs',
        code: 'NO_SESSION'
      }
    };
  }

  // Validate tankId is a valid UUID
  if (!params.tankId || !isValidUUID(params.tankId)) {
    console.error('[WaterLog] Invalid or missing tankId:', params.tankId);
    return { 
      error: { 
        message: 'Invalid tank ID. Please select a valid tank.',
        code: 'INVALID_TANK_ID'
      } 
    };
  }

  try {
    // Map to exact database column names
    // Database schema: id, owner_id, tank_id, ph, temperature, ammonia_ppm, nitrite_ppm, nitrate_ppm, notes, created_at
    const insertData = {
      tank_id: params.tankId,
      ph: params.ph ?? null,
      temperature: params.temperature ?? null,
      ammonia_ppm: params.ammonia ?? null,
      nitrite_ppm: params.nitrite ?? null,
      nitrate_ppm: params.nitrate ?? null,
      notes: params.notes ?? null,
    };

    // Debug logging in dev mode
    if (__DEV__) {
      console.log('[WaterLog] Inserting with fields:', Object.keys(insertData));
      console.log('[WaterLog] Session user ID:', session.user.id);
    }

    const { data, error } = await supabase
      .from('water_logs')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[WaterLog] Supabase insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      return { 
        error: { 
          message: error.message || 'Failed to save water log', 
          code: error.code || 'SUPABASE_ERROR'
        } 
      };
    }

    if (__DEV__) {
      console.log('[WaterLog] Insert successful, ID:', data?.id);
    }

    return { data };
  } catch (err) {
    console.error('[WaterLog] Exception during insert:', err);
    return { 
      error: { 
        message: err instanceof Error ? err.message : 'Unexpected error saving water log', 
        code: 'EXCEPTION' 
      } 
    };
  }
}

/**
 * List water logs for a tank
 * Supports optional date filtering for trends/charts
 */
export async function listWaterLogs(params: ListWaterLogsParams): Promise<RemoteWaterLog[]> {
  const { tankId, limit = 50, fromDate } = params;

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

    // Add date filter if provided
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    const { data, error } = await query
      .order('created_at', { ascending: true })  // ASC for trend charts
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
}): Promise<RemoteWaterLog | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!isValidUUID(params.tankId)) {
    console.warn('[WaterLog] getLatestWaterLog called with invalid tankId:', params.tankId);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('tank_id', params.tankId)
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
