import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Heart, Leaf, Users, Baby, Sparkles, BookOpen, Check } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import { useApp } from '@/store/AppContext';
import * as Haptics from 'expo-haptics';

const goals = [
  { id: 'healthy-fish', label: 'Keep fish healthy', icon: Heart, color: '#E57373' },
  { id: 'planted-tank', label: 'Grow a planted tank', icon: Leaf, color: '#4CAF50' },
  { id: 'community-tank', label: 'Build a community tank', icon: Users, color: '#2196F3' },
  { id: 'breeding', label: 'Breed fish', icon: Baby, color: '#FF9800' },
  { id: 'aquascaping', label: 'Create beautiful aquascapes', icon: Sparkles, color: '#9C27B0' },
  { id: 'learn', label: 'Learn the hobby', icon: BookOpen, color: '#0D7377' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { updateUser } = useApp();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = async (goalId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    updateUser({ goals: selectedGoals });
    router.push('/onboarding/paywall');
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.Text 
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.title}
          >
            What are your goals?
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.subtitle}
          >
            Select all that apply. We'll personalize your experience based on your interests.
          </Animated.Text>

          {/* Goals Grid */}
          <View style={styles.goalsGrid}>
            {goals.map((goal, index) => {
              const Icon = goal.icon;
              const isSelected = selectedGoals.includes(goal.id);
              
              return (
                <Animated.View
                  key={goal.id}
                  entering={FadeInDown.delay(300 + index * 50).duration(400)}
                  style={{ width: '48%' }}
                >
                  <TouchableOpacity
                    onPress={() => toggleGoal(goal.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.goalCard,
                      isSelected && styles.goalCardSelected,
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={14} color="#fff" />
                      </View>
                    )}
                    <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
                      <Icon size={28} color={goal.color} />
                    </View>
                    <Text style={[
                      styles.goalLabel,
                      isSelected && styles.goalLabelSelected,
                    ]}>
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* CTA */}
        <Animated.View 
          entering={FadeIn.delay(600).duration(400)}
          style={styles.ctaContainer}
        >
          <Button
            title={selectedGoals.length > 0 ? "Continue" : "Skip for now"}
            onPress={handleContinue}
            variant={selectedGoals.length > 0 ? "primary" : "ghost"}
            size="large"
            fullWidth
          />
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 28,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.08)',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: '#0D7377',
  },
  ctaContainer: {
    padding: 24,
    paddingTop: 12,
  },
});
