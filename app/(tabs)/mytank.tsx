import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { 
  Plus, 
  Droplets, 
  Fish as FishIcon, 
  Utensils, 
  Wrench,
  AlertCircle,
  Check,
  Thermometer,
  X
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TANK_WIDTH = SCREEN_WIDTH - 48;
const TANK_HEIGHT = 220;

// Animated fish component
function AnimatedFish({ 
  speciesId, 
  index, 
  onPress 
}: { 
  speciesId: string; 
  index: number;
  onPress: () => void;
}) {
  const species = fishSpecies.find(s => s.id === speciesId);
  const translateX = useSharedValue(Math.random() * (TANK_WIDTH - 50));
  const translateY = useSharedValue(30 + Math.random() * (TANK_HEIGHT - 80));
  const direction = useSharedValue(Math.random() > 0.5 ? 1 : -1);

  useEffect(() => {
    const duration = 3000 + Math.random() * 2000;
    
    translateX.value = withRepeat(
      withSequence(
        withTiming(Math.random() * (TANK_WIDTH - 60), { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(Math.random() * (TANK_WIDTH - 60), { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    translateY.value = withRepeat(
      withSequence(
        withTiming(30 + Math.random() * (TANK_HEIGHT - 80), { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) }),
        withTiming(30 + Math.random() * (TANK_HEIGHT - 80), { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.fish, animatedStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.fishBody, { backgroundColor: species?.color || '#FF6B35' }]}>
          <Text style={styles.fishEmoji}>🐠</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated bubble component
function Bubble({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 3000 + Math.random() * 2000, easing: Easing.linear }),
        -1,
        false
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [TANK_HEIGHT - 20, -20]);
    const opacity = interpolate(progress.value, [0, 0.1, 0.9, 1], [0, 0.7, 0.7, 0]);
    const translateX = interpolate(progress.value, [0, 0.5, 1], [0, 5, -5]);

    return {
      transform: [{ translateY }, { translateX }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        { left: 20 + Math.random() * (TANK_WIDTH - 40) },
        animatedStyle,
      ]}
    />
  );
}

export default function MyTankScreen() {
  const router = useRouter();
  const { tanks, selectedTankId, addWaterLog, tasks, completeTask, removeFishFromTank } = useApp();
  const { showToast } = useToast();
  
  const selectedTank = tanks.find(t => t.id === selectedTankId);
  const [selectedFish, setSelectedFish] = useState<string | null>(null);
  const [showWaterLogModal, setShowWaterLogModal] = useState(false);
  const [showFishModal, setShowFishModal] = useState(false);
  
  // Water log form
  const [waterParams, setWaterParams] = useState({
    ph: '',
    ammonia: '',
    nitrite: '',
    nitrate: '',
    temp: '',
    notes: '',
  });

  const tankTasks = tasks.filter(t => t.tankId === selectedTankId);
  const bubbles = Array.from({ length: 8 }, (_, i) => i);

  // Calculate bioload
  const bioload = selectedTank?.fishInstances.reduce((acc, instance) => {
    const species = fishSpecies.find(s => s.id === instance.speciesId);
    return acc + (species?.adultSizeInches || 0);
  }, 0) || 0;

  const maxBioload = (selectedTank?.sizeGallons || 1) * 1.2;
  const bioloadPercent = Math.min(100, (bioload / maxBioload) * 100);

  const handleFishPress = async (instanceId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFish(instanceId);
    setShowFishModal(true);
  };

  const handleSaveWaterLog = async () => {
    if (!selectedTankId) return;
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    addWaterLog(selectedTankId, {
      date: new Date().toISOString(),
      ph: parseFloat(waterParams.ph) || 7,
      ammonia: parseFloat(waterParams.ammonia) || 0,
      nitrite: parseFloat(waterParams.nitrite) || 0,
      nitrate: parseFloat(waterParams.nitrate) || 0,
      temp: parseFloat(waterParams.temp) || 78,
      notes: waterParams.notes,
    });
    
    setShowWaterLogModal(false);
    setWaterParams({ ph: '', ammonia: '', nitrite: '', nitrate: '', temp: '', notes: '' });
    showToast('Water parameters logged!', 'success');
  };

  const handleRemoveFish = async () => {
    if (!selectedTankId || !selectedFish) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFishFromTank(selectedTankId, selectedFish);
    setShowFishModal(false);
    setSelectedFish(null);
    showToast('Fish removed from tank', 'info');
  };

  const selectedFishInstance = selectedTank?.fishInstances.find(f => f.instanceId === selectedFish);
  const selectedSpecies = selectedFishInstance 
    ? fishSpecies.find(s => s.id === selectedFishInstance.speciesId)
    : null;

  if (!selectedTank) {
    return (
      <View style={styles.container}>
        <AnimatedBackground />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No tank set up yet</Text>
            <Text style={styles.emptyText}>Create your first tank to get started!</Text>
            <Button 
              title="Create Tank" 
              onPress={() => router.push('/onboarding/create-tank')} 
              variant="primary"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={styles.tankTitle}>{selectedTank.name}</Text>
            <Badge 
              label={`${selectedTank.sizeGallons}gal ${selectedTank.waterType}`}
              variant="default"
            />
          </Animated.View>

          {/* Tank Viewer */}
          <Animated.View entering={FadeIn.delay(200).duration(500)}>
            <GlassCard style={styles.tankViewerCard}>
              <View style={styles.tankViewer}>
                {/* Tank glass effect */}
                <View style={styles.tankGlass}>
                  {/* Water */}
                  <View style={styles.tankWater}>
                    {/* Bubbles */}
                    {bubbles.map((_, i) => (
                      <Bubble key={i} delay={i * 300} />
                    ))}
                    
                    {/* Fish */}
                    {selectedTank.fishInstances.map((instance, index) => (
                      <AnimatedFish
                        key={instance.instanceId}
                        speciesId={instance.speciesId}
                        index={index}
                        onPress={() => handleFishPress(instance.instanceId)}
                      />
                    ))}
                    
                    {/* Decorations */}
                    <View style={styles.gravel} />
                    <View style={styles.plant1}>
                      <Text style={{ fontSize: 28 }}>🌿</Text>
                    </View>
                    <View style={styles.plant2}>
                      <Text style={{ fontSize: 24 }}>🪨</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <Text style={styles.viewerHint}>Tap fish for details</Text>
            </GlassCard>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsRow}
            >
              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => {
                  const feedTask = tankTasks.find(t => t.type === 'feed');
                  if (feedTask) {
                    completeTask(feedTask.id);
                    showToast('Fish fed! 🐟', 'success');
                  }
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <Utensils size={22} color="#FF6B35" />
                </View>
                <Text style={styles.quickActionLabel}>Feed</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => setShowWaterLogModal(true)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(78, 205, 196, 0.15)' }]}>
                  <Droplets size={22} color="#4ECDC4" />
                </View>
                <Text style={styles.quickActionLabel}>Log Test</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => {
                  const waterTask = tankTasks.find(t => t.type === 'water_change');
                  if (waterTask) {
                    completeTask(waterTask.id);
                    showToast('Water change logged!', 'success');
                  }
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Droplets size={22} color="#2196F3" />
                </View>
                <Text style={styles.quickActionLabel}>Water Change</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAction}
                onPress={() => router.push('/(tabs)/catalog')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(13, 115, 119, 0.15)' }]}>
                  <Plus size={22} color="#0D7377" />
                </View>
                <Text style={styles.quickActionLabel}>Add Fish</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* Stock List */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stock List</Text>
              <Text style={styles.stockCount}>{selectedTank.fishInstances.length} fish</Text>
            </View>

            {/* Bioload indicator */}
            <GlassCard style={styles.bioloadCard}>
              <View style={styles.bioloadHeader}>
                <Text style={styles.bioloadLabel}>Bioload</Text>
                <Badge 
                  label={bioloadPercent < 70 ? 'Good' : bioloadPercent < 100 ? 'Caution' : 'Overstocked'}
                  variant={bioloadPercent < 70 ? 'success' : bioloadPercent < 100 ? 'warning' : 'danger'}
                  size="small"
                />
              </View>
              <View style={styles.bioloadBar}>
                <View 
                  style={[
                    styles.bioloadFill, 
                    { 
                      width: `${Math.min(100, bioloadPercent)}%`,
                      backgroundColor: bioloadPercent < 70 ? '#4ECDC4' : bioloadPercent < 100 ? '#FFA726' : '#E57373',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.bioloadText}>
                {bioload.toFixed(1)}" / {maxBioload.toFixed(1)}" max
              </Text>
            </GlassCard>

            {selectedTank.fishInstances.length === 0 ? (
              <GlassCard style={styles.emptyStockCard}>
                <FishIcon size={40} color="#94A3B8" />
                <Text style={styles.emptyStockTitle}>No fish yet</Text>
                <Text style={styles.emptyStockText}>Browse the catalog to add your first fish!</Text>
                <Button 
                  title="Browse Fish" 
                  onPress={() => router.push('/(tabs)/catalog')}
                  variant="outline"
                  size="small"
                />
              </GlassCard>
            ) : (
              <View style={styles.fishList}>
                {selectedTank.fishInstances.map((instance, index) => {
                  const species = fishSpecies.find(s => s.id === instance.speciesId);
                  return (
                    <GlassCard 
                      key={instance.instanceId} 
                      style={styles.fishCard}
                      delay={450 + index * 50}
                      onPress={() => handleFishPress(instance.instanceId)}
                    >
                      <View style={[styles.fishCardIcon, { backgroundColor: species?.color || '#FF6B35' }]}>
                        <Text style={{ fontSize: 20 }}>🐠</Text>
                      </View>
                      <View style={styles.fishCardInfo}>
                        <Text style={styles.fishCardName}>
                          {instance.nickname || species?.commonName}
                        </Text>
                        <Text style={styles.fishCardSpecies}>{species?.scientificName}</Text>
                      </View>
                      <Badge 
                        label={species?.temperament || 'peaceful'}
                        variant={
                          species?.temperament === 'peaceful' ? 'success' :
                          species?.temperament === 'semi-aggressive' ? 'warning' : 'danger'
                        }
                        size="small"
                      />
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* Latest Parameters */}
          {selectedTank.parametersLog.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <Text style={styles.sectionTitle}>Latest Parameters</Text>
              <GlassCard style={styles.paramsCard}>
                <View style={styles.paramsGrid}>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>pH</Text>
                    <Text style={styles.paramValue}>{selectedTank.parametersLog[0].ph}</Text>
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Ammonia</Text>
                    <Text style={styles.paramValue}>{selectedTank.parametersLog[0].ammonia} ppm</Text>
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Nitrite</Text>
                    <Text style={styles.paramValue}>{selectedTank.parametersLog[0].nitrite} ppm</Text>
                  </View>
                  <View style={styles.paramItem}>
                    <Text style={styles.paramLabel}>Nitrate</Text>
                    <Text style={styles.paramValue}>{selectedTank.parametersLog[0].nitrate} ppm</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Water Log Modal */}
      <Modal
        visible={showWaterLogModal}
        onClose={() => setShowWaterLogModal(false)}
        title="Log Water Parameters"
        size="large"
      >
        <View style={styles.waterLogForm}>
          <View style={styles.paramInputRow}>
            <View style={styles.paramInputItem}>
              <Text style={styles.paramInputLabel}>pH</Text>
              <TextInput
                style={styles.paramInput}
                value={waterParams.ph}
                onChangeText={(t) => setWaterParams({...waterParams, ph: t})}
                placeholder="7.0"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.paramInputItem}>
              <Text style={styles.paramInputLabel}>Temp (°F)</Text>
              <TextInput
                style={styles.paramInput}
                value={waterParams.temp}
                onChangeText={(t) => setWaterParams({...waterParams, temp: t})}
                placeholder="78"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
          <View style={styles.paramInputRow}>
            <View style={styles.paramInputItem}>
              <Text style={styles.paramInputLabel}>Ammonia (ppm)</Text>
              <TextInput
                style={styles.paramInput}
                value={waterParams.ammonia}
                onChangeText={(t) => setWaterParams({...waterParams, ammonia: t})}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <View style={styles.paramInputItem}>
              <Text style={styles.paramInputLabel}>Nitrite (ppm)</Text>
              <TextInput
                style={styles.paramInput}
                value={waterParams.nitrite}
                onChangeText={(t) => setWaterParams({...waterParams, nitrite: t})}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
          <View style={styles.paramInputItem}>
            <Text style={styles.paramInputLabel}>Nitrate (ppm)</Text>
            <TextInput
              style={styles.paramInput}
              value={waterParams.nitrate}
              onChangeText={(t) => setWaterParams({...waterParams, nitrate: t})}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.paramInputItem}>
            <Text style={styles.paramInputLabel}>Notes</Text>
            <TextInput
              style={[styles.paramInput, styles.paramInputMulti]}
              value={waterParams.notes}
              onChangeText={(t) => setWaterParams({...waterParams, notes: t})}
              placeholder="Any observations..."
              multiline
              numberOfLines={2}
              placeholderTextColor="#94A3B8"
            />
          </View>
          <Button 
            title="Save Parameters" 
            onPress={handleSaveWaterLog}
            variant="primary"
            fullWidth
          />
        </View>
      </Modal>

      {/* Fish Detail Modal */}
      <Modal
        visible={showFishModal}
        onClose={() => {
          setShowFishModal(false);
          setSelectedFish(null);
        }}
        title={selectedFishInstance?.nickname || selectedSpecies?.commonName || 'Fish Details'}
        size="medium"
      >
        {selectedSpecies && (
          <View style={styles.fishDetailContent}>
            <View style={styles.fishDetailHeader}>
              <View style={[styles.fishDetailIcon, { backgroundColor: selectedSpecies.color }]}>
                <Text style={{ fontSize: 36 }}>🐠</Text>
              </View>
              <View style={styles.fishDetailInfo}>
                <Text style={styles.fishDetailName}>{selectedSpecies.commonName}</Text>
                <Text style={styles.fishDetailScientific}>{selectedSpecies.scientificName}</Text>
              </View>
            </View>

            <View style={styles.fishDetailStats}>
              <View style={styles.fishStatItem}>
                <Text style={styles.fishStatLabel}>Size</Text>
                <Text style={styles.fishStatValue}>{selectedSpecies.adultSizeInches}"</Text>
              </View>
              <View style={styles.fishStatItem}>
                <Text style={styles.fishStatLabel}>Min Tank</Text>
                <Text style={styles.fishStatValue}>{selectedSpecies.minTankGallons}g</Text>
              </View>
              <View style={styles.fishStatItem}>
                <Text style={styles.fishStatLabel}>Diet</Text>
                <Text style={styles.fishStatValue}>{selectedSpecies.diet}</Text>
              </View>
            </View>

            <View style={styles.fishDetailBadges}>
              <Badge label={selectedSpecies.temperament} variant={
                selectedSpecies.temperament === 'peaceful' ? 'success' :
                selectedSpecies.temperament === 'semi-aggressive' ? 'warning' : 'danger'
              } />
              <Badge label={selectedSpecies.difficulty} variant={
                selectedSpecies.difficulty === 'easy' ? 'success' :
                selectedSpecies.difficulty === 'medium' ? 'warning' : 'danger'
              } />
              {selectedSpecies.schooling && <Badge label="Schooling" variant="info" />}
            </View>

            <Text style={styles.fishDetailNotes}>{selectedSpecies.careNotes}</Text>

            <View style={styles.fishDetailActions}>
              <Button
                title="Mark Fed"
                onPress={() => {
                  showToast(`Fed ${selectedSpecies.commonName}!`, 'success');
                  setShowFishModal(false);
                }}
                variant="primary"
                size="medium"
              />
              <Button
                title="Remove Fish"
                onPress={handleRemoveFish}
                variant="danger"
                size="medium"
              />
            </View>
          </View>
        )}
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tankTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
  },
  tankViewerCard: {
    padding: 8,
    marginBottom: 24,
  },
  tankViewer: {
    height: TANK_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tankGlass: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'rgba(13, 115, 119, 0.3)',
    overflow: 'hidden',
  },
  tankWater: {
    flex: 1,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    position: 'relative',
  },
  fish: {
    position: 'absolute',
  },
  fishBody: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishEmoji: {
    fontSize: 20,
  },
  bubble: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  gravel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(139, 115, 85, 0.5)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  plant1: {
    position: 'absolute',
    bottom: 15,
    left: 30,
  },
  plant2: {
    position: 'absolute',
    bottom: 12,
    right: 40,
  },
  viewerHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  stockCount: {
    fontSize: 14,
    color: '#64748B',
  },
  actionsRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    width: 80,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  bioloadCard: {
    marginBottom: 16,
    padding: 14,
  },
  bioloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bioloadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  bioloadBar: {
    height: 8,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bioloadFill: {
    height: '100%',
    borderRadius: 4,
  },
  bioloadText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'right',
  },
  emptyStockCard: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyStockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  emptyStockText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  fishList: {
    gap: 10,
  },
  fishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  fishCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fishCardInfo: {
    flex: 1,
  },
  fishCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
  },
  fishCardSpecies: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  paramsCard: {
    marginBottom: 24,
  },
  paramsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paramItem: {
    width: '50%',
    paddingVertical: 10,
  },
  paramLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  paramValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
  },
  bottomPadding: {
    height: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A252F',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  waterLogForm: {
    gap: 16,
  },
  paramInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paramInputItem: {
    flex: 1,
  },
  paramInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  paramInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  paramInputMulti: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  fishDetailContent: {
    gap: 16,
  },
  fishDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fishDetailIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  fishDetailInfo: {
    flex: 1,
  },
  fishDetailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  fishDetailScientific: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  fishDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  fishStatItem: {
    alignItems: 'center',
  },
  fishStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  fishStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A252F',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  fishDetailBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fishDetailNotes: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 12,
    borderRadius: 10,
  },
  fishDetailActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
