import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Droplets, Check } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useUnitSettings } from '@/store/UnitSettingsContext';
import { TankType, WaterType } from '@/data/types';
import { useTheme } from '@/store/ThemeContext';
import * as Haptics from 'expo-haptics';



const tankSizes = [5, 10, 20, 29, 40, 55, 75, 100];

export default function CreateTankScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isOnboarding = params.isOnboarding === 'true' || params.isOnboarding === undefined; // Default true for backward compat
  const { createTank, currentUser, tanks } = useApp();
  const { setOnboardingComplete } = useAuth();
  const { showToast } = useToast();
  const { formatVolume, volumeUnit } = useUnitSettings();
  const { colors, activeTheme } = useTheme();
  const hasMarkedCompleteRef = useRef(false);
  
  const [tankName, setTankName] = useState('My First Tank');
  const [tankType] = useState<TankType>('rectangle');
  const [tankSize, setTankSize] = useState(20);
  const [waterType, setWaterType] = useState<WaterType>('freshwater');
  const [customSize, setCustomSize] = useState('');
  const [step, setStep] = useState(1);

  // Check for duplicate tank names
  const isDuplicateName = useMemo(() => {
    const trimmedName = tankName.trim().toLowerCase();
    return tanks.some(t => t.name.trim().toLowerCase() === trimmedName);
  }, [tankName, tanks]);



  const handleSelectSize = async (size: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTankSize(size);
    setCustomSize('');
  };

  const handleSelectWaterType = async (type: WaterType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterType(type);
  };

  const handleNext = () => {
    // Prevent advancing if duplicate name
    if (isDuplicateName) {
      showToast('A tank with this name already exists', 'error');
      return;
    }
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleCreate = async () => {
    // Check for duplicate name
    if (isDuplicateName) {
      showToast('A tank with this name already exists', 'error');
      return;
    }
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const finalSize = customSize ? parseInt(customSize) : tankSize;
    
    try {
      await createTank({
        userId: currentUser?.id || '',
        name: tankName,
        type: tankType,
        sizeGallons: finalSize,
        waterType,
        startDate: new Date().toISOString(),
        equipmentIds: [],
        decorIds: [],
        plantIds: [],
        fishInstances: [],
      });
      
      // Mark onboarding complete only once
      if (!hasMarkedCompleteRef.current) {
        hasMarkedCompleteRef.current = true;
        await setOnboardingComplete();
      }
      
      showToast('Tank created! Welcome to TankGuardian!', 'success');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] Error during tank creation:', error);
      showToast('Failed to create tank. Please try again.', 'error');
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Mark onboarding complete only once
      if (!hasMarkedCompleteRef.current) {
        hasMarkedCompleteRef.current = true;
        await setOnboardingComplete();
      }
      
      showToast('Welcome to TankGuardian!', 'success');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] Error during onboarding completion:', error);
      showToast('Failed to complete setup. Please try again.', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity 
            onPress={() => step > 1 ? setStep(step - 1) : router.back()} 
            style={[styles.backButton, { backgroundColor: colors.card }]}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 2) * 100}%` }]} />
          </View>
        </Animated.View>
        


        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Tank Name & Size */}
          {step === 1 && (
            <>
              <Animated.Text 
                entering={FadeInDown.duration(220)}
                style={[styles.title, { color: colors.text }]}
              >
                Name your tank
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(100).duration(220)}
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                What would you like to call your aquarium?
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(200).duration(220)}>
                <Input
                  placeholder="My First Tank"
                  value={tankName}
                  onChangeText={setTankName}
                  autoCapitalize="words"
                />
                {isDuplicateName && (
                  <Text style={styles.duplicateError}>
                    A tank with this name already exists
                  </Text>
                )}
              </Animated.View>

              <Animated.Text 
                entering={FadeInDown.delay(300).duration(220)}
                style={[styles.sectionTitle, { marginTop: 24, color: colors.text }]}
              >
                Tank size
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(350).duration(220)}
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                How big is your tank?
              </Animated.Text>

              <View style={styles.sizeGrid}>
                {tankSizes.map((size, index) => {
                  const isSelected = tankSize === size && !customSize;
                  return (
                    <Animated.View
                      key={size}
                      entering={FadeInDown.delay(400 + index * 30).duration(220)}
                    >
                      <TouchableOpacity
                        onPress={() => handleSelectSize(size)}
                        activeOpacity={0.8}
                        style={[
                          styles.sizeChip,
                          isSelected && styles.sizeChipSelected,
                        ]}
                      >
                        <Text style={[
                          styles.sizeChipText,
                          isSelected && styles.sizeChipTextSelected,
                        ]}>
                          {formatVolume(size)}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

              <Animated.View entering={FadeInDown.delay(650).duration(220)} style={styles.customSizeContainer}>
                <Text style={[styles.orText, { color: colors.textSecondary }]}>or enter custom size</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.customInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={customSize}
                    onChangeText={(text) => {
                      const numValue = parseInt(text) || 0;
                      if (numValue <= 1000) {
                        setCustomSize(text.replace(/[^0-9]/g, ''));
                      } else {
                        setCustomSize('1000');
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={[styles.gallonsText, { color: colors.textSecondary }]}>{volumeUnit}</Text>
                </View>
              </Animated.View>
            </>
          )}



          {/* Step 2: Water Type */}
          {step === 2 && (
            <>
              <Animated.Text 
                entering={FadeInDown.duration(220)}
                style={[styles.title, { color: colors.text }]}
              >
                Water type
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(100).duration(220)}
                style={[styles.subtitle, { color: colors.textSecondary }]}
              >
                What kind of aquarium are you setting up?
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(200).duration(220)}>
                <TouchableOpacity
                  onPress={() => handleSelectWaterType('freshwater')}
                  activeOpacity={0.8}
                >
                    <GlassCard 
                      style={[
                        styles.waterTypeCard,
                        waterType === 'freshwater' && [styles.waterTypeCardSelected, { borderColor: colors.primary, backgroundColor: activeTheme === 'dark' ? 'rgba(78, 205, 196, 0.1)' : 'rgba(13, 115, 119, 0.05)' }],
                      ]}
                      animated={false}
                    >
                      <View style={[styles.waterTypeIcon, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                        <Droplets size={32} color="#4ECDC4" />
                      </View>
                      <View style={styles.waterTypeInfo}>
                        <Text style={[styles.waterTypeName, { color: colors.text }]}>Freshwater</Text>
                        <Text style={[styles.waterTypeDesc, { color: colors.textSecondary }]}>Most common setup for beginners</Text>
                      </View>
                    {waterType === 'freshwater' && (
                      <View style={styles.waterTypeCheck}>
                        <Check size={20} color="#0D7377" />
                      </View>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(220)}>
                <TouchableOpacity
                  onPress={() => handleSelectWaterType('saltwater')}
                  activeOpacity={0.8}
                >
                  <GlassCard 
                    style={[
                      styles.waterTypeCard,
                      waterType === 'saltwater' && [styles.waterTypeCardSelected, { borderColor: '#2196F3', backgroundColor: 'rgba(33, 150, 243, 0.05)' }],
                    ]}
                    animated={false}
                  >
                    <View style={[styles.waterTypeIcon, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                      <Droplets size={32} color="#2196F3" />
                    </View>
                    <View style={styles.waterTypeInfo}>
                      <Text style={[styles.waterTypeName, { color: colors.text }]}>Saltwater</Text>
                      <Text style={[styles.waterTypeDesc, { color: colors.textSecondary }]}>Marine fish and corals</Text>
                    </View>
                    {waterType === 'saltwater' && (
                      <View style={styles.waterTypeCheck}>
                        <Check size={20} color="#2196F3" />
                      </View>
                    )}
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>

              {/* Summary */}
              <Animated.View entering={FadeInDown.delay(400).duration(220)} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Your tank summary</Text>
                <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Name</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{tankName}</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Size</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{formatVolume(customSize ? parseInt(customSize) : tankSize)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Water</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{waterType}</Text>
                </View>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* CTA */}
        <Animated.View 
          entering={FadeIn.delay(500).duration(220)}
          style={styles.ctaContainer}
        >
          {step < 2 ? (
            <Button
              title="Continue"
              onPress={handleNext}
              variant="primary"
              size="large"
              fullWidth
              disabled={step === 1 && !tankName}
            />
          ) : (
            <Button
              title="Create My Tank"
              onPress={handleCreate}
              variant="primary"
              size="large"
              fullWidth
            />
          )}
          
          {/* Skip Button - Only shown during onboarding */}
          {isOnboarding && (
            <TouchableOpacity 
              onPress={handleSkip}
              style={[styles.skipButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>I don't have a tank yet - Skip for now</Text>
            </TouchableOpacity>
          )}
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
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.2)',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  duplicateError: {
    fontSize: 13,
    color: '#E53E3E',
    marginTop: 8,
    fontWeight: '500',
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.08)',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
  },
  typeLabelSelected: {
    color: '#0D7377',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  sizeChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeChipSelected: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.08)',
  },
  sizeChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  sizeChipTextSelected: {
    color: '#0D7377',
  },
  customSizeContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  orText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    width: 100,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  gallonsText: {
    fontSize: 16,
    color: '#64748B',
  },
  waterTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  waterTypeCardSelected: {
    borderWidth: 2,
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
  },
  waterTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waterTypeInfo: {
    flex: 1,
  },
  waterTypeName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 4,
  },
  waterTypeDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  waterTypeCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  ctaContainer: {
    padding: 24,
    paddingTop: 12,
  },
});
