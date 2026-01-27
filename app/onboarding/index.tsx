import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import MascotIcon from '@/components/mascot/MascotIcon';
import { useApp } from '@/store/AppContext';
import { useMascot } from '@/components/mascot/MascotContext';
import { useTheme } from '@/store/ThemeContext';
import { useEffect } from 'react';

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { showMascot, hideMascot } = useMascot();
  const { colors, activeTheme } = useTheme();

  useEffect(() => {
    // Show guide mascot on onboarding welcome
    showMascot('guide', 'top-right', "I'm so excited to help you!", 3000);
    return () => {
      hideMascot();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Mascot */}
          <Animated.View
            entering={FadeIn.delay(100).duration(260)}
            style={styles.mascotContainer}
          >
            <MascotIcon 
              variant="guide" 
              size={120}
            />
          </Animated.View>

          {/* Welcome Text */}
          <Animated.Text 
            entering={FadeInDown.delay(180).duration(240)}
            style={styles.welcomeText}
          >
            Hey {currentUser?.displayName || 'there'}! 👋
          </Animated.Text>
          
          <Animated.Text 
            entering={FadeInDown.delay(240).duration(240)}
            style={[styles.title, { color: colors.text }]}
          >
            Welcome to{'\n'}TankGuardian
          </Animated.Text>
          
          <Animated.Text 
            entering={FadeInDown.delay(300).duration(240)}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            I'll be your personal aquarium assistant. Let me help you set up your tank and keep your fish healthy and happy!
          </Animated.Text>

          {/* Features Preview */}
          <Animated.View 
            entering={FadeInDown.delay(360).duration(240)}
            style={[styles.featuresPreview, { backgroundColor: colors.card }]}
          >
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🐠</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Build your tank profile</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>⏰</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Get smart reminders</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🩺</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>Diagnose fish health</Text>
            </View>
          </Animated.View>

          {/* CTA */}
          <Animated.View 
            entering={FadeInDown.delay(420).duration(240)}
            style={styles.ctaContainer}
          >
            <Button
              title="Let's Get Started"
              onPress={() => router.push('/onboarding/goals')}
              variant="primary"
              size="large"
              fullWidth
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  mascotContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#0D7377',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A252F',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  featuresPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  ctaContainer: {
    marginTop: 'auto',
  },
});
