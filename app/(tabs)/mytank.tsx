import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  TextInput, 
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
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
  withSpring,
} from 'react-native-reanimated';
import { 
  Plus, 
  Droplets, 
  Utensils, 
  Wrench,
  AlertCircle,
  Check,
  Thermometer,
  X,
  Search,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import MascotIcon from '@/components/mascot/MascotIcon';
import * as ImagePicker from 'expo-image-picker';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import AddToTankSheet from '@/components/sheets/AddToTankSheet';
import FishSprite from '@/components/tank/FishSprite';
import FishThumb from '@/components/FishThumb';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies, generateId } from '@/data/mockData';
import { getFishCatalog } from '@/utils/fishCatalogAdapter';
import { saveWaterLog, fetchWaterLogs } from '@/utils/waterLogsAdapter';
import { preloadCatalog, getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import * as Haptics from 'expo-haptics';
import { useMascot } from '@/components/mascot/MascotContext';
import { FishSpecies } from '@/data/types';
import { WaterLog } from '@/data/types';

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
  // Use the new lookup helper with slug normalization
  const species = getSpeciesBySlugSync(speciesId);
  
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
        <FishSprite
          slug={speciesId}
          imageKey={species?.image_key || null}
          size={34}
          color={species?.color || '#FF6B35'}
        />
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
  const { tanks, selectedTankId, selectTank, addWaterLog, tasks, completeTask, removeFishFromTank, addFishToTank, addFishInstances, isPremium, currentUser, diseaseCheckCount, incrementDiseaseCheck } = useApp();
  const { showToast } = useToast();
  
  const selectedTank = tanks.find(t => t.id === selectedTankId);
  const [selectedFish, setSelectedFish] = useState<string | null>(null);
  const [showWaterLogModal, setShowWaterLogModal] = useState(false);
  const [showFishModal, setShowFishModal] = useState(false);
  const [showAddFishModal, setShowAddFishModal] = useState(false);
  const [showAddToTankSheet, setShowAddToTankSheet] = useState(false);
  const [selectedSpeciesForAdd, setSelectedSpeciesForAdd] = useState<FishSpecies | null>(null);
  const [fishSearchQuery, setFishSearchQuery] = useState('');
  const [showDiseaseDetectionModal, setShowDiseaseDetectionModal] = useState(false);
  const [diseaseAnalysisResult, setDiseaseAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { showMascot, hideMascot } = useMascot();
  
  // Fish catalog state
  const [fishCatalog, setFishCatalog] = useState<FishSpecies[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  
  // Water history state
  const [waterHistory, setWaterHistory] = useState<WaterLog[]>([]);
  const [isLoadingWaterHistory, setIsLoadingWaterHistory] = useState(false);
  
  // Tank slider state
  const [currentTankIndex, setCurrentTankIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load fish catalog from database on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadCatalog() {
      setIsCatalogLoading(true);
      try {
        const catalog = await getFishCatalog({ limit: 100 });
        if (mounted) {
          setFishCatalog(catalog);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[MyTank] Failed to load catalog:', error);
        }
        // Fallback to mock data on error
        if (mounted) {
          setFishCatalog(fishSpecies);
        }
      } finally {
        if (mounted) {
          setIsCatalogLoading(false);
        }
      }
    }
    
    loadCatalog();
    preloadCatalog(); // Preload for species lookup
    
    return () => {
      mounted = false;
    };
  }, []);

  // Load water history when tank changes
  useEffect(() => {
    if (!selectedTankId) {
      setWaterHistory([]);
      return;
    }

    let mounted = true;
    
    async function loadWaterHistory() {
      setIsLoadingWaterHistory(true);
      try {
        const logs = await fetchWaterLogs(selectedTankId, currentUser?.id || null, 5); // Get 5 most recent
        if (mounted) {
          setWaterHistory(logs);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[MyTank] Failed to load water history:', error);
        }
        if (mounted) {
          setWaterHistory([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingWaterHistory(false);
        }
      }
    }
    
    loadWaterHistory();
    
    return () => {
      mounted = false;
    };
  }, [selectedTankId, currentUser?.id]);

  // Reload water history when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (selectedTankId) {
        fetchWaterLogs(selectedTankId, currentUser?.id || null, 5)
          .then(logs => setWaterHistory(logs))
          .catch(() => {
            // Silently fail
          });
      }
    }, [selectedTankId, currentUser?.id])
  );

  // Update current tank index when selectedTankId changes
  useEffect(() => {
    if (selectedTankId && tanks.length > 0) {
      const index = tanks.findIndex(t => t.id === selectedTankId);
      if (index !== -1) {
        setCurrentTankIndex(index);
      }
    }
  }, [selectedTankId, tanks]);
  
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

  // Tank navigation handlers
  const handlePreviousTank = async () => {
    if (tanks.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newIndex = currentTankIndex > 0 ? currentTankIndex - 1 : tanks.length - 1;
    setCurrentTankIndex(newIndex);
    selectTank(tanks[newIndex].id);
  };

  const handleNextTank = async () => {
    if (tanks.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newIndex = currentTankIndex < tanks.length - 1 ? currentTankIndex + 1 : 0;
    setCurrentTankIndex(newIndex);
    selectTank(tanks[newIndex].id);
  };

  const handleSelectTank = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentTankIndex(index);
    selectTank(tanks[index].id);
  };

  const handleCreateNewTank = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/onboarding/create-tank');
  };

  // Calculate bioload using the lookup helper
  const bioload = selectedTank?.fishInstances.reduce((acc, instance) => {
    const species = getSpeciesBySlugSync(instance.speciesId, instance);
    // Use 1 inch as safe default if species not found (don't silently ignore)
    return acc + (species?.adultSizeInches || 1);
  }, 0) || 0;

  const maxBioload = (selectedTank?.sizeGallons || 1) * 1.2;
  const bioloadPercent = Math.min(100, (bioload / maxBioload) * 100);

  const handleFishPress = async (instanceId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFish(instanceId);
    setShowFishModal(true);
  };

  const handleSaveWaterLog = async () => {
    if (!selectedTankId) {
      showToast('No tank selected', 'error');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Debug logging
      console.log('[WaterLog] activeTankId', selectedTankId);
      console.log('[WaterLog] user', currentUser?.id || null);
      console.log('[WaterLog] payload', {
        ph: waterParams.ph,
        temp: waterParams.temp,
        ammonia: waterParams.ammonia,
        nitrite: waterParams.nitrite,
        nitrate: waterParams.nitrate,
        notes: waterParams.notes,
      });

      // Save to Supabase - pass tank.id, user?.id, deviceId is handled internally
      const result = await saveWaterLog(
        selectedTankId,
        currentUser?.id || null,
        {
          ph: waterParams.ph,
          temp: waterParams.temp,
          ammonia: waterParams.ammonia,
          nitrite: waterParams.nitrite,
          nitrate: waterParams.nitrate,
          notes: waterParams.notes,
        }
      );

      if (result.ok) {
        // Success - also save to local state for immediate UI update
        addWaterLog(selectedTankId, {
          date: new Date().toISOString(),
          ph: parseFloat(waterParams.ph) || 0,
          ammonia: parseFloat(waterParams.ammonia) || 0,
          nitrite: parseFloat(waterParams.nitrite) || 0,
          nitrate: parseFloat(waterParams.nitrate) || 0,
          temp: parseFloat(waterParams.temp) || 0,
          notes: waterParams.notes,
        });

        // Refresh water history immediately
        try {
          const logs = await fetchWaterLogs(selectedTankId, currentUser?.id || null, 5);
          setWaterHistory(logs);
        } catch (err) {
          // Silently fail - not critical
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowWaterLogModal(false);
        setWaterParams({ ph: '', ammonia: '', nitrite: '', nitrate: '', temp: '', notes: '' });
        showToast('Saved ✓', 'success');
        
        // Show mascot celebration
        showMascot('checklist', 'bottom-right', 'Great job logging your parameters! 🎉', 3000);
      } else {
        // Handle different failure reasons
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        if (result.reason === 'remote_disabled') {
          showToast('Remote logging is disabled', 'error');
        } else if (result.errorMessage) {
          // Show the actual Supabase error
          showToast(result.errorMessage, 'error');
          console.error('[WaterLog] Error:', result.errorCode, result.errorMessage);
        } else {
          showToast('Failed to save parameters', 'error');
        }
        // Keep modal open so user can retry
      }
    } catch (error) {
      // Catch any unexpected errors
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error saving parameters', 'error');
      console.error('[MyTank] handleSaveWaterLog error:', error);
      // Keep modal open
    }
  };

  const handleRemoveFish = async () => {
    if (!selectedTankId || !selectedFish) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFishFromTank(selectedTankId, selectedFish);
    setShowFishModal(false);
    setSelectedFish(null);
    showToast('Fish removed from tank', 'info');
  };

  const handleAddFishPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Premium check - gate adding fish for free users
    if (!isPremium) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Upgrade to Premium to add fish', 'error');
      router.push('/onboarding/paywall');
      return;
    }
    
    setShowAddFishModal(true);
  };

  const handleLogParametersPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWaterLogModal(true);
  };

  const handleDiseaseDetectionPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if user has already used their free scan
    if (!isPremium && diseaseCheckCount >= 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('You\'ve used your free disease check. Upgrade for unlimited scans!', 'error');
      router.push('/onboarding/paywall');
      return;
    }
    
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Camera permission is required', 'error');
      return;
    }
    
    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setIsAnalyzing(true);
      setShowDiseaseDetectionModal(true);
      
      // Simulate API call (replace with actual API later)
      setTimeout(() => {
        const mockAnalysis = {
          disease: 'Ich (White Spot Disease)',
          confidence: 87,
          symptoms: ['White spots on body', 'Flashing behavior', 'Clamped fins'],
          treatment: [
            'Raise temperature to 82-86°F gradually',
            'Add aquarium salt (1 tablespoon per 5 gallons)',
            'Use ich medication as directed',
            'Maintain excellent water quality',
          ],
          severity: 'Moderate',
          imageUri: result.assets[0].uri,
        };
        
        setDiseaseAnalysisResult(mockAnalysis);
        setIsAnalyzing(false);
        
        // Increment disease check count for free users (they've now used their 1 free scan)
        if (!isPremium) {
          incrementDiseaseCheck();
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2500);
    }
  };

  const handleSaveToHistory = async () => {
    // Check if user is premium
    if (!isPremium) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Upgrade to Premium to save disease checks to history', 'error');
      router.push('/onboarding/paywall');
      return;
    }
    
    // Premium users can save
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Analysis saved to history', 'success');
    setShowDiseaseDetectionModal(false);
    setDiseaseAnalysisResult(null);
  };

  const handleSelectFishToAdd = async (species: FishSpecies) => {
    if (!selectedTankId) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Open the AddToTankSheet instead of adding immediately
    setSelectedSpeciesForAdd(species);
    setShowAddFishModal(false);
    setShowAddToTankSheet(true);
  };

  const handleConfirmAddFish = async (quantity: number) => {
    if (!selectedTankId || !selectedSpeciesForAdd || !selectedTank) return;
    
    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (selectedSpeciesForAdd.waterType !== selectedTank.waterType) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        `Cannot add ${selectedSpeciesForAdd.commonName}: ${selectedSpeciesForAdd.waterType} fish cannot be added to a ${selectedTank.waterType} tank`,
        'error'
      );
      return;
    }
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Use the new batch add method
    addFishInstances(selectedTankId, selectedSpeciesForAdd.id, quantity);
    
    setShowAddToTankSheet(false);
    setSelectedSpeciesForAdd(null);
    setFishSearchQuery('');
    
    const plural = quantity > 1 ? `${quantity} ${selectedSpeciesForAdd.commonName}` : selectedSpeciesForAdd.commonName;
    showToast(`${plural} added to tank!`, 'success');
    
    // Show mascot celebration
    showMascot('happy', 'bottom-right', 'Welcome to the tank! 🐠', 3000);
  };

  // Filter fish from the loaded catalog (database), not mock data
  // Only show fish that match the tank's water type
  const filteredFishForAdd = fishCatalog.filter(fish => {
    // First filter by water type - only show fish matching the tank's water type
    if (selectedTank && fish.waterType !== selectedTank.waterType) {
      return false;
    }
    
    // Then filter by search query if provided
    if (!fishSearchQuery.trim()) {
      return true; // Show all matching water type if no search query
    }
    
    const query = fishSearchQuery.toLowerCase().trim();
    return fish.commonName.toLowerCase().includes(query) ||
           fish.scientificName.toLowerCase().includes(query) ||
           (fish.id && fish.id.toLowerCase().includes(query));
  });

  const selectedFishInstance = selectedTank?.fishInstances.find(f => f.instanceId === selectedFish);
  const selectedSpecies = selectedFishInstance 
    ? getSpeciesBySlugSync(selectedFishInstance.speciesId)
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
          {/* Tank Slider - Only show if there are tanks */}
          {tanks.length > 0 && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.tankSliderContainer}>
              <View style={styles.tankSlider}>
                {/* Previous button */}
                {tanks.length > 1 && (
                  <TouchableOpacity 
                    style={styles.sliderArrow}
                    onPress={handlePreviousTank}
                  >
                    <ChevronLeft size={24} color="#0D7377" />
                  </TouchableOpacity>
                )}

                {/* Tank cards carousel */}
                <View style={styles.tankCardsContainer}>
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    contentContainerStyle={styles.tankCardsScroll}
                  >
                    {tanks.map((tank, index) => (
                      <TouchableOpacity
                        key={tank.id}
                        style={[
                          styles.tankSliderCard,
                          currentTankIndex === index && styles.tankSliderCardActive
                        ]}
                        onPress={() => handleSelectTank(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.tankSliderName,
                          currentTankIndex === index && styles.tankSliderNameActive
                        ]}>
                          {tank.name}
                        </Text>
                        <Text style={[
                          styles.tankSliderInfo,
                          currentTankIndex === index && styles.tankSliderInfoActive
                        ]}>
                          {tank.sizeGallons}gal • {tank.fishInstances.length} fish
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    {/* Add New Tank Card */}
                    <TouchableOpacity
                      style={styles.tankSliderCardNew}
                      onPress={handleCreateNewTank}
                      activeOpacity={0.7}
                    >
                      <Plus size={20} color="#0D7377" />
                      <Text style={styles.tankSliderNewText}>New Tank</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Next button */}
                {tanks.length > 1 && (
                  <TouchableOpacity 
                    style={styles.sliderArrow}
                    onPress={handleNextTank}
                  >
                    <ChevronRight size={24} color="#0D7377" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dots indicator */}
              {tanks.length > 1 && (
                <View style={styles.dotsContainer}>
                  {tanks.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dot,
                        currentTankIndex === index && styles.dotActive
                      ]}
                      onPress={() => handleSelectTank(index)}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
            <Text style={styles.tankTitle}>{selectedTank.name}</Text>
            <Badge 
              label={`${selectedTank.sizeGallons}gal ${selectedTank.waterType}`}
              variant="default"
            />
          </Animated.View>

          {/* Tank Viewer */}
          <Animated.View entering={FadeIn.delay(100).duration(240)}>
            <GlassCard style={styles.tankViewerCard}>
              <View style={styles.tankViewer}>
                {/* Tank glass effect */}
                <View style={styles.tankGlass}>
                  {/* Water */}
                  <View style={styles.tankWater} pointerEvents="box-none">
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
                    <View style={styles.gravel} pointerEvents="none" />
                    <View style={styles.plant1} pointerEvents="none">
                      <Text style={{ fontSize: 28 }}>🌿</Text>
                    </View>
                    <View style={styles.plant2} pointerEvents="none">
                      <Text style={{ fontSize: 24 }}>🪨</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <Text style={styles.viewerHint}>Tap fish for details</Text>
            </GlassCard>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(150).duration(220)}>
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
                onPress={handleLogParametersPress}
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
                onPress={handleAddFishPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(13, 115, 119, 0.15)' }]}>
                  <Plus size={22} color="#0D7377" />
                </View>
                <Text style={styles.quickActionLabel}>Add Fish</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickAction}
                onPress={handleDiseaseDetectionPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                  <Camera size={22} color="#FF9800" />
                </View>
                <Text style={styles.quickActionLabel}>Disease Check</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* Disease Detection Card */}
          <Animated.View entering={FadeInDown.delay(175).duration(220)}>
            <GlassCard style={styles.diseaseDetectionCard}>
              <View style={styles.diseaseDetectionHeader}>
                <View style={styles.diseaseDetectionTitleRow}>
                  <Camera size={24} color="#FF9800" />
                  <Text style={styles.diseaseDetectionTitle}>Fish Health Scanner</Text>
                </View>
                <Text style={styles.diseaseDetectionSubtitle}>
                  AI-powered disease detection (Beta)
                </Text>
              </View>
              
              <Button
                title="Scan for Diseases"
                onPress={handleDiseaseDetectionPress}
                variant="primary"
                icon={<Camera size={20} color="#fff" />}
              />
              
              <View style={styles.diseaseDetectionDisclaimer}>
                <AlertCircle size={14} color="#FF9800" />
                <Text style={styles.diseaseDetectionDisclaimerText}>
                  For educational purposes only - not veterinary advice
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Water History */}
          <Animated.View entering={FadeInDown.delay(200).duration(220)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Water History</Text>
              {waterHistory.length > 0 && (
                <Text style={styles.stockCount}>{waterHistory.length} {waterHistory.length === 1 ? 'log' : 'logs'}</Text>
              )}
            </View>

            {isLoadingWaterHistory ? (
              <GlassCard style={styles.waterHistoryCard}>
                <Text style={styles.waterHistoryEmpty}>Loading...</Text>
              </GlassCard>
            ) : waterHistory.length === 0 ? (
              <GlassCard style={styles.waterHistoryCard}>
                <Text style={styles.waterHistoryEmpty}>No water logs yet.</Text>
                <Text style={styles.waterHistoryEmptyHint}>
                  Tap "Log Test" to record your first water parameters.
                </Text>
              </GlassCard>
            ) : (
              <View style={styles.waterHistoryList}>
                {waterHistory.map((log, index) => {
                  const logDate = new Date(log.date);
                  const formattedDate = logDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: logDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  });
                  const formattedTime = logDate.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  });

                  return (
                    <GlassCard 
                      key={log.id || index} 
                      style={styles.waterHistoryCard}
                      delay={250 + index * 30}
                    >
                      <View style={styles.waterHistoryHeader}>
                        <View style={styles.waterHistoryDateRow}>
                          <Droplets size={16} color="#4ECDC4" />
                          <Text style={styles.waterHistoryDate}>{formattedDate}</Text>
                          <Text style={styles.waterHistoryTime}>{formattedTime}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.waterHistoryParams}>
                        {log.ph > 0 && (
                          <View style={styles.waterHistoryParam}>
                            <Text style={styles.waterHistoryParamLabel}>pH</Text>
                            <Text style={styles.waterHistoryParamValue}>{log.ph.toFixed(1)}</Text>
                          </View>
                        )}
                        {log.temp > 0 && (
                          <View style={styles.waterHistoryParam}>
                            <Text style={styles.waterHistoryParamLabel}>Temp</Text>
                            <Text style={styles.waterHistoryParamValue}>{log.temp.toFixed(0)}°F</Text>
                          </View>
                        )}
                        {log.ammonia >= 0 && (
                          <View style={styles.waterHistoryParam}>
                            <Text style={styles.waterHistoryParamLabel}>NH₃</Text>
                            <Text style={styles.waterHistoryParamValue}>{log.ammonia.toFixed(1)}</Text>
                          </View>
                        )}
                        {log.nitrite >= 0 && (
                          <View style={styles.waterHistoryParam}>
                            <Text style={styles.waterHistoryParamLabel}>NO₂</Text>
                            <Text style={styles.waterHistoryParamValue}>{log.nitrite.toFixed(1)}</Text>
                          </View>
                        )}
                        {log.nitrate >= 0 && (
                          <View style={styles.waterHistoryParam}>
                            <Text style={styles.waterHistoryParamLabel}>NO₃</Text>
                            <Text style={styles.waterHistoryParamValue}>{log.nitrate.toFixed(0)}</Text>
                          </View>
                        )}
                      </View>
                      
                      {log.notes && log.notes.trim() && (
                        <Text style={styles.waterHistoryNotes}>{log.notes}</Text>
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* Stock List */}
          <Animated.View entering={FadeInDown.delay(225).duration(220)}>
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
                <MascotIcon variant="search" size={72} />
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
                  const species = getSpeciesBySlugSync(instance.speciesId, instance);
                  return (
                    <GlassCard 
                      key={instance.instanceId} 
                      style={styles.fishCard}
                      delay={450 + index * 50}
                      onPress={() => handleFishPress(instance.instanceId)}
                    >
                      {species?.image_key ? (
                        <View style={styles.fishCardIcon}>
                          <FishThumb 
                            imageKey={species.image_key} 
                            size={20} 
                          />
                        </View>
                      ) : (
                        <View style={[styles.fishCardIcon, { backgroundColor: species?.color || '#FF6B35' }]}>
                          <Text style={{ fontSize: 20 }}>🐠</Text>
                        </View>
                      )}
                      <View style={styles.fishCardInfo}>
                        <Text style={styles.fishCardName}>
                          {instance.nickname || species?.commonName || 'Unknown Fish'}
                        </Text>
                        <Text style={styles.fishCardSpecies}>{species?.scientificName || ''}</Text>
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
            <Animated.View entering={FadeInDown.delay(250).duration(220)}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.waterLogScrollContent}
            showsVerticalScrollIndicator={false}
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
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                <View style={styles.paramInputItem}>
                  <Text style={styles.paramInputLabel}>Temp (°F)</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={waterParams.temp}
                    onChangeText={(t) => setWaterParams({...waterParams, temp: t})}
                    placeholder="78"
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    blurOnSubmit={false}
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
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                <View style={styles.paramInputItem}>
                  <Text style={styles.paramInputLabel}>Nitrite (ppm)</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={waterParams.nitrite}
                    onChangeText={(t) => setWaterParams({...waterParams, nitrite: t})}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    blurOnSubmit={false}
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
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  blurOnSubmit={false}
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
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  blurOnSubmit={true}
                />
              </View>
            </View>
          </ScrollView>
          
          {/* Fixed footer with Save button */}
          <View style={styles.waterLogFooter}>
            <Button 
              title="Save Parameters" 
              onPress={handleSaveWaterLog}
              variant="primary"
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
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
              {(selectedSpecies as any)?.image_key || (selectedSpecies as any)?.imageKey ? (
                <View style={styles.fishDetailIcon}>
                  <FishThumb 
                    imageKey={(selectedSpecies as any).image_key ?? (selectedSpecies as any).imageKey ?? null} 
                    size={36} 
                  />
                </View>
              ) : (
                <View style={[styles.fishDetailIcon, { backgroundColor: selectedSpecies.color }]}>
                  <Text style={{ fontSize: 36 }}>🐠</Text>
                </View>
              )}
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

      {/* Add Fish Modal */}
      <Modal
        visible={showAddFishModal}
        onClose={() => {
          setShowAddFishModal(false);
          setFishSearchQuery('');
        }}
        title="Add Fish to Tank"
        size="large"
      >
        <View style={styles.addFishContent}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search fish..."
              value={fishSearchQuery}
              onChangeText={setFishSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {fishSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setFishSearchQuery('')}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Fish List */}
          <ScrollView 
            style={styles.fishListScroll}
            showsVerticalScrollIndicator={false}
          >
            {isCatalogLoading ? (
              <View style={styles.emptyFishList}>
                <MascotIcon variant="happy" size={64} />
                <Text style={styles.emptyFishListText}>Loading fish catalog...</Text>
              </View>
            ) : filteredFishForAdd.length > 0 ? (
              filteredFishForAdd.map((fish) => (
                <TouchableOpacity
                  key={fish.id}
                  style={styles.fishListItem}
                  onPress={() => handleSelectFishToAdd(fish)}
                  activeOpacity={0.7}
                >
                  {fish.image_key ? (
                    <View style={styles.fishListItemIcon}>
                      <FishThumb 
                        imageKey={fish.image_key} 
                        size={24} 
                      />
                    </View>
                  ) : (
                    <View style={[styles.fishListItemIcon, { backgroundColor: fish.color }]}>
                      <Text style={{ fontSize: 24 }}>🐠</Text>
                    </View>
                  )}
                  <View style={styles.fishListItemInfo}>
                    <Text style={styles.fishListItemName}>{fish.commonName}</Text>
                    <Text style={styles.fishListItemScientific}>{fish.scientificName}</Text>
                    <View style={styles.fishListItemBadges}>
                      <Badge 
                        label={fish.difficulty} 
                        variant={fish.difficulty === 'easy' ? 'success' : fish.difficulty === 'medium' ? 'warning' : 'danger'}
                        size="small"
                      />
                      <Text style={styles.fishListItemSize}>{fish.minTankGallons}g+</Text>
                    </View>
                  </View>
                  <Plus size={20} color="#0D7377" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyFishList}>
                <MascotIcon variant="search" size={64} />
                <Text style={styles.emptyFishListText}>
                  {fishSearchQuery.trim() ? 'No fish found' : 'No fish available'}
                </Text>
                <Text style={styles.emptyFishListSubtext}>
                  {fishSearchQuery.trim() ? 'Try a different search term' : 'Check your database connection'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add To Tank Sheet */}
      {selectedTank && selectedSpeciesForAdd && (
        <AddToTankSheet
          visible={showAddToTankSheet}
          onClose={() => {
            setShowAddToTankSheet(false);
            setSelectedSpeciesForAdd(null);
          }}
          species={selectedSpeciesForAdd}
          tank={selectedTank}
          onConfirm={handleConfirmAddFish}
        />
      )}

      {/* Disease Detection Modal */}
      <Modal
        visible={showDiseaseDetectionModal}
        onClose={() => {
          setShowDiseaseDetectionModal(false);
          setDiseaseAnalysisResult(null);
          setIsAnalyzing(false);
        }}
        title="Disease Detection"
        size="large"
      >
        {isAnalyzing ? (
          <View style={styles.analyzingContainer}>
            <MascotIcon variant="search" size={80} />
            <Text style={styles.analyzingText}>Analyzing image...</Text>
            <Text style={styles.analyzingSubtext}>This may take a few moments</Text>
          </View>
        ) : diseaseAnalysisResult ? (
          <ScrollView style={styles.diseaseResultContent} showsVerticalScrollIndicator={false}>
            {/* Disclaimer */}
            <View style={styles.disclaimerBanner}>
              <AlertCircle size={20} color="#FF9800" />
              <Text style={styles.disclaimerText}>
                This is an AI-powered analysis and not veterinary advice. Always consult a professional for diagnosis and treatment.
              </Text>
            </View>

            {/* Disease Name & Confidence */}
            <View style={styles.diseaseHeader}>
              <Text style={styles.diseaseName}>{diseaseAnalysisResult.disease}</Text>
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <Text style={[
                  styles.confidenceValue,
                  { color: diseaseAnalysisResult.confidence >= 80 ? '#10B981' : diseaseAnalysisResult.confidence >= 60 ? '#FF9800' : '#EF4444' }
                ]}>
                  {diseaseAnalysisResult.confidence}%
                </Text>
              </View>
            </View>

            {/* Severity Badge */}
            <Badge 
              label={`Severity: ${diseaseAnalysisResult.severity}`}
              variant={diseaseAnalysisResult.severity === 'Low' ? 'success' : diseaseAnalysisResult.severity === 'Moderate' ? 'warning' : 'danger'}
            />

            {/* Symptoms */}
            <View style={styles.diseaseSection}>
              <Text style={styles.diseaseSectionTitle}>Observed Symptoms</Text>
              {diseaseAnalysisResult.symptoms.map((symptom: string, index: number) => (
                <View key={index} style={styles.symptomItem}>
                  <Check size={16} color="#10B981" />
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>

            {/* Treatment */}
            <View style={styles.diseaseSection}>
              <Text style={styles.diseaseSectionTitle}>Recommended Treatment</Text>
              {diseaseAnalysisResult.treatment.map((step: string, index: number) => (
                <View key={index} style={styles.treatmentItem}>
                  <Text style={styles.treatmentNumber}>{index + 1}</Text>
                  <Text style={styles.treatmentText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Free User Notice */}
            {!isPremium && (
              <View style={styles.freeUserNotice}>
                <AlertCircle size={16} color="#4ECDC4" />
                <Text style={styles.freeUserNoticeText}>
                  This was your free disease check! Upgrade to save results and get unlimited scans.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.diseaseActionButtons}>
              <Button
                title={isPremium ? "Save to History" : "Upgrade to Save"}
                onPress={handleSaveToHistory}
                variant={isPremium ? "primary" : "secondary"}
              />
              {!isPremium && (
                <Button
                  title="Close"
                  onPress={() => {
                    setShowDiseaseDetectionModal(false);
                    setDiseaseAnalysisResult(null);
                  }}
                  variant="ghost"
                />
              )}
            </View>
          </ScrollView>
        ) : null}
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
    zIndex: 1,
  },
  tankGlass: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'rgba(13, 115, 119, 0.3)',
    overflow: 'hidden',
    zIndex: 1,
  },
  tankWater: {
    flex: 1,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    position: 'relative',
    zIndex: 1,
  },
  fish: {
    position: 'absolute',
    zIndex: 10,
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
  diseaseDetectionCard: {
    marginBottom: 24,
    padding: 20,
  },
  diseaseDetectionHeader: {
    marginBottom: 16,
  },
  diseaseDetectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  diseaseDetectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
  },
  diseaseDetectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  diseaseDetectionDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  diseaseDetectionDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#FF9800',
    lineHeight: 16,
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
  waterLogScrollContent: {
    paddingBottom: 100, // Extra padding to ensure content scrollable above keyboard
  },
  waterLogForm: {
    gap: 16,
  },
  waterLogFooter: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
  addFishContent: {
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  fishListScroll: {
    maxHeight: 400,
  },
  fishListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  fishListItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishListItemInfo: {
    flex: 1,
  },
  fishListItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  fishListItemScientific: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  fishListItemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fishListItemSize: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyFishList: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyFishListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  emptyFishListSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A252F',
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  diseaseResultContent: {
    flex: 1,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    marginBottom: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  diseaseHeader: {
    marginBottom: 16,
  },
  diseaseName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  diseaseSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  diseaseSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 12,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  symptomText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  treatmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 10,
    marginBottom: 10,
  },
  treatmentNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0D7377',
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  treatmentText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  freeUserNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
    marginTop: 20,
    marginBottom: 16,
  },
  freeUserNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#0D7377',
    lineHeight: 18,
    fontWeight: '500',
  },
  diseaseActionButtons: {
    gap: 12,
    marginTop: 8,
  },
  // Tank Slider Styles
  tankSliderContainer: {
    marginBottom: 16,
  },
  tankSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sliderArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(13, 115, 119, 0.2)',
  },
  tankCardsContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  tankCardsScroll: {
    gap: 12,
  },
  tankSliderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    minWidth: 150,
    maxWidth: 180,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tankSliderCardActive: {
    backgroundColor: 'rgba(13, 115, 119, 0.15)',
    borderColor: '#0D7377',
  },
  tankSliderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tankSliderNameActive: {
    color: '#0D7377',
  },
  tankSliderInfo: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tankSliderInfoActive: {
    color: '#0D7377',
  },
  tankSliderCardNew: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
    minWidth: 120,
    maxWidth: 150,
    borderWidth: 2,
    borderColor: '#0D7377',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexDirection: 'row',
  },
  tankSliderNewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(13, 115, 119, 0.2)',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D7377',
  },
  // Water History Styles
  waterHistoryList: {
    gap: 12,
  },
  waterHistoryCard: {
    padding: 14,
  },
  waterHistoryEmpty: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  waterHistoryEmptyHint: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 6,
  },
  waterHistoryHeader: {
    marginBottom: 10,
  },
  waterHistoryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterHistoryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
  },
  waterHistoryTime: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  waterHistoryParams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  waterHistoryParam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  waterHistoryParamLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  waterHistoryParamValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A252F',
  },
  waterHistoryNotes: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
