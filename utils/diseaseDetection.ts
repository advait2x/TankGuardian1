/**
 * diseaseDetection.ts
 * 
 * Main disease detection logic:
 * 1. Upload image to Supabase Storage
 * 2. Create disease_checks record
 * 3. Call external API (or stub)
 * 4. Update record with results
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import {
  createDiseaseCheckPlaceholder,
  updateDiseaseCheckResult,
} from './remoteDiseaseChecks';

/**
 * Generate unique filename for disease image
 */
function generateImageFilename(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.jpg`;
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImageToStorage({
  localUri,
  userId,
}: {
  localUri: string;
  userId: string;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    const filename = generateImageFilename();
    const storagePath = `${userId}/${filename}`;

    // Convert base64 to ArrayBuffer
    const arrayBuffer = base64ToArrayBuffer(base64);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('disease-images')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[DiseaseDetection] Upload error:', uploadError.message);
      return { ok: false, error: uploadError.message };
    }

    return { ok: true, path: storagePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseDetection] Upload exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Call Supabase edge function to run disease detection AI
 */
async function callDiseaseDetectionEdgeFunction({
  diseaseCheckId,
}: {
  diseaseCheckId: string;
}): Promise<{
  ok: boolean;
  result?: {
    likelyIssue: string | null;
    confidence: number;
    severity: string;
    observations: string[];
    advice: string[];
    disclaimer: string;
    model?: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('disease-scan', {
      body: {
        diseaseCheckId,
      },
    });

    if (error) {
      console.error('[DiseaseDetection] Edge function error:', error.message);
      return { ok: false, error: error.message };
    }

    if (!data || !data.ok) {
      return { ok: false, error: data?.error || 'Unknown error from edge function' };
    }

    return { ok: true, result: data.result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseDetection] Edge function exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Run complete disease detection workflow
 */
export async function runDiseaseDetection({
  localUri,
  tankId,
  sessionUserId,
  onProgress,
}: {
  localUri: string;
  tankId?: string;
  sessionUserId: string;
  onProgress?: (stage: 'uploading' | 'analyzing' | 'complete' | 'error') => void;
}): Promise<{
  ok: boolean;
  result?: {
    id: string;
    likelyIssue: string;
    confidence: number;
    symptoms: string[];
    treatment: string[];
    advice: string;
    severity: string;
  };
  error?: string;
}> {
  let diseaseCheckId: string | undefined;

  try {
    // Step 1: Upload image
    onProgress?.('uploading');
    const uploadResult = await uploadImageToStorage({
      localUri,
      userId: sessionUserId,
    });

    if (!uploadResult.ok || !uploadResult.path) {
      onProgress?.('error');
      return { ok: false, error: uploadResult.error || 'Upload failed' };
    }

    // Step 2: Create disease_checks record
    const createResult = await createDiseaseCheckPlaceholder({
      tankId,
      ownerId: sessionUserId,
      imagePath: uploadResult.path,
    });

    if (!createResult.ok || !createResult.id) {
      onProgress?.('error');
      return { ok: false, error: createResult.error || 'Failed to create record' };
    }

    diseaseCheckId = createResult.id;

    // Step 3: Call edge function for AI analysis
    onProgress?.('analyzing');
    const apiResult = await callDiseaseDetectionEdgeFunction({
      diseaseCheckId,
    });

    if (!apiResult.ok || !apiResult.result) {
      // Edge function already updated record with error
      onProgress?.('error');
      return { ok: false, error: apiResult.error || 'Analysis failed' };
    }

    // Step 4: Record already updated by edge function
    onProgress?.('complete');

    return {
      ok: true,
      result: {
        id: diseaseCheckId,
        likelyIssue: apiResult.result.likelyIssue || 'Unknown',
        confidence: apiResult.result.confidence,
        // Map new fields to old format for UI compatibility
        symptoms: apiResult.result.observations || [],
        treatment: apiResult.result.advice || [],
        advice: apiResult.result.disclaimer || '',
        severity: apiResult.result.severity,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DiseaseDetection] Exception:', message);

    onProgress?.('error');
    return { ok: false, error: message };
  }
}
