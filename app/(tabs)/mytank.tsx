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
  Keyboard,
  Alert,
  InteractionManager
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
  Camera
} from 'lucide-react-native';
import MascotIcon from '@/components/mascot/MascotIcon';
import * as ImagePicker from 'expo-image-picker';
import TankSwitcher from '@/components/tank/TankSwitcher';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import AddToTankSheet from '@/components/sheets/AddToTankSheet';
import FishSprite from '@/components/tank/FishSprite';
import FishThumb from '@/components/FishThumb';
import WaterTrendsChart from '@/components/tank/WaterTrendsChart';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies, generateId } from '@/data/mockData';
import { getFishCatalog } from '@/utils/fishCatalogAdapter';
import { saveWaterLog, fetchWaterLogs } from '@/utils/waterLogsAdapter';
import { runDiseaseScan } from '@/utils/diseaseDetection';
import { fetchDiseaseCheckHistory } from '@/utils/remoteDiseaseChecks';
import { preloadCatalog, getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import { getLatestAquascapeLayout, AquascapeLayoutItem } from '@/utils/aquascapeRemote';
import { mapLayoutToContainer, MappedLayoutItem, getAsset, normalizeLayout } from '@/utils/aquascapeLayout';
import SubstrateLayer, { DEFAULT_SUBSTRATE } from '@/components/tank/SubstrateLayer';
import * as Haptics from 'expo-haptics';
import { useMascot } from '@/components/mascot/MascotContext';
import { FishSpecies } from '@/data/types';
import { WaterLog } from '@/data/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TANK_WIDTH = SCREEN_WIDTH - 48;
const TANK_HEIGHT = 220;

// Aquascape editor canvas dimensions (for mapping)
const AQUASCAPE_CANVAS_WIDTH = SCREEN_WIDTH - 48;
const AQUASCAPE_CANVAS_HEIGHT = 400;

// Aquascape item component (static, non-draggable)
function AquascapeItem({ item, baseSize = 40 }: { item: MappedLayoutItem; baseSize?: number }) {
  const asset = getAsset(item.assetKey);
  
  // Use mapped pixel coordinates
  // Size already computed by mapping utility
  const finalSize = baseSize * item.pixelScale;
  
  // Check if this is a catalog item with an image
  const hasCatalogImage = !!item.catalogItemSlug && !!item.catalogItemType && !!item.assetKey;
  
  return (
    <View
      style={[
        styles.aquascapeItem,
        {
          left: item.pixelX,
          top: item.pixelY,
          width: finalSize,
          height: finalSize,
          transform: [
            { rotate: `${item.rotation}deg` },
          ],
          zIndex: item.z,
        },
      ]}
      pointerEvents="none"
    >
      {hasCatalogImage ? (
        <FishThumb
          imageKey={item.assetKey}
          size={finalSize}
          style={{ borderRadius: 4 }}
        />
      ) : (
        <Text style={{ fontSize: finalSize * 0.7 }}>{asset.emoji}</Text>
      )}
    </View>
  );
}

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
  const { session } = useAuth();
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
  const [detectionStage, setDetectionStage] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [showPhotoPickerSheet, setShowPhotoPickerSheet] = useState(false);
  const [showDiseaseHistory, setShowDiseaseHistory] = useState(false);
  const [diseaseHistory, setDiseaseHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryCheck, setSelectedHistoryCheck] = useState<any>(null);
  const [showFailedScans, setShowFailedScans] = useState(false);
  const { showMascot, hideMascot } = useMascot();
  
  // Mounted ref to track component lifecycle
  const isMounted = useRef(true);
  
  // Fish catalog state
  const [fishCatalog, setFishCatalog] = useState<FishSpecies[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  
  // Water history state
  const [waterHistory, setWaterHistory] = useState<WaterLog[]>([]);
  const [isLoadingWaterHistory, setIsLoadingWaterHistory] = useState(false);

  // Aquascape state
  const [aquascapeItems, setAquascapeItems] = useState<MappedLayoutItem[]>([]);
  const [tankContainerSize, setTankContainerSize] = useState({ width: TANK_WIDTH, height: TANK_HEIGHT });
  const [rawAquascapeLayout, setRawAquascapeLayout] = useState<AquascapeLayoutItem[]>([]);
  const [layout, setLayout] = useState<any>(null); // Store full layout for substrate config

  // Load aquascape items for selected tank
  useEffect(() => {
    if (!selectedTankId || !session?.user?.id) {
      setAquascapeItems([]);
      return;
    }

    let mounted = true;

    async function loadAquascape() {
      const result = await getLatestAquascapeLayout(selectedTankId!, session!.user.id);
      
      if (!mounted) return;
      
      if (result.ok && result.layout) {
        // Normalize and store raw layout
        const normalized = normalizeLayout(result.layout, AQUASCAPE_CANVAS_WIDTH, AQUASCAPE_CANVAS_HEIGHT);
        setRawAquascapeLayout(normalized.items);
        setLayout(normalized); // Store full layout
        
        // Map to container coordinates
        const mapped = mapLayoutToContainer(
          normalized,
          tankContainerSize.width,
          tankContainerSize.height
        );
        setAquascapeItems(mapped.items);
        console.log('[MyTank] Loaded aquascape on mount:', mapped.items.length, 'items');
      } else {
        setRawAquascapeLayout([]);
        setAquascapeItems([]);
        setLayout(null);
      }
    }

    loadAquascape();

    return () => {
      mounted = false;
    };
  }, [selectedTankId, session?.user?.id]);

  // Remap aquascape when container size changes
  useEffect(() => {
    if (rawAquascapeLayout.length > 0) {
      const layout = {
        canvas: { 
          w: AQUASCAPE_CANVAS_WIDTH, 
          h: AQUASCAPE_CANVAS_HEIGHT, 
          zoom: 1, 
          panX: 0, 
          panY: 0,
          groundY: AQUASCAPE_CANVAS_HEIGHT * 0.85,
        },
        items: rawAquascapeLayout,
      };
      const mapped = mapLayoutToContainer(layout, tankContainerSize.width, tankContainerSize.height);
      setAquascapeItems(mapped.items);
      console.log('[MyTank] Remapped aquascape for container:', tankContainerSize.width, 'x', tankContainerSize.height);
    }
  }, [tankContainerSize, rawAquascapeLayout]);

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

  // ImagePicker diagnostics
  useEffect(() => {
    console.log('[PickerDiag] ImagePicker keys:', Object.keys(ImagePicker ?? {}));
    console.log('[PickerDiag] has launchCameraAsync:', typeof ImagePicker.launchCameraAsync);
    console.log('[PickerDiag] has launchImageLibraryAsync:', typeof ImagePicker.launchImageLibraryAsync);
  }, []);

  // Cleanup mounted ref
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load disease history when opening history view or toggle changes
  useEffect(() => {
    if (!showDiseaseHistory || !session?.user?.id) {
      return;
    }

    let mounted = true;
    
    async function loadDiseaseHistory() {
      setIsLoadingHistory(true);
      try {
        const result = await fetchDiseaseCheckHistory({
          ownerId: session.user.id,
          tankId: selectedTankId || undefined,
          limit: 20,
          includeFailedScans: showFailedScans,
        });
        if (mounted && result.ok) {
          setDiseaseHistory(result.checks || []);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[MyTank] Failed to load disease history:', error);
        }
        if (mounted) {
          setDiseaseHistory([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingHistory(false);
        }
      }
    }
    
    loadDiseaseHistory();
    
    return () => {
      mounted = false;
    };
  }, [showDiseaseHistory, session?.user?.id, selectedTankId, showFailedScans]);

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
        const logs = await fetchWaterLogs(selectedTankId, 5); // Get 5 most recent
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

  // Reload water history and aquascape when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (selectedTankId && session?.user?.id) {
        // Reload water logs
        fetchWaterLogs(selectedTankId, 5)
          .then(logs => setWaterHistory(logs))
          .catch(() => {
            // Silently fail
          });
        
        // Reload disease history if modal is open
        if (showDiseaseHistory) {
          loadDiseaseHistory();
        }
        
        // Reload aquascape items
        getLatestAquascapeLayout(selectedTankId, session.user.id)
          .then(result => {
            if (result.ok && result.layout) {
              const normalized = normalizeLayout(result.layout, AQUASCAPE_CANVAS_WIDTH, AQUASCAPE_CANVAS_HEIGHT);
              setRawAquascapeLayout(normalized.items);
              setLayout(normalized); // Store full layout
              
              const mapped = mapLayoutToContainer(
                normalized,
                tankContainerSize.width,
                tankContainerSize.height
              );
              setAquascapeItems(mapped.items);
              console.log('[MyTank] Reloaded aquascape on focus:', mapped.items.length, 'items');
            } else {
              setRawAquascapeLayout([]);
              setAquascapeItems([]);
              setLayout(null);
            }
          })
          .catch(() => {
            // Silently fail
          });
      }
    }, [selectedTankId, session?.user?.id, tankContainerSize])
  );

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

  // Tank creation handler
  const handleCreateNewTank = () => {
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
    
    // Verify the fish species exists before showing modal
    const fishInstance = selectedTank?.fishInstances.find(f => f.instanceId === instanceId);
    if (!fishInstance) return;
    
    const species = getSpeciesBySlugSync(fishInstance.speciesId);
    if (!species) {
      showToast('Fish details not found', 'error');
      return;
    }
    
    setSelectedFish(instanceId);
    setShowFishModal(true);
  };

  const handleSaveWaterLog = async () => {
    // Guard: Check tank is selected
    if (!selectedTankId) {
      showToast('No tank selected', 'error');
      return;
    }

    // Guard: Check tank ID is valid UUID (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(selectedTankId)) {
      showToast('Invalid tank ID', 'error');
      return;
    }

    // Guard: Check user is authenticated
    if (!currentUser?.id) {
      showToast('Please sign in to save logs', 'error');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Convert string inputs to numbers or null
      const payload = {
        ph: waterParams.ph?.trim() ? parseFloat(waterParams.ph) : null,
        temperature: waterParams.temp?.trim() ? parseFloat(waterParams.temp) : null,
        ammonia: waterParams.ammonia?.trim() ? parseFloat(waterParams.ammonia) : null,
        nitrite: waterParams.nitrite?.trim() ? parseFloat(waterParams.nitrite) : null,
        nitrate: waterParams.nitrate?.trim() ? parseFloat(waterParams.nitrate) : null,
        notes: waterParams.notes?.trim() || null,
      };

      if (__DEV__) {
        console.log('[WaterLog] Saving for tank:', selectedTankId);
        console.log('[WaterLog] User:', currentUser.id);
        console.log('[WaterLog] Payload:', payload);
      }

      // Save to Supabase via adapter
      const result = await saveWaterLog(selectedTankId, payload);

      if (result.ok) {
        // Success - also save to local state for immediate UI update
        addWaterLog(selectedTankId, {
          date: new Date().toISOString(),
          ph: payload.ph ?? 0,
          ammonia: payload.ammonia ?? 0,
          nitrite: payload.nitrite ?? 0,
          nitrate: payload.nitrate ?? 0,
          temp: payload.temperature ?? 0,
          notes: payload.notes ?? '',
        });

        // Refresh water history immediately
        try {
          const logs = await fetchWaterLogs(selectedTankId, 5);
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

  // Get relative time display (e.g., "2 hours ago", "3 days ago")
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  // Load disease history
  const loadDiseaseHistory = async () => {
    if (!session?.user?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const result = await fetchDiseaseCheckHistory({
        ownerId: session.user.id,
        tankId: selectedTankId || undefined,
        limit: 20,
        includeFailedScans: showFailedScans,
      });

      if (result.ok && result.checks) {
        setDiseaseHistory(result.checks);
      } else {
        setDiseaseHistory([]);
        if (result.error) {
          console.error('[MyTank] Failed to load disease history:', result.error);
        }
      }
    } catch (error) {
      console.error('[MyTank] Disease history exception:', error);
      setDiseaseHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Open history modal and load data
  const handleOpenDiseaseHistory = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDiseaseHistory(true);
    loadDiseaseHistory();
  };

  // View a specific disease check in detail
  const handleViewHistoryCheck = async (check: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedHistoryCheck(check);
    setShowDiseaseHistory(false);
  };

  const handleDiseaseDetectionPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check auth
    if (!session?.user?.id) {
      showToast('Please log in to use disease detection', 'error');
      return;
    }
    
    // Check if user has already used their free scan
    if (!isPremium && diseaseCheckCount >= 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('You\'ve used your free disease check. Upgrade for unlimited scans!', 'error');
      router.push('/onboarding/paywall');
      return;
    }
    
    // Show action sheet for photo selection
    setShowPhotoPickerSheet(true);
  };

  const onPickFromLibrary = async () => {
    console.log('[PickerDiag] pressed CAMERA_ROLL');
    console.log('[DiseaseScanUI] CAMERA_ROLL pressed');
    
    // Close the modal/sheet FIRST
    setShowPhotoPickerSheet(false);
    console.log('[PickerDiag] dismissed sheet');
    
    // Wait for modal close animation and UI to stabilize
    await new Promise(r => setTimeout(r, 350));
    
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[DiseaseScanUI] media perm', perm);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable Photos access in Settings to choose a photo.');
        return;
      }

      if (typeof ImagePicker.launchImageLibraryAsync !== 'function') {
        Alert.alert('Picker not available', 'expo-image-picker is missing from this runtime. Rebuild dev client or restart Expo Go.');
        return;
      }

      // Compatibility helper for mediaTypes
      const imagesOnly =
        // Newer SDKs
        (ImagePicker as any).MediaType?.Image
          ? [(ImagePicker as any).MediaType.Image]
          : // Older SDKs / Expo Go
            (ImagePicker as any).MediaTypeOptions?.Images
              ? (ImagePicker as any).MediaTypeOptions.Images
              : undefined;

      const launchOptions: any = {
        allowsEditing: false,
        quality: 0.8,
      };
      if (imagesOnly !== undefined) {
        launchOptions.mediaTypes = imagesOnly;
      }
      
      console.log('[PickerDiag] launching picker');
      const res = await ImagePicker.launchImageLibraryAsync(launchOptions);
      console.log('[PickerDiag] library returned', res);
      console.log('[DiseaseScanUI] library result', res);

      if (!isMounted.current) {
        console.log('[DiseaseScanUI] component unmounted, aborting');
        return;
      }

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) throw new Error('No image URI returned from library');

      setIsAnalyzing(true);
      setDetectionStage('uploading');
      setCurrentStepMessage('Uploading image...');
      setShowDiseaseDetectionModal(true);

      const scanResult = await runDiseaseScan({
        localUri: uri,
        tankId: selectedTankId || null,
        onStep: (step) => {
          setCurrentStepMessage(step);
          if (step.includes('Analyzing')) {
            setDetectionStage('analyzing');
          } else if (step.includes('complete') || step.includes('Complete')) {
            setDetectionStage('complete');
          } else if (step.includes('History')) {
            setDetectionStage('analyzing');
          }
        },
      });

      // Map new API result format to UI format
      const resultData = scanResult.result;
      const status = resultData.status || 'complete';

      // Handle timeout/processing case
      if (status === 'processing') {
        setIsAnalyzing(false);
        setShowDiseaseDetectionModal(false);
        showToast('Analysis is taking longer than expected. Check History in a moment.', 'warning');

        if (!isPremium) {
          incrementDiseaseCheck();
        }
        if (session?.user?.id) {
          loadDiseaseHistory();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      // Handle error case
      if (status === 'error') {
        setIsAnalyzing(false);
        setShowDiseaseDetectionModal(false);
        showToast(resultData.error || 'Analysis failed', 'error');

        if (session?.user?.id) {
          loadDiseaseHistory();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Success case
      setDiseaseAnalysisResult({
        id: scanResult.id,
        likelyIssue: resultData.likelyIssue || 'No issues detected',
        confidence: Math.round((resultData.confidence || 0) * 100),
        severity: resultData.severity || 'unknown',
        observations: resultData.observations || [],
        advice: resultData.advice || [],
        disclaimer: resultData.disclaimer || 'This is an AI analysis for educational purposes only.',
        imageUri: uri,
      });
      setIsAnalyzing(false);
      setDetectionStage('complete');

      if (!isPremium) {
        incrementDiseaseCheck();
      }

      if (session?.user?.id) {
        loadDiseaseHistory();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('[DiseaseScanUI] library error', e);
      Alert.alert('Photo error', e?.message ?? 'Failed to pick photo');
      setIsAnalyzing(false);
      setShowDiseaseDetectionModal(false);
    }
  };

  const onTakePhoto = async () => {
    console.log('[PickerDiag] pressed TAKE_PICTURE');
    console.log('[DiseaseScanUI] TAKE_PICTURE pressed');
    
    // Close the modal/sheet FIRST
    setShowPhotoPickerSheet(false);
    console.log('[PickerDiag] dismissed sheet');
    
    // Wait for modal close animation and UI to stabilize
    await new Promise(r => setTimeout(r, 350));
    
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[DiseaseScanUI] camera perm', perm);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Enable Camera access in Settings to take a photo.');
        return;
      }

      if (typeof ImagePicker.launchCameraAsync !== 'function') {
        Alert.alert('Picker not available', 'expo-image-picker is missing from this runtime. Rebuild dev client or restart Expo Go.');
        return;
      }

      console.log('[PickerDiag] launching picker');
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      console.log('[PickerDiag] camera returned', res);
      console.log('[DiseaseScanUI] camera result', res);

      if (!isMounted.current) {
        console.log('[DiseaseScanUI] component unmounted, aborting');
        return;
      }

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) throw new Error('No image URI returned from camera');

      setIsAnalyzing(true);
      setDetectionStage('uploading');
      setCurrentStepMessage('Uploading image...');
      setShowDiseaseDetectionModal(true);

      const scanResult = await runDiseaseScan({
        localUri: uri,
        tankId: selectedTankId || null,
        onStep: (step) => {
          setCurrentStepMessage(step);
          if (step.includes('Analyzing')) {
            setDetectionStage('analyzing');
          } else if (step.includes('complete') || step.includes('Complete')) {
            setDetectionStage('complete');
          } else if (step.includes('History')) {
            setDetectionStage('analyzing');
          }
        },
      });

      // Map new API result format to UI format
      const resultData = scanResult.result;
      const status = resultData.status || 'complete';

      // Handle timeout/processing case
      if (status === 'processing') {
        setIsAnalyzing(false);
        setShowDiseaseDetectionModal(false);
        showToast('Analysis is taking longer than expected. Check History in a moment.', 'warning');

        if (!isPremium) {
          incrementDiseaseCheck();
        }
        if (session?.user?.id) {
          loadDiseaseHistory();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      // Handle error case
      if (status === 'error') {
        setIsAnalyzing(false);
        setShowDiseaseDetectionModal(false);
        showToast(resultData.error || 'Analysis failed', 'error');

        if (session?.user?.id) {
          loadDiseaseHistory();
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Success case
      setDiseaseAnalysisResult({
        id: scanResult.id,
        likelyIssue: resultData.likelyIssue || 'No issues detected',
        confidence: Math.round((resultData.confidence || 0) * 100),
        severity: resultData.severity || 'unknown',
        observations: resultData.observations || [],
        advice: resultData.advice || [],
        disclaimer: resultData.disclaimer || 'This is an AI analysis for educational purposes only.',
        imageUri: uri,
      });
      setIsAnalyzing(false);
      setDetectionStage('complete');

      if (!isPremium) {
        incrementDiseaseCheck();
      }

      if (session?.user?.id) {
        loadDiseaseHistory();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('[DiseaseScanUI] camera error', e);
      Alert.alert('Camera error', e?.message ?? 'Failed to take photo');
      setIsAnalyzing(false);
      setShowDiseaseDetectionModal(false);
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

  const handleConfirmAddFish = async (tankId: string, quantity: number) => {
    if (!selectedSpeciesForAdd) return;
    
    // Get the actual tank being added to (could be different from selectedTank if multiple tanks)
    const targetTank = tanks.find(t => t.id === tankId);
    if (!targetTank) return;
    
    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (selectedSpeciesForAdd.waterType !== targetTank.waterType) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        `Cannot add ${selectedSpeciesForAdd.commonName}: ${selectedSpeciesForAdd.waterType} fish cannot be added to a ${targetTank.waterType} tank`,
        'error'
      );
      return;
    }
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Use the new batch add method
    addFishInstances(tankId, selectedSpeciesForAdd.id, quantity);
    
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
          {/* Tank Switcher */}
          <Animated.View entering={FadeInDown.duration(200)}>
            <TankSwitcher
              tanks={tanks}
              selectedTankId={selectedTankId}
              onSelectTank={selectTank}
              onCreateTank={handleCreateNewTank}
            />
          </Animated.View>

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
              <View 
                style={styles.tankViewer}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  if (width > 0 && height > 0) {
                    setTankContainerSize({ width, height });
                  }
                }}
              >
                {/* Tank glass effect */}
                <View style={styles.tankGlass}>
                  {/* Water */}
                  <View style={styles.tankWater} pointerEvents="box-none">
                    {/* Substrate layer - always visible */}
                    <SubstrateLayer
                      config={layout?.canvas?.substrate || DEFAULT_SUBSTRATE}
                      containerWidth={tankContainerSize.width}
                      containerHeight={tankContainerSize.height}
                    />
                    
                    {/* Aquascape items (behind fish) */}
                    {aquascapeItems
                      .sort((a, b) => a.z - b.z)
                      .map((item) => (
                        <AquascapeItem key={item.id} item={item} />
                      ))}
                    
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
              
              <View style={styles.diseaseButtonRow}>
                <Button
                  title="Scan for Diseases"
                  onPress={handleDiseaseDetectionPress}
                  variant="primary"
                  icon={<Camera size={20} color="#fff" />}
                  style={{ flex: 1 }}
                />
                {session?.user?.id && (
                  <TouchableOpacity 
                    style={styles.historyButton}
                    onPress={handleOpenDiseaseHistory}
                  >
                    <Text style={styles.historyButtonText}>History</Text>
                  </TouchableOpacity>
                )}
              </View>
              
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

          {/* Water Trends Chart */}
          {selectedTankId && (
            <Animated.View entering={FadeInDown.delay(225).duration(220)}>
              <WaterTrendsChart tankId={selectedTankId} />
            </Animated.View>
          )}

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
                {(() => {
                  // Group fish by species
                  const groupedFish = selectedTank.fishInstances.reduce((acc, instance) => {
                    const key = instance.speciesId;
                    if (!acc[key]) {
                      acc[key] = {
                        instances: [],
                        species: getSpeciesBySlugSync(instance.speciesId, instance),
                      };
                    }
                    acc[key].instances.push(instance);
                    return acc;
                  }, {} as Record<string, { instances: typeof selectedTank.fishInstances; species: ReturnType<typeof getSpeciesBySlugSync> }>);

                  return Object.values(groupedFish).map((group, index) => {
                    const species = group.species;
                    const count = group.instances.length;
                    const hasNicknames = group.instances.some(i => i.nickname);
                    
                    // If fish have individual nicknames, show them separately
                    if (hasNicknames) {
                      return group.instances.map((instance, subIndex) => (
                        <GlassCard 
                          key={instance.instanceId} 
                          style={styles.fishCard}
                          delay={450 + (index * group.instances.length + subIndex) * 50}
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
                      ));
                    }
                    
                    // Otherwise, show grouped with count
                    return (
                      <GlassCard 
                        key={group.instances[0].instanceId} 
                        style={styles.fishCard}
                        delay={450 + index * 50}
                        onPress={() => handleFishPress(group.instances[0].instanceId)}
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
                            {species?.commonName || 'Unknown Fish'}
                            {count > 1 && <Text style={styles.fishCountBadge}> x{count}</Text>}
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
                  });
                })()}
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
              {selectedSpecies.tempMin !== undefined && selectedSpecies.tempMax !== undefined && (
                <View style={styles.fishStatItem}>
                  <Text style={styles.fishStatLabel}>Temp</Text>
                  <Text style={styles.fishStatValue}>{selectedSpecies.tempMin}-{selectedSpecies.tempMax}°F</Text>
                </View>
              )}
              {selectedSpecies.phMin !== undefined && selectedSpecies.phMax !== undefined && (
                <View style={styles.fishStatItem}>
                  <Text style={styles.fishStatLabel}>pH</Text>
                  <Text style={styles.fishStatValue}>{selectedSpecies.phMin}-{selectedSpecies.phMax}</Text>
                </View>
              )}
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

            {(selectedSpecies.careNotesShort || selectedSpecies.careNotes) && (
              <View style={styles.fishDetailNotesContainer}>
                <Text style={styles.fishDetailNotesTitle}>Care Notes</Text>
                <Text style={styles.fishDetailNotes}>
                  {selectedSpecies.careNotesShort || selectedSpecies.careNotes}
                </Text>
              </View>
            )}

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
          tanks={[selectedTank]}
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
            <Text style={styles.analyzingText}>
              {currentStepMessage || 'Processing...'}
            </Text>
            <Text style={styles.analyzingSubtext}>
              {detectionStage === 'uploading' && 'Securing your image'}
              {detectionStage === 'analyzing' && 'AI is examining your fish'}
              {detectionStage === 'complete' && 'Finalizing results'}
            </Text>
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
              <Text style={styles.diseaseName}>{diseaseAnalysisResult.likelyIssue}</Text>
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
            {diseaseAnalysisResult.severity && (
              <Badge 
                label={`Severity: ${diseaseAnalysisResult.severity}`}
                variant={diseaseAnalysisResult.severity === 'Mild' || diseaseAnalysisResult.severity === 'None' ? 'success' : diseaseAnalysisResult.severity === 'Moderate' ? 'warning' : 'danger'}
              />
            )}

            {/* Observations */}
            {diseaseAnalysisResult.observations && diseaseAnalysisResult.observations.length > 0 && (
              <View style={styles.diseaseSection}>
                <Text style={styles.diseaseSectionTitle}>Observations</Text>
                {diseaseAnalysisResult.observations.map((observation: string, index: number) => (
                  <View key={index} style={styles.symptomItem}>
                    <Check size={16} color="#10B981" />
                    <Text style={styles.symptomText}>{observation}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Advice */}
            {diseaseAnalysisResult.advice && diseaseAnalysisResult.advice.length > 0 && (
              <View style={styles.diseaseSection}>
                <Text style={styles.diseaseSectionTitle}>Recommended Actions</Text>
                {diseaseAnalysisResult.advice.map((step: string, index: number) => (
                  <View key={index} style={styles.treatmentItem}>
                    <Text style={styles.treatmentNumber}>{index + 1}</Text>
                    <Text style={styles.treatmentText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Disclaimer */}
            {diseaseAnalysisResult.disclaimer && (
              <View style={styles.diseaseSection}>
                <Text style={styles.adviceText}>{diseaseAnalysisResult.disclaimer}</Text>
              </View>
            )}

            {/* Free User Notice */}
            {!isPremium && (
              <View style={styles.freeUserNotice}>
                <AlertCircle size={16} color="#4ECDC4" />
                <Text style={styles.freeUserNoticeText}>
                  This was your free disease check! Upgrade for unlimited scans and history.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.diseaseActionButtons}>
              <Button
                title="Close"
                onPress={() => {
                  setShowDiseaseDetectionModal(false);
                  setDiseaseAnalysisResult(null);
                }}
                variant="primary"
              />
            </View>
          </ScrollView>
        ) : null}
      </Modal>

      {/* Photo Picker Action Sheet */}
      <Modal
        visible={showPhotoPickerSheet}
        onClose={() => setShowPhotoPickerSheet(false)}
        title="Select Photo Source"
        size="small"
      >
        <View style={styles.photoPickerActions}>
          <TouchableOpacity
            style={styles.photoPickerButton}
            onPress={onTakePhoto}
          >
            <Camera size={24} color="#4ECDC4" />
            <Text style={styles.photoPickerButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoPickerButton}
            onPress={onPickFromLibrary}
          >
            <View style={styles.photoPickerIconContainer}>
              <Text style={styles.photoPickerIcon}>🖼️</Text>
            </View>
            <Text style={styles.photoPickerButtonText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Disease History Modal */}
      <Modal
        visible={showDiseaseHistory}
        onClose={() => setShowDiseaseHistory(false)}
        title="Disease Check History"
        size="large"
      >
        {/* Toggle for showing failed scans */}
        <View style={styles.historyToggleContainer}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFailedScans(!showFailedScans);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.historyToggleLabel}>Show failed scans</Text>
            <View style={[styles.historyToggleSwitch, showFailedScans && styles.historyToggleSwitchActive]}>
              <View style={[styles.historyToggleKnob, showFailedScans && styles.historyToggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {isLoadingHistory ? (
          <View style={styles.analyzingContainer}>
            <Text style={styles.analyzingText}>Loading history...</Text>
          </View>
        ) : diseaseHistory.length === 0 ? (
          <View style={styles.emptyHistoryContainer}>
            <Camera size={48} color="#94A3B8" />
            <Text style={styles.emptyHistoryText}>No disease checks yet</Text>
            <Text style={styles.emptyHistorySubtext}>
              Scan your fish to track their health over time
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.historyScrollView} showsVerticalScrollIndicator={false}>
            {diseaseHistory.map((check) => {
              const result = check.result || {};
              const status = check.status || result.status || 'processing';
              const relativeTime = getRelativeTime(check.created_at);
              const isFailed = status === 'failed';
              const errorMessage = check.error_message || result.error;
              
              // Calculate confidence as percentage if needed
              const confidencePercent = result.confidence 
                ? (result.confidence > 1 ? result.confidence : Math.round(result.confidence * 100))
                : null;

              return (
                <TouchableOpacity 
                  key={check.id} 
                  style={styles.historyItem}
                  onPress={() => handleViewHistoryCheck(check)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyItemHeader}>
                    <View style={styles.historyItemTitleRow}>
                      {status === 'processing' ? (
                        <View style={styles.processingBadge}>
                          <Text style={styles.processingBadgeText}>Processing...</Text>
                        </View>
                      ) : isFailed ? (
                        <Text style={styles.historyItemTitleError}>Failed</Text>
                      ) : status === 'error' ? (
                        <Text style={styles.historyItemTitleError}>Error</Text>
                      ) : (
                        <Text style={styles.historyItemTitle}>
                          {result.likelyIssue || 'No issues detected'}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.historyItemDate}>
                      {relativeTime}
                    </Text>
                  </View>
                  
                  {status === 'complete' && confidencePercent !== null && (
                    <View style={styles.historyItemRow}>
                      <Text style={styles.historyItemLabel}>Confidence:</Text>
                      <Text style={[
                        styles.historyItemValue,
                        { color: confidencePercent >= 80 ? '#10B981' : confidencePercent >= 60 ? '#FF9800' : '#EF4444' }
                      ]}>
                        {confidencePercent}%
                      </Text>
                    </View>
                  )}
                  
                  {status === 'complete' && result.severity && (
                    <View style={styles.historyItemRow}>
                      <Text style={styles.historyItemLabel}>Severity:</Text>
                      <Text style={[
                        styles.historyItemValue,
                        { color: result.severity === 'low' ? '#10B981' : result.severity === 'medium' ? '#FF9800' : result.severity === 'high' ? '#EF4444' : '#64748B' }
                      ]}>
                        {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
                      </Text>
                    </View>
                  )}
                  
                  {(isFailed || status === 'error') && errorMessage && (
                    <Text style={styles.historyItemError}>{errorMessage}</Text>
                  )}
                  
                  <View style={styles.historyItemTapHint}>
                    <Text style={styles.historyItemTapHintText}>Tap to view details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Modal>

      {/* Selected History Check Detail Modal */}
      {selectedHistoryCheck && (
        <Modal
          visible={!!selectedHistoryCheck}
          onClose={() => setSelectedHistoryCheck(null)}
          title="Disease Check Details"
          size="large"
        >
          <ScrollView style={styles.diseaseResultContent} showsVerticalScrollIndicator={false}>
            {(() => {
              const result = selectedHistoryCheck.result || {};
              const status = result.status || 'processing';
              const confidencePercent = result.confidence 
                ? (result.confidence > 1 ? result.confidence : Math.round(result.confidence * 100))
                : null;
              const checkDate = new Date(selectedHistoryCheck.created_at);
              const formattedDate = checkDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = checkDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              if (status === 'processing') {
                return (
                  <View style={styles.analyzingContainer}>
                    <MascotIcon variant="search" size={80} />
                    <Text style={styles.analyzingText}>Still Processing...</Text>
                    <Text style={styles.analyzingSubtext}>This scan is still being analyzed</Text>
                  </View>
                );
              }

              if (status === 'error') {
                return (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={64} color="#EF4444" />
                    <Text style={styles.errorTitle}>Analysis Failed</Text>
                    <Text style={styles.errorMessage}>
                      {result.error || 'An error occurred during analysis'}
                    </Text>
                    <Text style={styles.errorDate}>
                      {formattedDate} at {formattedTime}
                    </Text>
                  </View>
                );
              }

              return (
                <>
                  {/* Date/Time */}
                  <View style={styles.checkDateContainer}>
                    <Text style={styles.checkDateText}>
                      {formattedDate} at {formattedTime}
                    </Text>
                  </View>

                  {/* Disclaimer */}
                  <View style={styles.disclaimerBanner}>
                    <AlertCircle size={20} color="#FF9800" />
                    <Text style={styles.disclaimerText}>
                      This is an AI-powered analysis and not veterinary advice. Always consult a professional for diagnosis and treatment.
                    </Text>
                  </View>

                  {/* Disease Name & Confidence */}
                  <View style={styles.diseaseHeader}>
                    <Text style={styles.diseaseName}>
                      {result.likelyIssue || 'No issues detected'}
                    </Text>
                    {confidencePercent !== null && (
                      <View style={styles.confidenceContainer}>
                        <Text style={styles.confidenceLabel}>Confidence:</Text>
                        <Text style={[
                          styles.confidenceValue,
                          { color: confidencePercent >= 80 ? '#10B981' : confidencePercent >= 60 ? '#FF9800' : '#EF4444' }
                        ]}>
                          {confidencePercent}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Severity Badge */}
                  {result.severity && (
                    <Badge 
                      label={`Severity: ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}`}
                      variant={
                        result.severity === 'low' ? 'success' : 
                        result.severity === 'medium' ? 'warning' : 
                        result.severity === 'high' ? 'danger' : 
                        'default'
                      }
                    />
                  )}

                  {/* Observations */}
                  {result.observations && result.observations.length > 0 && (
                    <View style={styles.diseaseSection}>
                      <Text style={styles.diseaseSectionTitle}>Observations</Text>
                      {result.observations.map((observation: string, index: number) => (
                        <View key={index} style={styles.symptomItem}>
                          <Check size={16} color="#10B981" />
                          <Text style={styles.symptomText}>{observation}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Advice */}
                  {result.advice && result.advice.length > 0 && (
                    <View style={styles.diseaseSection}>
                      <Text style={styles.diseaseSectionTitle}>Recommended Actions</Text>
                      {result.advice.map((step: string, index: number) => (
                        <View key={index} style={styles.treatmentItem}>
                          <Text style={styles.treatmentNumber}>{index + 1}</Text>
                          <Text style={styles.treatmentText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Disclaimer */}
                  {result.disclaimer && (
                    <View style={styles.diseaseSection}>
                      <Text style={styles.adviceText}>{result.disclaimer}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.diseaseActionButtons}>
                    <Button
                      title="Close"
                      onPress={() => setSelectedHistoryCheck(null)}
                      variant="primary"
                    />
                  </View>
                </>
              );
            })()}
          </ScrollView>
        </Modal>
      )}
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
  aquascapeItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
  diseaseButtonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  historyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 115, 119, 0.3)',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
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
  adviceText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
  historyToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 115, 119, 0.1)',
    marginBottom: 8,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A252F',
  },
  historyToggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  historyToggleSwitchActive: {
    backgroundColor: '#0D7377',
  },
  historyToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  historyToggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  historyScrollView: {
    maxHeight: 500,
  },
  historyItem: {
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 115, 119, 0.1)',
  },
  historyItemHeader: {
    marginBottom: 8,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#64748B',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  historyItemLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 8,
  },
  historyItemValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  historyItemError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  historyItemAdvice: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
  },
  historyItemTitleRow: {
    marginBottom: 4,
  },
  historyItemTitleError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  processingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  processingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800',
  },
  historyItemTapHint: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  historyItemTapHintText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  checkDateContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  checkDateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorDate: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
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
  fishCountBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D7377',
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
  fishDetailNotesContainer: {
    marginTop: 12,
  },
  fishDetailNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
    marginBottom: 6,
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
  // Photo Picker Styles
  photoPickerActions: {
    gap: 12,
    paddingVertical: 8,
  },
  photoPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  photoPickerIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerIcon: {
    fontSize: 24,
  },
  photoPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D7377',
    flex: 1,
  },
  checkDateContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  checkDateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorDate: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
});
