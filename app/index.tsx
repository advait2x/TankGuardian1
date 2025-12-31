import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/store/AppContext';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, hasCompletedOnboarding, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else if (isAuthenticated && !hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/landing');
      }
    }
  }, [isLoading, isAuthenticated, hasCompletedOnboarding]);

  return (
    <View className="flex-1 items-center justify-center">
      <AnimatedBackground />
      <ActivityIndicator size="large" color="#0D7377" />
    </View>
  );
}
