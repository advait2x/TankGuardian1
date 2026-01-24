/**
 * Supabase Edge Function: disease-scan
 * 
 * Analyzes fish images for diseases using OpenAI Vision API.
 * 
 * Environment Variables:
 * - PROJECT_URL (required - Supabase project URL)
 * - SERVICE_ROLE_KEY (required - Supabase service role key)
 * - SUPABASE_ANON_KEY (auto-provided)
 * - OPENAI_API_KEY (required for real AI, or returns stub)
 * 
 * POST Body:
 * { diseaseCheckId: string }
 * 
 * Returns:
 * { ok: true, result: {...} } or { ok: false, error: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiseaseResult {
  status: 'complete' | 'error';
  model: string;
  likelyIssue: string | null;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'unknown';
  observations: string[];
  advice: string[];
  disclaimer: string;
  updatedAt: string;
  error?: string;
}

/**
 * Call OpenAI GPT-4o Vision API with strict JSON output
 */
async function analyzeImageWithOpenAI(imageBase64: string): Promise<Omit<DiseaseResult, 'status' | 'model' | 'updatedAt'>> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.log('[disease-scan] No OPENAI_API_KEY configured, returning stub response');
    // Return stub response for testing
    const stubs = [
      {
        likelyIssue: 'Ich (White Spot Disease)',
        confidence: 0.87,
        severity: 'high' as const,
        observations: [
          'Multiple small white spots visible on body and fins',
          'Fish appears to be flashing (rubbing against objects)',
          'Fins appear slightly clamped'
        ],
        advice: [
          'Raise temperature gradually to 82-86°F over 48 hours',
          'Add aquarium salt (1 tablespoon per 5 gallons)',
          'Treat with ich medication following package directions',
          'Maintain excellent water quality with daily testing',
          'Continue treatment for at least 7 days after spots disappear'
        ],
        disclaimer: 'This analysis is for educational purposes only and does not constitute veterinary advice. Please consult a qualified aquarium veterinarian for proper diagnosis and treatment.'
      },
      {
        likelyIssue: null,
        confidence: 0.92,
        severity: 'low' as const,
        observations: [
          'Fish appears healthy with vibrant coloration',
          'Fins are fully extended and intact',
          'No visible lesions, spots, or abnormalities detected',
          'Body shape and posture appear normal'
        ],
        advice: [
          'Continue regular maintenance schedule',
          'Monitor daily for any behavioral changes',
          'Maintain stable water parameters',
          'Perform weekly 25-30% water changes'
        ],
        disclaimer: 'This analysis is for educational purposes only and does not constitute veterinary advice. Please consult a qualified aquarium veterinarian for proper diagnosis and treatment.'
      }
    ];
    return stubs[Math.floor(Math.random() * stubs.length)];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert aquarium fish disease diagnostic assistant. Analyze images for signs of disease or health issues in aquarium fish.

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text). Use this exact structure:
{
  "likelyIssue": "specific disease name or null if healthy",
  "confidence": 0.0 to 1.0,
  "severity": "low" | "medium" | "high" | "unknown",
  "observations": ["observable finding 1", "finding 2", ...],
  "advice": ["actionable step 1", "step 2", ...],
  "disclaimer": "This analysis is for educational purposes only and does not constitute veterinary advice. Please consult a qualified aquarium veterinarian for proper diagnosis and treatment."
}

Guidelines:
- likelyIssue: Specific disease name (e.g., "Ich", "Fin Rot") or null if fish appears healthy
- confidence: How confident you are in the assessment (0.0 = not confident, 1.0 = very confident)
- severity: "low" if no urgent action needed, "medium" if treatment recommended soon, "high" if immediate treatment needed, "unknown" if unclear
- observations: Specific visual findings you can see in the image
- advice: Actionable steps the aquarium owner should take
- disclaimer: Always include the disclaimer about this not being veterinary advice`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this aquarium fish image for any signs of disease or health issues. Respond with JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[disease-scan] OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonStr = match[1];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the response
    return {
      likelyIssue: parsed.likelyIssue || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      severity: ['low', 'medium', 'high', 'unknown'].includes(parsed.severity) 
        ? parsed.severity 
        : 'unknown',
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      advice: Array.isArray(parsed.advice) ? parsed.advice : [],
      disclaimer: parsed.disclaimer || 'This analysis is for educational purposes only and does not constitute veterinary advice.'
    };
  } catch (error) {
    console.error('[disease-scan] OpenAI API exception:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[disease-scan] function start');
    console.log('[disease-scan] Received request:', req.method);

    const PROJECT_URL = Deno.env.get('PROJECT_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    console.log('[disease-scan] env check', {
      hasProjectUrl: !!PROJECT_URL,
      hasServiceRoleKey: !!SERVICE_ROLE_KEY,
      hasAnon: !!supabaseAnonKey,
      hasOpenAI: !!openAIKey,
    });

    // Early validation: PROJECT_URL and SERVICE_ROLE_KEY are required
    if (!PROJECT_URL) {
      throw new Error('Missing PROJECT_URL environment variable');
    }
    if (!SERVICE_ROLE_KEY) {
      throw new Error('Missing SERVICE_ROLE_KEY environment variable');
    }

    // 1. Validate authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with user's auth token
    const supabaseUser = createClient(PROJECT_URL, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('[disease-scan] Auth failed:', authError?.message);
      throw new Error('Unauthorized');
    }

    console.log('[disease-scan] Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    const diseaseCheckId = body.diseaseCheckId;
    console.log('[disease-scan] Request body:', { diseaseCheckId });

    if (!diseaseCheckId) {
      throw new Error('Missing diseaseCheckId in request body');
    }

    // 2. Fetch disease_checks row and verify ownership
    const { data: diseaseCheck, error: fetchError } = await supabaseUser
      .from('disease_checks')
      .select('id, owner_id, image_path')
      .eq('id', diseaseCheckId)
      .single();

    if (fetchError || !diseaseCheck) {
      console.error('[disease-scan] Fetch error:', fetchError?.message);
      throw new Error('Disease check not found or access denied');
    }
    
    console.log('[disease-scan] Fetched disease_checks row:', { id: diseaseCheck.id, owner_id: diseaseCheck.owner_id, image_path: diseaseCheck.image_path });

    if (diseaseCheck.owner_id !== user.id) {
      console.error('[disease-scan] Owner mismatch:', diseaseCheck.owner_id, 'vs', user.id);
      throw new Error('Access denied: not the owner');
    }

    console.log('[disease-scan] Processing check:', diseaseCheckId, 'image:', diseaseCheck.image_path);

    // Create admin client for database updates
    const supabaseAdmin = createClient(PROJECT_URL, SERVICE_ROLE_KEY);

    // Immediately set status to 'processing'
    console.log('[disease-scan] Setting status to processing');
    const { error: processingError } = await supabaseAdmin
      .from('disease_checks')
      .update({ 
        status: 'processing',
        result: { status: 'processing' }
      })
      .eq('id', diseaseCheckId);

    if (processingError) {
      console.error('[disease-scan] Failed to set processing status:', processingError.message);
      // Continue anyway - don't fail the entire operation
    }

    // 3. Download image from storage using service role
    console.log('[disease-scan] Downloading from storage path:', diseaseCheck.image_path);
    const { data: imageBlob, error: downloadError } = await supabaseAdmin.storage
      .from('disease-images')
      .download(diseaseCheck.image_path);

    if (downloadError || !imageBlob) {
      console.error('[disease-scan] Download error:', downloadError?.message);
      throw new Error('Failed to download image from storage');
    }

    // 4. Convert image to base64 safely with byteLength check
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    console.log('[disease-scan] Downloaded arrayBuffer byteLength:', arrayBuffer.byteLength);
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Downloaded image is 0 bytes');
    }
    
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = encodeBase64(bytes);

    console.log('[disease-scan] Image converted to base64, calling OpenAI Vision API...');

    // 5. Call OpenAI Vision API
    const analysisResult = await analyzeImageWithOpenAI(base64);

    // 6. Build final result
    const finalResult: DiseaseResult = {
      status: 'complete',
      model: 'gpt-4o',
      ...analysisResult,
      updatedAt: new Date().toISOString()
    };

    console.log('[disease-scan] Analysis complete:', finalResult.likelyIssue || 'healthy', 'confidence:', finalResult.confidence);

    // Update disease_checks with completed status and result
    console.log('[disease-scan] Updating disease_checks result for ID:', diseaseCheckId);
    const { error: updateError } = await supabaseAdmin
      .from('disease_checks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: finalResult 
      })
      .eq('id', diseaseCheckId);

    if (updateError) {
      console.error('[disease-scan] Update error:', updateError.message);
      throw new Error('Failed to update database');
    }

    // Return success with ok: true and status 200
    return new Response(
      JSON.stringify({ ok: true, result: finalResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // Log the full error
    console.error('[disease-scan] Error:', error);

    // Try to update database with failed status if we have the diseaseCheckId
    const body = await req.clone().json().catch(() => ({}));
    const diseaseCheckId = body.diseaseCheckId;
    
    if (diseaseCheckId) {
      try {
        const PROJECT_URL = Deno.env.get('PROJECT_URL');
        const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
        
        if (PROJECT_URL && SERVICE_ROLE_KEY) {
          const supabaseAdmin = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          await supabaseAdmin
            .from('disease_checks')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage,
              result: {
                status: 'error',
                error: errorMessage,
                updatedAt: new Date().toISOString()
              }
            })
            .eq('id', diseaseCheckId);
          
          console.log('[disease-scan] Updated database with failed status');
        }
      } catch (dbError) {
        console.error('[disease-scan] Failed to update database with error status:', dbError);
      }
    }

    // Return error with ok: false and status 500
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
