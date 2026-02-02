import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeInDown,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import TankSwitcher from '@/components/tank/TankSwitcher';
import {
  getLatestAquascapeLayout,
  saveAquascapeLayout,
  AquascapeLayout,
  AquascapeLayoutItem,
} from '@/utils/aquascapeRemote';
import { normalizeLayout, ASSET_REGISTRY, getAsset } from '@/utils/aquascapeLayout';
import SubstrateLayer, { SubstrateType, getSubstrateTop, DEFAULT_SUBSTRATE } from '@/components/tank/SubstrateLayer';
import FloraSelectionSheet from '@/components/sheets/FloraSelectionSheet';
import HardscapeSelectionSheet from '@/components/sheets/HardscapeSelectionSheet';
import FishThumb from '@/components/FishThumb';
import { FloraItem } from '@/utils/floraCatalogAdapter';
import { HardscapeItem } from '@/utils/hardscapeCatalogAdapter';

import * as Haptics from 'expo-haptics';
import { useTheme } from '@/store/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate width accounting for ScrollView padding (20*2) and Card padding (16*2)
const CANVAS_WIDTH = SCREEN_WIDTH - 72;
const CANVAS_HEIGHT = 400;
const GRID_SIZE = 8;

// ===== Numeric Sanitizers =====
// Local worklet-safe versions for use in Reanimated contexts
function num(value: any, fallback: number): number {
  'worklet';
  const v = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(v) ? v : fallback;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

// Draggable item component with gesture-handler
function DraggableItem({
  item,
  canvasZoom,
  canvasPanX,
  canvasPanY,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  snapToGrid,
  placeOnSubstrate,
  substrateTop,
  canvasWidth,
  canvasHeight,
}: {
  item: AquascapeLayoutItem;
  canvasZoom: SharedValue<number>;
  canvasPanX: SharedValue<number>;
  canvasPanY: SharedValue<number>;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<AquascapeLayoutItem>) => void;
  onRemove: (id: string) => void;
  snapToGrid: boolean;
  placeOnSubstrate: boolean;
  substrateTop: number;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const { colors } = useTheme();
  // Initialize with sanitized values
  const translateX = useSharedValue(num(item.x, 0));
  const translateY = useSharedValue(num(item.y, 0));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Update position when item prop changes (from outside)
  useEffect(() => {
    translateX.value = num(item.x, 0);
    translateY.value = num(item.y, 0);
  }, [item.x, item.y]);

  const snap = (val: number) => {
    'worklet';
    if (snapToGrid) {
      const gridSafe = Math.max(1, num(GRID_SIZE, 12)); // Ensure grid size is never 0
      return Math.round(val / gridSafe) * gridSafe;
    }
    return val;
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      // Adjust for canvas zoom and pan (with guardrails)
      const zoomSafe = Math.max(0.1, num(canvasZoom.value, 1)); // Never divide by 0 or too-small zoom
      const dx = e.translationX / zoomSafe;
      const dy = e.translationY / zoomSafe;
      
      let newX = startX.value + dx;
      let newY = startY.value + dy;

      // Bounds check using measured canvas size (item size ~40)
      const itemSize = 40;
      newX = clamp(num(newX, 0), 0, Math.max(0, canvasWidth - itemSize));
      newY = clamp(num(newY, 0), 0, Math.max(0, canvasHeight - itemSize));

      translateX.value = newX;
      translateY.value = newY;
    })
    .onEnd(() => {
      isDragging.value = false;
      
      // Snap to grid if enabled
      let finalX = snapToGrid ? snap(translateX.value) : translateX.value;
      let finalY = snapToGrid ? snap(translateY.value) : translateY.value;
      
      // If placeOnSubstrate is ON, snap Y to substrate line
      if (placeOnSubstrate) {
        const itemSize = 40;
        finalY = substrateTop - itemSize;
      }
      
      translateX.value = withSpring(finalX);
      translateY.value = withSpring(finalY);

      runOnJS(onUpdate)(item.id, { x: finalX, y: finalY });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(onSelect)();
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
  });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    // Ensure all values are finite before returning
    const left = num(translateX.value, 0);
    const top = num(translateY.value, 0);
    const baseScale = num(item.scale, 1);
    const scaleValue = isDragging.value ? baseScale * 1.1 : baseScale;
    const rotation = num(item.rotation, 0);

    return {
      position: 'absolute',
      left,
      top,
      transform: [
        { scale: withSpring(num(scaleValue, 1)) },
        { rotate: `${rotation}deg` },
      ],
      zIndex: num(item.z, 0),
    };
  });

  const asset = getAsset(item.assetKey);

  // Check if this is a catalog item with an image
  const hasCatalogImage = !!item.catalogItemSlug && !!item.catalogItemType && !!item.assetKey;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.draggableItem,
            { backgroundColor: colors.card, borderColor: colors.border },
            isSelected && [styles.draggableItemSelected, { borderColor: colors.primary }],
          ]}
        >
          {hasCatalogImage ? (
            <FishThumb
              imageKey={item.assetKey}
              size={40}
              style={{ borderRadius: 8 }}
            />
          ) : (
            <Text style={[styles.itemEmoji, { color: colors.text }]}>{asset.emoji}</Text>
          )}
          {isSelected && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(item.id)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function AquascapeScreen() {
  const { colors, activeTheme } = useTheme();
  const { tanks, selectedTankId, selectTank } = useApp();
  const { session } = useAuth();
  const { showToast } = useToast();

  const selectedTank = tanks.find((t) => t.id === selectedTankId);

  const [layout, setLayout] = useState<AquascapeLayout>({
    canvas: { 
      w: CANVAS_WIDTH, 
      h: CANVAS_HEIGHT, 
      zoom: 1, 
      panX: 0, 
      panY: 0, 
      groundY: CANVAS_HEIGHT * 0.85,
      substrate: DEFAULT_SUBSTRATE,
    },
    items: [],
  });
  const [currentVersion, setCurrentVersion] = useState(0);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [placeOnSubstrate, setPlaceOnSubstrate] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [showFloraSheet, setShowFloraSheet] = useState(false);
  const [showHardscapeSheet, setShowHardscapeSheet] = useState(false);

  const canvasZoom = useSharedValue(1);
  const canvasPanX = useSharedValue(0);
  const canvasPanY = useSharedValue(0);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLayoutRef = useRef<string>('');

  // Load aquascape on mount or tank change
  useEffect(() => {
    if (!selectedTankId || !session?.user?.id) {
      return;
    }

    // Cancel any pending autosave when switching tanks
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Clear selected item when switching tanks
    setSelectedItemId(null);

    let mounted = true;

    async function loadAquascape() {
      setIsLoading(true);
      console.log(`[Aquascape] Loading layout for tank: ${selectedTankId.slice(0, 8)}... (${selectedTank?.name || 'Unknown'})`);

      const result = await getLatestAquascapeLayout(selectedTankId!, session!.user.id);

      if (!mounted) return;

      if (result.ok && result.layout) {
        // Normalize layout to ensure all values are finite numbers
        const normalized = normalizeLayout(result.layout, CANVAS_WIDTH, CANVAS_HEIGHT);
        setLayout(normalized);
        setCurrentVersion(result.version || 0);
        setLastSaved(result.createdAt || null);
        lastLayoutRef.current = JSON.stringify(normalized);
        
        // Update canvas shared values with sanitized values
        canvasZoom.value = normalized.canvas.zoom;
        canvasPanX.value = normalized.canvas.panX;
        canvasPanY.value = normalized.canvas.panY;
      } else if (result.ok && !result.layout) {
        // No layout yet, use default
        const defaultLayout: AquascapeLayout = {
          canvas: { 
            w: CANVAS_WIDTH, 
            h: CANVAS_HEIGHT, 
            zoom: 1, 
            panX: 0, 
            panY: 0, 
            groundY: CANVAS_HEIGHT * 0.85,
            substrate: DEFAULT_SUBSTRATE,
          },
          items: [],
        };
        setLayout(defaultLayout);
        lastLayoutRef.current = JSON.stringify(defaultLayout);
      } else {
        showToast('Failed to load aquascape', 'error');
      }

      setIsLoading(false);
    }

    loadAquascape();

    return () => {
      mounted = false;
    };
  }, [selectedTankId, session?.user?.id]);

  // Debounced autosave
  useEffect(() => {
    const currentLayoutStr = JSON.stringify(layout);
    
    if (currentLayoutStr === lastLayoutRef.current) {
      return; // No changes
    }

    // Don't autosave if no tank is selected or user not logged in
    if (!selectedTankId || !session?.user?.id) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(true); // autosave = true
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [layout, selectedTankId, session?.user?.id]);

  const handleSave = async (autosave = false) => {
    if (!selectedTankId || !session?.user?.id) {
      if (!autosave) {
        showToast('Please log in to save', 'error');
      }
      return;
    }

    console.log(`[Aquascape] Saving layout for tank: ${selectedTankId.slice(0, 8)}... (${selectedTank?.name || 'Unknown'})`);

    // Update canvas transform values in layout before saving (with sanitization)
    const updatedLayout = {
      ...layout,
      canvas: {
        ...layout.canvas,
        zoom: clamp(num(canvasZoom.value, 1), 0.1, 10),
        panX: num(canvasPanX.value, 0),
        panY: num(canvasPanY.value, 0),
      },
    };

    setIsSaving(true);
    if (!autosave) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const result = await saveAquascapeLayout(selectedTankId, session.user.id, updatedLayout);

    setIsSaving(false);

    if (result.ok) {
      setCurrentVersion(result.version || currentVersion + 1);
      setLastSaved(result.createdAt || new Date().toISOString());
      lastLayoutRef.current = JSON.stringify(updatedLayout);
      
      if (!autosave) {
        showToast('Layout saved!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      if (!autosave) {
        showToast('Failed to save layout', 'error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const addItem = (
    type: 'rock' | 'wood' | 'plant',
    assetKey: string,
    catalogItemSlug?: string,
    catalogItemType?: 'flora' | 'hardscape'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const maxZ = layout.items.length > 0 ? Math.max(...layout.items.map(i => num(i.z, 0))) : 0;
    
    // Calculate substrate top position
    const substrateHeightPct = layout.canvas.substrate?.heightPct || 0.16;
    const substrateTop = canvasSize.height * (1 - substrateHeightPct);
    const itemSize = 40;
    
    const newItem: AquascapeLayoutItem = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      assetKey,
      catalogItemSlug,
      catalogItemType,
      x: num(canvasSize.width / 2 - 20, 0),
      y: placeOnSubstrate ? num(substrateTop - itemSize, 0) : num(canvasSize.height / 2 - 20, 0),
      scale: 1,
      rotation: 0,
      z: num(maxZ + 1, 1),
    };
    
    setLayout((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const updateItem = (id: string, updates: Partial<AquascapeLayoutItem>) => {
    setLayout((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  };

  const removeItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLayout((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setSelectedItemId(null);
  };

  const bringToFront = (id: string) => {
    const maxZ = layout.items.length > 0 ? Math.max(...layout.items.map(i => num(i.z, 0))) : 0;
    updateItem(id, { z: num(maxZ + 1, 1) });
  };

  const handleFloraSelect = (flora: FloraItem) => {
    // Use imageKey from catalog as assetKey so FishThumb can display it
    addItem('plant', flora.imageKey || `flora-${flora.slug}`, flora.slug, 'flora');
    setShowFloraSheet(false);
  };

  const handleHardscapeSelect = (hardscape: HardscapeItem) => {
    const type = hardscape.itemType === 'rock' ? 'rock' : 'wood';
    // Use imageKey from catalog as assetKey so FishThumb can display it
    addItem(type, hardscape.imageKey || `hardscape-${hardscape.slug}`, hardscape.slug, 'hardscape');
    setShowHardscapeSheet(false);
  };

  const handleSubstrateChange = (type: SubstrateType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLayout(prev => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        substrate: {
          type,
          heightPct: prev.canvas.substrate?.heightPct || 0.16,
        },
      },
    }));
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLayout({
      canvas: { 
        w: CANVAS_WIDTH, 
        h: CANVAS_HEIGHT, 
        zoom: 1, 
        panX: 0, 
        panY: 0, 
        groundY: CANVAS_HEIGHT * 0.85,
        substrate: layout.canvas.substrate || DEFAULT_SUBSTRATE,
      },
      items: [],
    });
    setSelectedItemId(null);
    showToast('Canvas cleared', 'success');
  };

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const date = new Date(lastSaved);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!selectedTank) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyStateContainer}>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Tank Selected</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Create a tank first to design your aquascape
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Aquascape Designer</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Design your dream aquarium layout
                  </Text>
                  {selectedTank && (
                    <View style={[styles.waterTypeBadge, { 
                      backgroundColor: selectedTank.waterType === 'saltwater' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      borderColor: selectedTank.waterType === 'saltwater' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                    }]}>
                      <Text style={[styles.waterTypeText, { 
                        color: selectedTank.waterType === 'saltwater' ? '#3B82F6' : '#22C55E'
                      }]}>
                        {selectedTank.waterType === 'saltwater' ? '🌊 Saltwater' : '💧 Freshwater'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {isSaving && (
                <View style={[styles.savingIndicator, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                  <Text style={[styles.savingText, { color: colors.primary }]}>Saving...</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Tank Switcher */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)}>
            <TankSwitcher
              tanks={tanks}
              selectedTankId={selectedTankId}
              onSelectTank={selectTank}
            />
          </Animated.View>

          {/* Canvas */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <GlassCard style={styles.canvasCard}>
              <View style={styles.canvasHeader}>
                <Text style={[styles.canvasTitle, { color: colors.text }]}>Aquascape Editor</Text>
                <View style={styles.snapToggle}>
                  <Text style={[styles.snapLabel, { color: colors.textSecondary }]}>Snap</Text>
                  <Switch
                    value={snapToGrid}
                    onValueChange={setSnapToGrid}
                    trackColor={{ false: '#ddd', true: '#4ECDC4' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Substrate Selection */}
              <View style={styles.substrateSelector}>
                <Text style={[styles.substrateSelectorLabel, { color: colors.text }]}>Substrate:</Text>
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={styles.substrateScrollView}
                  contentContainerStyle={styles.substrateButtons}
                >
                  {[
                    { type: 'sand' as SubstrateType, label: 'Sand' },
                    { type: 'gravel' as SubstrateType, label: 'Gravel' },
                    { type: 'black_sand' as SubstrateType, label: 'Black Sand' },
                    { type: 'bare' as SubstrateType, label: 'Bare' },
                  ].map(({ type, label }) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.substrateButton,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        layout.canvas.substrate?.type === type && { borderColor: colors.primary, backgroundColor: activeTheme === 'dark' ? 'rgba(13, 115, 119, 0.3)' : 'rgba(13, 115, 119, 0.1)' },
                      ]}
                      onPress={() => handleSubstrateChange(type)}
                    >
                      <Text 
                        style={[
                          styles.substrateButtonText,
                          { color: colors.textSecondary },
                          layout.canvas.substrate?.type === type && { color: colors.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Snap to Substrate Toggle */}
              <View style={styles.placeOnSubstrateRow}>
                <View style={styles.placeOnSubstrateTextContainer}>
                  <Text style={[styles.placeOnSubstrateLabel, { color: colors.text }]}>Snap to substrate</Text>
                  <Text style={[styles.placeOnSubstrateHelper, { color: colors.textSecondary }]}>Items will rest naturally on the substrate</Text>
                </View>
                <Switch
                  value={placeOnSubstrate}
                  onValueChange={setPlaceOnSubstrate}
                  trackColor={{ false: '#ddd', true: '#4ECDC4' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.canvasContainer}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
                  </View>
                ) : (
                  <View 
                    style={[styles.canvas, { backgroundColor: activeTheme === 'dark' ? 'rgba(78, 205, 196, 0.05)' : 'rgba(78, 205, 196, 0.08)', borderColor: colors.border }]}
                    onLayout={(e) => {
                      const { width, height } = e.nativeEvent.layout;
                      if (width > 0 && height > 0 && (width !== canvasSize.width || height !== canvasSize.height)) {
                        setCanvasSize({ width, height });
                        console.log('[Aquascape] Canvas measured:', { width: width.toFixed(1), height: height.toFixed(1) });
                      }
                    }}
                  >
                    {/* Substrate layer */}
                    <SubstrateLayer
                      config={layout.canvas.substrate || DEFAULT_SUBSTRATE}
                      containerWidth={canvasSize.width}
                      containerHeight={canvasSize.height}
                    />
                    
                    {/* Grid background */}
                    {snapToGrid && (
                      <View style={styles.gridBackground} />
                    )}

                    {/* Items sorted by z-index */}
                    {(() => {
                      const substrateHeightPct = layout.canvas.substrate?.heightPct || 0.16;
                      const substrateTop = canvasSize.height * (1 - substrateHeightPct);
                      
                      return [...layout.items]
                        .sort((a, b) => a.z - b.z)
                        .map((item) => (
                          <DraggableItem
                            key={item.id}
                            item={item}
                            canvasZoom={canvasZoom}
                            canvasPanX={canvasPanX}
                            canvasPanY={canvasPanY}
                            isSelected={selectedItemId === item.id}
                            onSelect={() => {
                              setSelectedItemId(item.id);
                              bringToFront(item.id);
                            }}
                            onUpdate={updateItem}
                            onRemove={removeItem}
                            snapToGrid={snapToGrid}
                            placeOnSubstrate={placeOnSubstrate}
                            substrateTop={substrateTop}
                            canvasWidth={canvasSize.width}
                            canvasHeight={canvasSize.height}
                          />
                        ));
                    })()}

                    {/* Empty state */}
                    {layout.items.length === 0 && (
                      <View style={styles.canvasEmptyState}>
                        <Text style={[styles.canvasEmptyText, { color: colors.textSecondary }]}>
                          Tap buttons below to add items
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={[styles.canvasFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.lastSavedText, { color: colors.textSecondary }]}>
                  Last saved: {formatLastSaved()}
                </Text>
                <Text style={[styles.itemCountText, { color: colors.primary }]}>
                  {layout.items.length} items
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Palette */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <GlassCard style={styles.paletteCard}>
              <Text style={[styles.paletteTitle, { color: colors.text }]}>Add Items</Text>
              <View style={styles.paletteButtons}>
                <TouchableOpacity
                  style={[styles.paletteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowFloraSheet(true)}
                >
                  <Text style={styles.paletteEmoji}>🌿</Text>
                  <Text style={[styles.paletteLabel, { color: colors.text }]}>Plants/Coral</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paletteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowHardscapeSheet(true)}
                >
                  <Text style={styles.paletteEmoji}>🪨</Text>
                  <Text style={[styles.paletteLabel, { color: colors.text }]}>Decorations</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <View style={styles.actionButtons}>
              <Button
                title="Save Now"
                onPress={() => handleSave(false)}
                variant="primary"
                disabled={isSaving || !session?.user?.id}
                style={{ flex: 1 }}
              />
              <Button
                title="Clear"
                onPress={handleClear}
                variant="ghost"
                disabled={layout.items.length === 0}
              />
            </View>
          </Animated.View>

          {!session?.user?.id && (
            <Animated.View entering={FadeInDown.delay(250).duration(300)}>
              <GlassCard style={styles.noticeCard}>
                <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                  💡 Log in to save your designs
                </Text>
              </GlassCard>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Flora Selection Sheet */}
      <FloraSelectionSheet
        visible={showFloraSheet}
        onClose={() => setShowFloraSheet(false)}
        onSelect={handleFloraSelect}
      />

      {/* Hardscape Selection Sheet */}
      <HardscapeSelectionSheet
        visible={showHardscapeSheet}
        onClose={() => setShowHardscapeSheet(false)}
        onSelect={handleHardscapeSelect}
      />
    </GestureHandlerRootView>
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
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  waterTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  waterTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  savingIndicator: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savingText: {
    fontSize: 12,
    color: '#0D7377',
    fontWeight: '600',
  },
  canvasCard: {
    marginTop: 16,
    padding: 16,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A252F',
  },
  snapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snapLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  substrateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  substrateSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
  },
  substrateScrollView: {
    flex: 1,
  },
  substrateButtons: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12, // Add padding at the end so last button is not cut off
  },
  substrateButton: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(13, 115, 119, 0.2)',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  substrateButtonActive: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.15)',
  },
  substrateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  substrateButtonTextActive: {
    color: '#0D7377',
  },
  placeOnSubstrateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
  },
  placeOnSubstrateTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  placeOnSubstrateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  placeOnSubstrateHelper: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 14,
  },
  canvasContainer: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(13, 115, 119, 0.2)',
    position: 'relative',
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  canvasEmptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  draggableItem: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(13, 115, 119, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  draggableItemSelected: {
    borderColor: '#0D7377',
    borderWidth: 3,
    shadowOpacity: 0.3,
  },
  draggableItemDragging: {
    shadowOpacity: 0.5,
    elevation: 8,
  },
  itemEmoji: {
    fontSize: 24,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  canvasFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  lastSavedText: {
    fontSize: 12,
    color: '#64748B',
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D7377',
  },
  paletteCard: {
    marginTop: 16,
    padding: 16,
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 12,
  },
  paletteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paletteButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(13, 115, 119, 0.2)',
  },
  paletteEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  paletteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  noticeCard: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
