import { WaterLog } from '@/data/types';
import { createWaterLog, listWaterLogs, getLatestWaterLog, RemoteWaterLog, CreateWaterLogResult } from './remoteWaterLogs';
import { USE_REMOTE_CATALOG } from './config';
import { getDeviceId } from './deviceId';

/**
 * Map remote water log to local format
 */
function mapRemoteToLocal(remote: RemoteWaterLog): WaterLog {
  return {
    id: remote.id,
    date: remote.created_at,
    ph: remote.ph ?? 0,
    ammonia: remote.ammonia_ppm ?? 0,
    nitrite: remote.nitrite_ppm ?? 0,
    nitrate: remote.nitrate_ppm ?? 0,
    temp: remote.temp_f ?? 0,
    notes: remote.notes ?? '',
  };
}

/**
 * Parse numeric string to number or null
 */
function parseNumeric(value?: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Save water parameter log to Supabase
 * Returns { ok: boolean, reason?: string, errorMessage?: string, errorCode?: string, data?: WaterLog }
 */
export async function saveWaterLog(
  tankId: string,
  ownerId: string | null,
  values: {
    ph?: string;
    temp?: string;
    ammonia?: string;
    nitrite?: string;
    nitrate?: string;
    notes?: string;
  }
): Promise<{ ok: boolean; reason?: string; errorMessage?: string; errorCode?: string; data?: WaterLog }> {
  // If remote logging disabled, return failure
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, reason: 'remote_disabled' };
  }

  try {
    const deviceId = getDeviceId();

    console.log('[WaterLogsAdapter] saveWaterLog called with:', {
      tankId,
      ownerId,
      deviceId,
      values,
    });

    const result = await createWaterLog({
      tankId,
      ownerId: ownerId || null,
      deviceId,
      ph: parseNumeric(values.ph),
      tempF: parseNumeric(values.temp),
      ammonia: parseNumeric(values.ammonia),
      nitrite: parseNumeric(values.nitrite),
      nitrate: parseNumeric(values.nitrate),
      notes: values.notes?.trim() || null,
    });

    if (result.data) {
      return { ok: true, data: mapRemoteToLocal(result.data) };
    }

    if (result.error) {
      return { 
        ok: false, 
        reason: 'supabase_error',
        errorMessage: result.error.message,
        errorCode: result.error.code
      };
    }

    return { ok: false, reason: 'unknown_error' };
  } catch (err) {
    console.warn('[WaterLogsAdapter] saveWaterLog exception:', err);
    return { 
      ok: false, 
      reason: 'exception',
      errorMessage: String(err)
    };
  }
}

/**
 * Fetch water logs for a tank
 * Returns empty array on error (never throws)
 */
export async function fetchWaterLogs(
  tankId: string, 
  ownerId: string | null,
  limit: number = 30
): Promise<WaterLog[]> {
  // If remote logging disabled, return empty array
  if (!USE_REMOTE_CATALOG) {
    return [];
  }

  try {
    const deviceId = getDeviceId();

    const remoteLogs = await listWaterLogs({ 
      tankId, 
      ownerId: ownerId || undefined,
      deviceId: ownerId ? undefined : deviceId,
      limit 
    });

    return remoteLogs.map(mapRemoteToLocal);
  } catch (err) {
    console.warn('[WaterLogsAdapter] fetchWaterLogs exception:', err);
    return [];
  }
}

/**
 * Get the most recent water log for a tank
 * Returns null on error or if no logs exist
 */
export async function getLatestLog(
  tankId: string,
  ownerId: string | null
): Promise<WaterLog | null> {
  if (!USE_REMOTE_CATALOG) {
    return null;
  }

  try {
    const deviceId = getDeviceId();

    const remote = await getLatestWaterLog({ 
      tankId,
      ownerId: ownerId || undefined,
      deviceId: ownerId ? undefined : deviceId,
    });

    if (remote) {
      return mapRemoteToLocal(remote);
    }
    return null;
  } catch (err) {
    console.warn('[WaterLogsAdapter] getLatestLog exception:', err);
    return null;
  }
}
