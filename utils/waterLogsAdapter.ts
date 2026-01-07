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
    temp: remote.temperature ?? 0,  // Database uses temperature column
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
 * Accepts either string values (from form inputs) or number values (pre-parsed)
 * Returns { ok: boolean, reason?: string, errorMessage?: string, errorCode?: string, data?: WaterLog }
 */
export async function saveWaterLog(
  tankId: string,
  values: {
    ph?: string | number | null;
    temperature?: string | number | null;
    ammonia?: string | number | null;
    nitrite?: string | number | null;
    nitrate?: string | number | null;
    notes?: string | null;
  }
): Promise<{ ok: boolean; reason?: string; errorMessage?: string; errorCode?: string; data?: WaterLog }> {
  // If remote logging disabled, return failure
  if (!USE_REMOTE_CATALOG) {
    return { ok: false, reason: 'remote_disabled' };
  }

  try {
    if (__DEV__) {
      console.log('[WaterLogsAdapter] saveWaterLog called with tankId:', tankId);
    }

    // Helper to convert value to number or null
    const toNumber = (val?: string | number | null): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return null;
        const parsed = Number(trimmed);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const result = await createWaterLog({
      tankId,
      ph: toNumber(values.ph),
      temperature: toNumber(values.temperature),
      ammonia: toNumber(values.ammonia),
      nitrite: toNumber(values.nitrite),
      nitrate: toNumber(values.nitrate),
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
  limit: number = 30
): Promise<WaterLog[]> {
  // If remote logging disabled, return empty array
  if (!USE_REMOTE_CATALOG) {
    return [];
  }

  try {
    const remoteLogs = await listWaterLogs({ 
      tankId,
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
  tankId: string
): Promise<WaterLog | null> {
  if (!USE_REMOTE_CATALOG) {
    return null;
  }

  try {
    const remote = await getLatestWaterLog({ 
      tankId
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
