import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import * as RemoteProfiles from '@/utils/remoteProfiles';
import { ProfileData } from '@/utils/remoteProfiles';

type OnboardingStatus = 'unknown' | 'needs_onboarding' | 'complete' | 'unknown_error';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  onboardingStatus: OnboardingStatus;
  profile: ProfileData | null;
  refreshProfile: () => Promise<void>;
  setOnboardingComplete: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  profileLoading: false,
  onboardingStatus: 'unknown',
  profile: null,
  refreshProfile: async () => {},
  setOnboardingComplete: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('unknown');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  // Fetch profile and determine onboarding status
  const fetchProfile = async (userId: string) => {
    // Skip if already loading or if we already loaded this userId
    if (profileLoading || loadedUserId === userId) {
      return;
    }

    setProfileLoading(true);

    try {
      const result = await RemoteProfiles.ensureProfile(userId);

      if (result.profile) {
        setProfile(result.profile);
        setLoadedUserId(userId);
        const status: OnboardingStatus = result.profile.has_completed_onboarding ? 'complete' : 'needs_onboarding';
        setOnboardingStatus(status);
        console.log('[Profile] loaded', userId.slice(0, 8), 'has_completed_onboarding:', result.profile.has_completed_onboarding);
      } else {
        // Profile fetch failed - set to unknown_error (schema/RLS issue)
        console.error('[Profile] Failed to load profile - schema or RLS issue. App will route to tabs with onboarding disabled.');
        setOnboardingStatus('unknown_error');
        setProfile(null);
        setLoadedUserId(null);
      }
    } catch (err) {
      console.error('[Profile] Exception during fetch:', err);
      setOnboardingStatus('unknown_error');
      setProfile(null);
      setLoadedUserId(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.error('[Auth] getSession error:', error.message);
      }

      setSession(data.session ?? null);
      setLoading(false);

      if (data.session) {
        console.log('[Auth] Session restored:', data.session.user.id.slice(0, 8));
        await fetchProfile(data.session.user.id);
      } else {
        setOnboardingStatus('unknown');
        setProfile(null);
      }
    }

    boot();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('[Auth] state changed:', event, newSession?.user?.id?.slice(0, 8) ?? 'none');
      
      setSession(newSession);
      setLoading(false);

      if (event === 'SIGNED_IN' && newSession?.user?.id) {
        // Only fetch on SIGNED_IN event, not on other events like TOKEN_REFRESHED
        await fetchProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        // User logged out, reset profile state
        setOnboardingStatus('unknown');
        setProfile(null);
        setProfileLoading(false);
        setLoadedUserId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOnboardingStatus('unknown');
    setProfile(null);
    setProfileLoading(false);
    setLoadedUserId(null);
  };

  // Mark onboarding as complete in Supabase and refresh profile
  const setOnboardingComplete = async () => {
    if (!session?.user?.id) {
      console.error('[Profile] Cannot set onboarding complete: no user session');
      return;
    }

    const result = await RemoteProfiles.setOnboardingComplete(session.user.id);
    
    if (result.ok) {
      // Update local state immediately
      setProfile({ id: session.user.id, has_completed_onboarding: true });
      setOnboardingStatus('complete');
      console.log('[Profile] Onboarding marked complete');
    } else {
      console.error('[Profile] Failed to mark onboarding complete:', result.error);
      // Still update local state to prevent getting stuck
      setProfile({ id: session.user.id, has_completed_onboarding: true });
      setOnboardingStatus('complete');
    }
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    profileLoading,
    onboardingStatus,
    profile,
    refreshProfile,
    setOnboardingComplete,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
