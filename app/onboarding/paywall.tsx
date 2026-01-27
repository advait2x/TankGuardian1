import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Check, Crown, Infinity, Fish, Bell, Search, Sparkles } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/store/ThemeContext';
import * as Haptics from 'expo-haptics';

const benefits = [
  { icon: Infinity, text: 'Unlimited tanks' },
  { icon: Fish, text: 'Add fish to your tanks' },
  { icon: Bell, text: 'Advanced reminders & notifications' },
  { icon: Search, text: 'Unlimited disease checks & history' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { setPremium, useFreeTrial, hasUsedFreeTrial, tanks } = useApp();
  const { showToast } = useToast();
  const { colors, activeTheme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleStartTrial = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPremium(true);
    useFreeTrial();
    showToast('Free trial activated! Enjoy premium features.', 'success');
    
    // If user already has tanks, go to main app, otherwise go to create tank
    if (tanks.length > 0) {
      router.back();
    } else {
    router.push('/onboarding/create-tank');
    }
  };

  const handleContinueFree = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If user already has tanks, go back, otherwise go to create tank
    if (tanks.length > 0) {
      router.back();
    } else {
    router.push('/onboarding/create-tank');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: colors.card }]}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '66%' }]} />
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Crown Icon */}
          <Animated.View 
            entering={FadeIn.delay(100).duration(240)}
            style={styles.crownContainer}
          >
            <View style={styles.crownIcon}>
              <Crown size={32} color="#FF6B35" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.Text 
            entering={FadeInDown.delay(200).duration(220)}
            style={[styles.title, { color: colors.text }]}
          >
            Unlock Premium
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(300).duration(220)}
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Get unlimited access to all features and keep your fish thriving
          </Animated.Text>

          {/* Plan Cards */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(220)}
            style={styles.plansContainer}
          >
            {/* Yearly Plan */}
            <TouchableOpacity
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.8}
            >
              <GlassCard 
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedPlan === 'yearly' && [styles.planCardSelected, { borderColor: colors.primary, backgroundColor: activeTheme === 'dark' ? 'rgba(13, 115, 119, 0.3)' : 'rgba(13, 115, 119, 0.08)' }],
                 ]}
                animated={false}
              >
                {selectedPlan === 'yearly' && (
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.planRadio}>
                    {selectedPlan === 'yearly' && (
                      <View style={styles.planRadioInner} />
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: colors.text }]}>Yearly</Text>
                    <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                      <Text style={[styles.planPriceValue, { color: colors.text }]}>$39.99</Text>/year
                    </Text>
                  </View>
                  <Text style={styles.planSavings}>Save 50%</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <GlassCard 
                style={[
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedPlan === 'monthly' && [styles.planCardSelected, { borderColor: colors.primary, backgroundColor: activeTheme === 'dark' ? 'rgba(13, 115, 119, 0.3)' : 'rgba(13, 115, 119, 0.08)' }],
                ]}
                animated={false}
              >
                <View style={styles.planHeader}>
                  <View style={[styles.planRadio, { borderColor: colors.primary }]}>
                    {selectedPlan === 'monthly' && (
                      <View style={[styles.planRadioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                    <Text style={[styles.planPrice, { color: colors.textSecondary }]}>
                      <Text style={[styles.planPriceValue, { color: colors.text }]}>$6.99</Text>/month
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>

          {/* Benefits List */}
          <Animated.View 
            entering={FadeInDown.delay(500).duration(220)}
            style={styles.benefitsContainer}
          >
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <View key={index} style={styles.benefitItem}>
                  <View style={[styles.benefitIcon, { backgroundColor: activeTheme === 'dark' ? 'rgba(13, 115, 119, 0.2)' : 'rgba(13, 115, 119, 0.1)' }]}>
                    <Check size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.benefitText, { color: colors.text }]}>{benefit.text}</Text>
                </View>
              );
            })}
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <Animated.View 
          entering={FadeIn.delay(600).duration(220)}
          style={styles.ctaContainer}
        >
          <Button
            title={hasUsedFreeTrial ? "Subscribe Now" : "Start 7-Day Free Trial"}
            onPress={handleStartTrial}
            variant="secondary"
            size="large"
            fullWidth
            icon={<Sparkles size={20} color="#fff" />}
          />
          <TouchableOpacity onPress={handleContinueFree} style={styles.skipButton}>
            <Text style={styles.skipText}>Continue with limited version</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            {hasUsedFreeTrial 
              ? 'Premium unlocks all features instantly.'
              : 'Free trial includes full premium access for 7 days. Cancel anytime.'}
          </Text>
        </Animated.View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(13, 115, 119, 0.15)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0D7377',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
  },
  crownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  crownIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A252F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    padding: 16,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0D7377',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 14,
    color: '#64748B',
  },
  planPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
  },
  planSavings: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  benefitsContainer: {
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  ctaContainer: {
    padding: 24,
    paddingTop: 12,
    gap: 12,
  },
  skipButton: {
    padding: 10,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
