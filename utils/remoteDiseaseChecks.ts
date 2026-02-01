/**
 * remoteDiseaseChecks.ts
 * 
 * Handles disease check operations in Supabase.
 * Schema: public.disease_checks (id, owner_id, tank_id, image_path, result, created_at)
 */

import { supabase } from './supabase';

interface DiseaseCheckResult {
  status: 'processing' | 'complete' | 'error';
  likelyIssue?: string;
  confidence?: number;
  advice?: string;
  symptoms?: string[];
  treatment?: string[];
  severity?: string;
  error?: string;
}

/**
 * Create a placeholder disease check record
 */
export async function createDiseaseCheckPlaceholder({
  tankId,
  ownerId,
  imagePath,
}: {
  tankId?: string;
  ownerId: string;
  imagePath: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const initialResult: DiseaseCheckResult = {
      status: 'processing',
    };

    const { data, error } = await supabase
      .from('disease_checks')
      .insert({
        owner_id: ownerId,
        tank_id: tankId || null,
        image_path: imagePath,
        result: initialResult,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[DiseaseCheck] Insert error:', error.message);
      return { ok: false, error: error.message };
    }

    if (!data?.id) {
      return { ok: false, error: 'No ID returned' };
    }

    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseCheck] Exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Update disease check with results
 */
export async function updateDiseaseCheckResult({
  id,
  ownerId,
  result,
  status,
  likelyIssue,
  confidence,
  advice,
  symptoms,
  treatment,
  severity,
  error: errorMessage,
}: {
  id: string;
  ownerId: string;
  result?: any;
  status: 'processing' | 'complete' | 'error';
  likelyIssue?: string;
  confidence?: number;
  advice?: string;
  symptoms?: string[];
  treatment?: string[];
  severity?: string;
  error?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resultData: DiseaseCheckResult = {
      status,
      likelyIssue,
      confidence,
      advice,
      symptoms,
      treatment,
      severity,
      error: errorMessage,
      ...result,
    };

    const { error } = await supabase
      .from('disease_checks')
      .update({ result: resultData })
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) {
      console.error('[DiseaseCheck] Update error:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseCheck] Exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Fetch disease check history for a user (and optionally a specific tank)
 */
export async function fetchDiseaseCheckHistory({
  ownerId,
  tankId,
  limit = 20,
  includeFailedScans = false,
}: {
  ownerId: string;
  tankId?: string;
  limit?: number;
  includeFailedScans?: boolean;
}): Promise<{
  ok: boolean;
  checks?: Array<{
    id: string;
    tank_id: string | null;
    image_path: string;
    result: DiseaseCheckResult;
    created_at: string;
    status?: string;
    error_message?: string;
  }>;
  error?: string;
}> {
  try {
    let query = supabase
      .from('disease_checks')
      .select('id, tank_id, image_path, result, created_at, status, error_message')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status: show only failed if toggle is on, otherwise only completed
    if (includeFailedScans) {
      query = query.eq('status', 'failed');
    } else {
      query = query.eq('status', 'completed');
    }

    if (tankId) {
      query = query.eq('tank_id', tankId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DiseaseCheck] Fetch error:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, checks: data || [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseCheck] Exception:', message);
    return { ok: false, error: message };
  }
}
