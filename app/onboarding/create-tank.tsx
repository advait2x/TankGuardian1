import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ArrowLeft, Square, Box, Hexagon, Droplets, Check } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { TankType, WaterType } from '@/data/types';
import * as Haptics from 'expo-haptics';

const tankTypes: { type: TankType; label: string; icon: any }[] = [
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'cube', label: 'Cube', icon: Box },
  { type: 'bowfront', label: 'Bowfront', icon: Square },
  { type: 'hex', label: 'Hexagon', icon: Hexagon },
];

const tankSizes = [5, 10, 20, 29, 40, 55, 75, 100];

export default function CreateTankScreen() {
  const router = useRouter();
  const { createTank, currentUser } = useApp();
  const { setOnboardingComplete } = useAuth();
  const { showToast } = useToast();
  const hasMarkedCompleteRef = useRef(false);
  
  const [tankName, setTankName] = useState('My First Tank');
  const [tankType, setTankType] = useState<TankType>('rectangle');
  const [tankSize, setTankSize] = useState(20);
  const [waterType, setWaterType] = useState<WaterType>('freshwater');
  const [customSize, setCustomSize] = useState('');
  const [step, setStep] = useState(1);

  const handleSelectType = async (type: TankType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTankType(type);
  };

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
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleCreate = async () => {
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
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <TouchableOpacity 
            onPress={() => step > 1 ? setStep(step - 1) : router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#2C3E50" />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        </Animated.View>
        
        {/* Prominent Skip Button */}
        <Animated.View 
          entering={FadeIn.delay(400).duration(220)}
          style={styles.skipButtonContainer}
        >
          <TouchableOpacity 
            onPress={handleSkip}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>I don't have a tank yet - Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Tank Name & Type */}
          {step === 1 && (
            <>
              <Animated.Text 
                entering={FadeInDown.duration(220)}
                style={styles.title}
              >
                Name your tank
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(100).duration(220)}
                style={styles.subtitle}
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
              </Animated.View>

              <Animated.Text 
                entering={FadeInDown.delay(300).duration(220)}
                style={[styles.sectionTitle, { marginTop: 24 }]}
              >
                Tank shape
              </Animated.Text>

              <View style={styles.typeGrid}>
                {tankTypes.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = tankType === item.type;
                  return (
                    <Animated.View
                      key={item.type}
                      entering={FadeInDown.delay(400 + index * 50).duration(220)}
                      style={{ width: '48%' }}
                    >
                      <TouchableOpacity
                        onPress={() => handleSelectType(item.type)}
                        activeOpacity={0.8}
                        style={[
                          styles.typeCard,
                          isSelected && styles.typeCardSelected,
                        ]}
                      >
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Check size={12} color="#fff" />
                          </View>
                        )}
                        <Icon size={32} color={isSelected ? '#0D7377' : '#64748B'} />
                        <Text style={[
                          styles.typeLabel,
                          isSelected && styles.typeLabelSelected,
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}

          {/* Step 2: Tank Size */}
          {step === 2 && (
            <>
              <Animated.Text 
                entering={FadeInDown.duration(220)}
                style={styles.title}
              >
                Tank size
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(100).duration(220)}
                style={styles.subtitle}
              >
                How many gallons does your tank hold?
              </Animated.Text>

              <View style={styles.sizeGrid}>
                {tankSizes.map((size, index) => {
                  const isSelected = tankSize === size && !customSize;
                  return (
                    <Animated.View
                      key={size}
                      entering={FadeInDown.delay(200 + index * 30).duration(220)}
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
                          {size}g
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

              <Animated.View entering={FadeInDown.delay(500).duration(220)} style={styles.customSizeContainer}>
                <Text style={styles.orText}>or enter custom size</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder="0"
                    value={customSize}
                    onChangeText={setCustomSize}
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.gallonsText}>gallons</Text>
                </View>
              </Animated.View>
            </>
          )}

          {/* Step 3: Water Type */}
          {step === 3 && (
            <>
              <Animated.Text 
                entering={FadeInDown.duration(220)}
                style={styles.title}
              >
                Water type
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(100).duration(220)}
                style={styles.subtitle}
              >
                What kind of aquarium are you setting up?
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(200).duration(220)}>
                <TouchableOpacity
                  onPress={() => handleSelectWaterType('freshwater')}
                  activeOpacity={0.8}
                >
                  <GlassCard 
                    style={StyleSheet.flatten([
                      styles.waterTypeCard,
                      waterType === 'freshwater' && styles.waterTypeCardSelected,
                    ])}
                    animated={false}
                  >
                    <View style={[styles.waterTypeIcon, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                      <Droplets size={32} color="#4ECDC4" />
                    </View>
                    <View style={styles.waterTypeInfo}>
                      <Text style={styles.waterTypeName}>Freshwater</Text>
                      <Text style={styles.waterTypeDesc}>Most common setup for beginners</Text>
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
                    style={StyleSheet.flatten([
                      styles.waterTypeCard,
                      waterType === 'saltwater' && styles.waterTypeCardSelected,
                    ])}
                    animated={false}
                  >
                    <View style={[styles.waterTypeIcon, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                      <Droplets size={32} color="#2196F3" />
                    </View>
                    <View style={styles.waterTypeInfo}>
                      <Text style={styles.waterTypeName}>Saltwater</Text>
                      <Text style={styles.waterTypeDesc}>Marine fish and corals</Text>
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
              <Animated.View entering={FadeInDown.delay(400).duration(220)} style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your tank summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Name</Text>
                  <Text style={styles.summaryValue}>{tankName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Type</Text>
                  <Text style={styles.summaryValue}>{tankType}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Size</Text>
                  <Text style={styles.summaryValue}>{customSize || tankSize} gallons</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Water</Text>
                  <Text style={styles.summaryValue}>{waterType}</Text>
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
          {step < 3 ? (
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
  skipButtonContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
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
