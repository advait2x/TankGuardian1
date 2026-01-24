/**
 * remoteProfiles.ts
 * 
 * Handles profile operations for user onboarding and profile data.
 * Stores onboarding completion in public.profiles.has_completed_onboarding.
 */

import { supabase } from './supabase';

// Profile data structure returned by getProfile and ensureProfile
export interface ProfileData {
  id: string;
  has_completed_onboarding: boolean;
  is_premium: boolean;
  has_used_free_trial: boolean;
  premium_expires_at: string | null;
}

interface ProfileResult {
  ok: boolean;
  data?: {
    id: string;
    display_name: string | null;
    has_completed_onboarding: boolean;
    is_premium: boolean;
    has_used_free_trial: boolean;
    premium_expires_at: string | null;
  };
  errorCode?: string;
  errorMessage?: string;
}

interface UpdateResult {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Fetch the current user's profile from public.profiles
 */
export async function getMyProfile(): Promise<ProfileResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn('[remoteProfiles] getMyProfile: no active session');
      return {
        ok: false,
        errorCode: 'NO_SESSION',
        errorMessage: 'No active session',
      };
    }

    console.log('[remoteProfiles] Fetching profile for user:', session.user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, has_completed_onboarding, is_premium, has_used_free_trial, premium_expires_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('[remoteProfiles] getMyProfile error:', error.message);
      return {
        ok: false,
        errorCode: error.code || 'FETCH_ERROR',
        errorMessage: error.message,
      };
    }

    if (!data) {
      console.warn('[remoteProfiles] Profile not found for user:', session.user.id);
      return {
        ok: false,
        errorCode: 'NOT_FOUND',
        errorMessage: 'Profile not found',
      };
    }

    console.log('[remoteProfiles] Profile fetched:', {
      id: data.id,
      onboarding: data.has_completed_onboarding,
    });

    return {
      ok: true,
      data: {
        id: data.id,
        display_name: data.display_name,
        has_completed_onboarding: !!data.has_completed_onboarding,
        is_premium: !!data.is_premium,
        has_used_free_trial: !!data.has_used_free_trial,
        premium_expires_at: data.premium_expires_at,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remoteProfiles] getMyProfile exception:', message);
    return {
      ok: false,
      errorCode: 'EXCEPTION',
      errorMessage: message,
    };
  }
}

/**
 * Mark onboarding as complete for the current user
 */
export async function markOnboardingComplete(): Promise<UpdateResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn('[remoteProfiles] markOnboardingComplete: no active session');
      return {
        ok: false,
        errorCode: 'NO_SESSION',
        errorMessage: 'No active session',
      };
    }

    console.log('[remoteProfiles] Marking onboarding complete for user:', session.user.id);

    const { error } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', session.user.id);

    if (error) {
      console.error('[remoteProfiles] markOnboardingComplete error:', error.message);
      return {
        ok: false,
        errorCode: error.code || 'UPDATE_ERROR',
        errorMessage: error.message,
      };
    }

    console.log('[remoteProfiles] ✅ Onboarding marked complete');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remoteProfiles] markOnboardingComplete exception:', message);
    return {
      ok: false,
      errorCode: 'EXCEPTION',
      errorMessage: message,
    };
  }
}



/**
 * Get profile for a user ID.
 * Returns profile data or error, does NOT create if missing.
 */
export async function getProfile(
  userId: string
): Promise<{ profile?: { id: string; has_completed_onboarding: boolean }; error?: string }> {
  try {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, has_completed_onboarding')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Profile] Fetch error:', fetchError.code, fetchError.message);
      return { error: `${fetchError.code}: ${fetchError.message}` };
    }

    if (!data) {
      return { error: 'Profile not found' };
    }

    return {
      profile: {
        id: data.id,
        has_completed_onboarding: !!data.has_completed_onboarding,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Profile] Exception:', message);
    return { error: message };
  }
}

/**
 * Ensure profile exists for a user ID.
 * If missing, creates a profile with ONLY id field (DB default for has_completed_onboarding is false).
 * Uses upsert for robustness - won't fail if profile already exists.
 */
export async function ensureProfile(
  userId: string
): Promise<{ profile?: { id: string; has_completed_onboarding: boolean }; error?: string }> {
  try {
    // First try to fetch existing profile
    const fetchResult = await getProfile(userId);
    
    // If found, return it
    if (fetchResult.profile) {
      return fetchResult;
    }

    // Profile doesn't exist, create it using upsert
    // ONLY set id field - let DB default handle has_completed_onboarding (should be false)
    const { data: upsertData, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        { id: userId },
        { 
          onConflict: 'id',
          ignoreDuplicates: false
        }
      )
      .select('id, has_completed_onboarding')
      .single();

    if (upsertError) {
      console.error('[Profile] Upsert error:', upsertError.code, upsertError.message);
      return { error: `${upsertError.code}: ${upsertError.message}` };
    }

    if (!upsertData) {
      console.error('[Profile] Upsert succeeded but no data returned');
      return { error: 'Profile upsert returned no data' };
    }

    return {
      profile: {
        id: upsertData.id,
        has_completed_onboarding: !!upsertData.has_completed_onboarding,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Profile] ensureProfile exception:', message);
    return { error: message };
  }
}

/**
 * Get or create profile for a user ID.
 * DEPRECATED: Use ensureProfile instead.
 */
export async function getOrCreateProfile(
  userId: string
): Promise<{ profile?: { id: string; has_completed_onboarding: boolean }; error?: string }> {
  console.warn('[Profile] getOrCreateProfile is deprecated, use ensureProfile instead');
  return ensureProfile(userId);
}

/**
 * Set onboarding complete for a user ID.
 * Matches the required API for the new implementation.
 */
export async function setOnboardingComplete(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log('[remoteProfiles] setOnboardingComplete for user:', userId);

    const { error } = await supabase
      .from('profiles')
      .update({ has_completed_onboarding: true })
      .eq('id', userId);

    if (error) {
      console.error('[remoteProfiles] setOnboardingComplete error:', error.message, error.code);
      return { ok: false, error: `${error.code}: ${error.message}` };
    }

    console.log('[remoteProfiles] ✅ Onboarding marked complete');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remoteProfiles] setOnboardingComplete exception:', message);
    return { ok: false, error: message };
  }
}

/**
 * Set premium status for the current user
 */
export async function setPremiumStatus(isPremium: boolean, expiresAt?: string): Promise<UpdateResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn('[remoteProfiles] setPremiumStatus: no active session');
      return {
        ok: false,
        errorCode: 'NO_SESSION',
        errorMessage: 'No active session',
      };
    }

    console.log('[remoteProfiles] Setting premium status:', { isPremium, expiresAt });

    const updateData: any = { is_premium: isPremium };
    if (expiresAt !== undefined) {
      updateData.premium_expires_at = expiresAt;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id);

    if (error) {
      console.error('[remoteProfiles] setPremiumStatus error:', error.message);
      return {
        ok: false,
        errorCode: error.code || 'UPDATE_ERROR',
        errorMessage: error.message,
      };
    }

    console.log('[remoteProfiles] ✅ Premium status updated');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remoteProfiles] setPremiumStatus exception:', message);
    return {
      ok: false,
      errorCode: 'EXCEPTION',
      errorMessage: message,
    };
  }
}

/**
 * Mark free trial as used for the current user
 */
export async function markFreeTrialUsed(): Promise<UpdateResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn('[remoteProfiles] markFreeTrialUsed: no active session');
      return {
        ok: false,
        errorCode: 'NO_SESSION',
        errorMessage: 'No active session',
      };
    }

    console.log('[remoteProfiles] Marking free trial as used');

    const { error } = await supabase
      .from('profiles')
      .update({ has_used_free_trial: true })
      .eq('id', session.user.id);

    if (error) {
      console.error('[remoteProfiles] markFreeTrialUsed error:', error.message);
      return {
        ok: false,
        errorCode: error.code || 'UPDATE_ERROR',
        errorMessage: error.message,
      };
    }

    console.log('[remoteProfiles] ✅ Free trial marked as used');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remoteProfiles] markFreeTrialUsed exception:', message);
    return {
      ok: false,
      errorCode: 'EXCEPTION',
      errorMessage: message,
    };
  }
}
