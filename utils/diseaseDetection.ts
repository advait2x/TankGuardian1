/**
 * diseaseDetection.ts
 * 
 * Disease detection utilities for the Expo Router app.
 * Handles image upload, disease check creation, and AI analysis orchestration.
 */

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface UploadDiseaseImageParams {
  localUri: string;
  userId: string;
}

export interface UploadDiseaseImageResult {
  imagePath: string;
}

export interface CreateDiseaseCheckParams {
  ownerId: string;
  tankId: string | null;
  imagePath: string;
}

export interface CreateDiseaseCheckResult {
  id: string;
}

export interface RunDiseaseScanParams {
  localUri: string;
  tankId: string | null;
  onStep?: (step: string) => void;
}

export interface RunDiseaseScanResult {
  id: string;
  result: any;
}

/**
 * Generate a unique ID for file naming
 */
function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Upload disease image to Supabase storage
 * 
 * Uploads to bucket 'disease-images' with path ${userId}/${uuid}.ext
 * Uses expo-file-system to read as base64, then converts to ArrayBuffer
 */
export async function uploadDiseaseImage({
  localUri,
  userId,
}: UploadDiseaseImageParams): Promise<UploadDiseaseImageResult> {
  try {
    // Generate unique filename with extension detection
    const uuid = generateUniqueId();
    const extension = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuid}.${extension}`;
    const storagePath = `${userId}/${fileName}`;

    // Determine content type based on extension
    let contentType = 'image/jpeg';
    if (extension === 'png') contentType = 'image/png';
    else if (extension === 'heic' || extension === 'heif') contentType = 'image/heic';
    else if (extension === 'webp') contentType = 'image/webp';

    // Read image as base64 using expo-file-system
    console.log('[uploadDiseaseImage] Reading image from:', localUri);
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);
    
    // Log and validate byte length
    console.log('[uploadDiseaseImage] ArrayBuffer byteLength:', arrayBuffer.byteLength);
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Image file is empty (0 bytes)');
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('disease-images')
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      let errorMsg = `Storage upload failed: ${error.message}`;
      if ((error as any).details) errorMsg += ` | Details: ${(error as any).details}`;
      if ((error as any).hint) errorMsg += ` | Hint: ${(error as any).hint}`;
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('No data returned from storage upload');
    }

    return { imagePath: data.path };
  } catch (error) {
    console.error('[uploadDiseaseImage] Error:', error);
    throw error;
  }
}

/**
 * Create a new disease check record
 * 
 * Inserts into public.disease_checks with initial status 'processing'
 */
export async function createDiseaseCheck({
  ownerId,
  tankId,
  imagePath,
}: CreateDiseaseCheckParams): Promise<CreateDiseaseCheckResult> {
  try {
    // Build insert payload with explicit null handling
    const payload = {
      owner_id: ownerId,
      tank_id: tankId ?? null,
      image_path: imagePath,
      result: { status: 'processing' },
    };

    // Defensive logging (keys only, no sensitive data)
    console.log('[createDiseaseCheck] Inserting with keys:', Object.keys(payload));

    const { data, error } = await supabase
      .from('disease_checks')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      let errorMsg = `Failed to create disease check: ${error.message}`;
      if (error.details) errorMsg += ` | Details: ${error.details}`;
      if (error.hint) errorMsg += ` | Hint: ${error.hint}`;
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('No data returned from disease check creation');
    }

    console.log('[createDiseaseCheck] Created disease check with id:', data.id);
    return { id: data.id };
  } catch (error) {
    console.error('[createDiseaseCheck] Error:', error);
    throw error;
  }
}

/**
 * Fetch a disease check by ID
 */
export async function fetchDiseaseCheck(id: string) {
  try {
    const { data, error } = await supabase
      .from('disease_checks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      let errorMsg = `Failed to fetch disease check: ${error.message}`;
      if (error.details) errorMsg += ` | Details: ${error.details}`;
      if (error.hint) errorMsg += ` | Hint: ${error.hint}`;
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('Disease check not found');
    }

    return data;
  } catch (error) {
    console.error('[fetchDiseaseCheck] Error:', error);
    throw error;
  }
}

/**
 * Orchestrate the full disease scan workflow with polling
 * 
 * Steps:
 * 0. Verify user is authenticated
 * 1. Upload image to storage
 * 2. Create disease check record with status 'processing'
 * 3. Invoke 'disease-scan' edge function (async)
 * 4. Poll database every 1s for up to 30s until status is 'complete' or 'error'
 * 5. Return ID and result
 * 
 * Polling ensures we get the final result even if the edge function takes time.
 * Reports progress via onStep callback throughout the process.
 */
export async function runDiseaseScan({
  localUri,
  tankId,
  onStep,
}: RunDiseaseScanParams): Promise<RunDiseaseScanResult> {
  try {
    // Step 0: Verify authentication and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      let errorMsg = `Authentication failed: ${authError.message}`;
      if ((authError as any).details) errorMsg += ` | Details: ${(authError as any).details}`;
      if ((authError as any).hint) errorMsg += ` | Hint: ${(authError as any).hint}`;
      throw new Error(errorMsg);
    }
    
    if (!user) {
      throw new Error('Not signed in');
    }

    console.log('[runDiseaseScan] Authenticated user:', user.id);

    // Step 1: Upload image
    onStep?.('Uploading image...');
    const { imagePath } = await uploadDiseaseImage({
      localUri,
      userId: user.id,
    });

    // Step 2: Create disease check record
    onStep?.('Creating disease check...');
    const { id } = await createDiseaseCheck({
      ownerId: user.id,
      tankId: tankId || null,
      imagePath,
    });

    // Step 3: Invoke edge function and wait for response
    onStep?.('Analyzing image...');
    console.log('[runDiseaseScan] invoking edge function disease-scan for', id);
    
    // Get session token and pass it explicitly (RN/Expo doesn't always include auth automatically)
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
      throw new Error('Not authenticated');
    }

    const accessToken = sessionData.session.access_token;

    try {
      const { data, error } = await supabase.functions.invoke('disease-scan', {
        body: { diseaseCheckId: id },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      console.log('[runDiseaseScan] invoke returned', { data, error });
      
      if (error) throw error;
      
      // Check if the response indicates an error
      if (data && !data.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error('[runDiseaseScan] Edge function error:', e);
      
      const msg = e?.message ?? 'Edge function failed';

      await supabase
        .from('disease_checks')
        .update({
          status: 'failed',
          error_message: msg,
          completed_at: new Date().toISOString(),
          result: { status: 'error', error: msg, updatedAt: new Date().toISOString() },
        })
        .eq('id', id);

      onStep?.('Analysis failed');
      throw new Error(`Disease scan failed: ${msg}`);
    }

    // Step 4: Poll for result (1s intervals, 30s timeout)
    const pollInterval = 1000; // 1 second
    const maxPolls = 30; // 30 seconds total
    let pollCount = 0;
    let latestCheck: any = null;

    while (pollCount < maxPolls) {
      // Wait before polling (except first check which is immediate)
      if (pollCount > 0) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      try {
        latestCheck = await fetchDiseaseCheck(id);
        const status = latestCheck.result?.status;

        if (status === 'complete') {
          onStep?.('Analysis complete!');
          return {
            id,
            result: latestCheck.result,
          };
        }

        if (status === 'error') {
          onStep?.('Analysis failed');
          // Return the error result so UI can display it
          return {
            id,
            result: latestCheck.result,
          };
        }

        // Still processing, update step message with progress indicator
        const dots = '.'.repeat((pollCount % 3) + 1);
        onStep?.(`Analyzing image${dots}`);
      } catch (pollError) {
        console.error('[runDiseaseScan] Poll error:', pollError);
        // Continue polling even if one fetch fails
      }

      pollCount++;
    }

    // Timeout: update database and return error
    console.warn('[runDiseaseScan] Polling timeout after 30s');
    onStep?.('Analysis timed out');
    
    const timeoutMessage = 'Polling timeout after 30s';
    
    // Update database to mark as failed
    await supabase
      .from('disease_checks')
      .update({
        status: 'failed',
        error_message: timeoutMessage,
        completed_at: new Date().toISOString(),
        result: { 
          status: 'error', 
          error: timeoutMessage,
          updatedAt: new Date().toISOString() 
        },
      })
      .eq('id', id);
    
    // Return error result so UI can display it
    return {
      id,
      result: {
        status: 'error',
        error: timeoutMessage,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[runDiseaseScan] Error:', error);
    throw error;
  }
}
