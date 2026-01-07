import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { useEffect } from 'react';

/**
 * Root routing guard - SINGLE SOURCE OF TRUTH for routing
 * Uses ONLY AuthContext (session, profileLoading, onboardingStatus)
 * Does NOT use AppContext for onboarding decisions
 */
export default function Index() {
  const { session, loading: authLoading, profileLoading, onboardingStatus } = useAuth();
  const router = useRouter();

  // Derive deterministic routing status
  const getRoutingStatus = () => {
    if (authLoading) return 'loading';
    if (!session?.user) return 'auth';
    if (profileLoading) return 'loading';
    
    // Handle profile load failure - route to app but log warning once
    if (onboardingStatus === 'unknown_error') {
      return 'app'; // Stabilization mode - allow app usage
    }
    
    // Treat persistent 'unknown' as needs_onboarding
    if (onboardingStatus === 'unknown') {
      return 'onboarding';
    }
    
    if (onboardingStatus === 'needs_onboarding') return 'onboarding';
    if (onboardingStatus === 'complete') return 'app';
    
    return 'onboarding'; // Safe fallback
  };

  const routingStatus = getRoutingStatus();

  // Log once per status change for debugging
  useEffect(() => {
    console.log('[Guard]', routingStatus, '| onboarding:', onboardingStatus);
  }, [routingStatus, onboardingStatus]);

  // Implement deterministic routing with router.replace
  useEffect(() => {
    // Wait for loading to complete
    if (routingStatus === 'loading') {
      return;
    }

    // Route based on status
    if (routingStatus === 'auth') {
      router.replace('/landing');
    } else if (routingStatus === 'onboarding') {
      router.replace('/onboarding');
    } else if (routingStatus === 'app') {
      if (onboardingStatus === 'unknown_error') {
        console.warn('[Guard] Profile load failed - routing to app in stabilization mode');
      }
      router.replace('/(tabs)');
    }
  }, [routingStatus, onboardingStatus, router]);

  // Show loading screen while routing decision is being made
  return (
    <View className="flex-1 items-center justify-center">
      <AnimatedBackground />
      <ActivityIndicator size="large" color="#0D7377" />
      {__DEV__ && (
        <Text className="mt-4 text-xs text-gray-600">
          Auth: {authLoading ? 'loading' : 'ready'} | 
          Profile: {profileLoading ? 'loading' : 'ready'} | 
          Status: {onboardingStatus}
        </Text>
      )}
    </View>
  );
}
