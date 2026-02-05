import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  Search, 
  Filter, 
  Leaf,
  Box,
  Wrench,
  AlertTriangle,
  Check,
  X
} from 'lucide-react-native';
import MascotIcon from '@/components/mascot/MascotIcon';
import FishThumb from '@/components/FishThumb';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Chip from '@/components/ui/Chip';
import Modal from '@/components/ui/Modal';
import AddToTankSheet from '@/components/sheets/AddToTankSheet';
import AddEquipmentToTankSheet from '@/components/sheets/AddEquipmentToTankSheet';
import { useMascot } from '@/components/mascot/MascotContext';
import { useApp } from '@/store/AppContext';
import { useUnitSettings } from '@/store/UnitSettingsContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies as mockFishSpecies, plants, equipment, decor, generateId } from '@/data/mockData';
import { FishSpecies, Tank, FishInstance } from '@/data/types';
import { FloraItem } from '@/utils/floraCatalogAdapter';
import { HardscapeItem } from '@/utils/hardscapeCatalogAdapter';
import { getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import { useFishCatalog, useFloraCatalog, useHardscapeCatalog, useEquipmentCatalog } from '@/hooks/useCatalogQueries';
import { addEquipmentToTank } from '@/utils/remoteEquipment';

import * as Haptics from 'expo-haptics';
import { useTheme } from '@/store/ThemeContext';

type CatalogTab = 'fish' | 'plants' | 'decor' | 'equipment';

const tabs: { id: CatalogTab; label: string; icon: any }[] = [
  { id: 'fish', label: 'Fish', icon: () => <MascotIcon variant="search" size={24} withHalo={false} /> },
  { id: 'plants', label: 'Plants/Corals', icon: Leaf },
  { id: 'decor', label: 'Decor', icon: Box },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
];

const temperamentFilters = ['peaceful', 'semi-aggressive', 'aggressive'];
const difficultyFilters = ['easy', 'medium', 'hard'];

export default function CatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tanks, selectedTankId, addFishToTank, addFishInstances, isPremium } = useApp();
  const { formatVolume, formatLength, volumeUnit, lengthUnit } = useUnitSettings();
  const { showToast } = useToast();

  const { showMascot, hideMascot } = useMascot();
  const { colors, activeTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<CatalogTab>('fish');

  // Check for tab parameter in URL to pre-select tab
  useEffect(() => {
    if (params.tab && typeof params.tab === 'string') {
      const tab = params.tab as CatalogTab;
      if (['fish', 'plants', 'decor', 'equipment'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [params.tab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemperament, setSelectedTemperament] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedWaterType, setSelectedWaterType] = useState<string[]>([]); // Water type filter
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpecies | null>(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [showAddToTankSheet, setShowAddToTankSheet] = useState(false);
  const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedFlora, setSelectedFlora] = useState<FloraItem | null>(null);
  const [showFloraModal, setShowFloraModal] = useState(false);
  const [selectedHardscape, setSelectedHardscape] = useState<HardscapeItem | null>(null);
  const [showHardscapeModal, setShowHardscapeModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showAddEquipmentSheet, setShowAddEquipmentSheet] = useState(false);

  const selectedTank = tanks.find(t => t.id === selectedTankId);

  // Determine waterType for database query (if exactly one type is selected)
  const dbWaterType = selectedWaterType.length === 1 
    ? (selectedWaterType[0] as 'freshwater' | 'saltwater' | 'brackish')
    : undefined;

  // React Query hooks for catalog data with automatic caching
  const { 
    data: fishCatalog = mockFishSpecies, 
    isLoading: isLoadingFish 
  } = useFishCatalog({ 
    search: searchQuery, 
    waterType: dbWaterType 
  });

  const { 
    data: floraCatalog = [], 
    isLoading: isLoadingFlora 
  } = useFloraCatalog({ 
    search: searchQuery, 
    waterType: dbWaterType,
    difficulty: selectedDifficulty.length === 1 ? selectedDifficulty[0] as 'easy' | 'medium' | 'hard' : undefined
  });

  const { 
    data: hardscapeCatalog = [], 
    isLoading: isLoadingHardscape 
  } = useHardscapeCatalog({ 
    search: searchQuery, 
    waterType: dbWaterType 
  });

  const { 
    data: equipmentCatalog = [], 
    isLoading: isLoadingEquipment 
  } = useEquipmentCatalog({ 
    search: searchQuery, 
    waterType: dbWaterType 
  });

  // Show search mascot on catalog screen briefly
  React.useEffect(() => {
    showMascot('search', 'top-right', 'Tap any fish to check compatibility!', 3000);
    return () => {
      hideMascot();
    };
  }, []);

  const filteredFish = useMemo(() => {
    return fishCatalog.filter(fish => {
      const matchesSearch = fish.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           fish.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTemperament = selectedTemperament.length === 0 || 
                                 selectedTemperament.includes(fish.temperament);
      const matchesDifficulty = selectedDifficulty.length === 0 || 
                                selectedDifficulty.includes(fish.difficulty);
      const matchesWaterType = selectedWaterType.length === 0 || 
                               selectedWaterType.includes(fish.waterType);
      return matchesSearch && matchesTemperament && matchesDifficulty && matchesWaterType;
    });
  }, [fishCatalog, searchQuery, selectedTemperament, selectedDifficulty, selectedWaterType]);

  const checkCompatibility = (species: FishSpecies, tank: Tank): string[] => {
    const warnings: string[] = [];

    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (species.waterType !== tank.waterType) {
      warnings.push(`Water type mismatch: ${species.commonName} is a ${species.waterType} fish and cannot be added to a ${tank.waterType} tank`);
      return warnings; // Return early - this is a hard blocker
    }

    if (tank.sizeGallons < species.minTankGallons) {
      warnings.push(`Tank too small: ${species.commonName} needs at least ${species.minTankGallons} gallons`);
    }

    const existingFish = tank.fishInstances
      .map((f: FishInstance) => getSpeciesBySlugSync(f.speciesId, f))
      .filter(Boolean) as FishSpecies[];

    // Track temperament conflicts to avoid duplicates
    const conflictingTemperaments = new Set<string>();
    
    for (const existing of existingFish) {
      const conflictKey = `${species.temperament}-${existing.temperament}`;
      const reverseConflictKey = `${existing.temperament}-${species.temperament}`;
      
      if ((species.temperament === 'aggressive' && existing.temperament === 'peaceful') ||
          (species.temperament === 'peaceful' && existing.temperament === 'aggressive')) {
        // Only add warning if we haven't already warned about this temperament combination
        if (!conflictingTemperaments.has(conflictKey) && !conflictingTemperaments.has(reverseConflictKey)) {
          warnings.push(`Temperament conflict: ${species.commonName} (${species.temperament}) may not do well with ${existing.temperament} fish in the tank`);
          conflictingTemperaments.add(conflictKey);
        }
      }
    }

    if (species.schooling && species.recommendedGroupSize > 1) {
      warnings.push(`${species.commonName} is a schooling fish and should be kept in groups of ${species.recommendedGroupSize}+`);
    }

    const currentBioload = existingFish.reduce((acc, f) => acc + f.adultSizeInches, 0);
    const newBioload = currentBioload + species.adultSizeInches;
    const maxBioload = tank.sizeGallons * 1.2;
    
    if (newBioload > maxBioload) {
      warnings.push(`Overstocking risk: Adding ${species.commonName} would exceed recommended bioload`);
    }

    return warnings;
  };

  const handleSelectSpecies = async (species: FishSpecies) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSpecies(species);
    setShowCompatibilityModal(true);
  };

  const handleAddToTank = async () => {
    if (!selectedSpecies) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if user has premium before allowing to add fish
    if (!isPremium) {
      setShowCompatibilityModal(false);
      setShowPaywall(true);
      return;
    }

    // Check if user has any tanks
    if (tanks.length === 0) {
      showToast('Create a tank first to add fish', 'error');
      return;
    }

    // Close browsing modal and open AddToTankSheet (user will select tank there)
    setShowCompatibilityModal(false);
    setShowAddToTankSheet(true);
  };

  const handleConfirmAddEquipment = async (tankId: string, status: 'installed' | 'wishlist') => {
    if (!selectedEquipment) return;

    try {
      const result = await addEquipmentToTank(tankId, selectedEquipment.id, status);
      
      if (result.error) {
        showToast(`Failed to add equipment: ${result.error.message}`, 'error');
        return;
      }

      showToast(
        `${selectedEquipment.brand} ${selectedEquipment.model} added to ${status === 'installed' ? 'tank' : 'wishlist'}!`,
        'success'
      );
      
      setShowAddEquipmentSheet(false);
      setSelectedEquipment(null);
    } catch (error) {
      console.error('Error adding equipment:', error);
      showToast('Failed to add equipment', 'error');
    }
  };

  const handleConfirmAddFish = async (tankId: string, quantity: number) => {
    if (!selectedSpecies) return;
    
    const targetTank = tanks.find(t => t.id === tankId);
    if (!targetTank) return;

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Use the new batch add method
    addFishInstances(tankId, selectedSpecies.id, quantity);

    setShowAddToTankSheet(false);
    setSelectedSpecies(null);
    
    const plural = quantity > 1 ? `${quantity} ${selectedSpecies.commonName}` : selectedSpecies.commonName;
    showToast(`${plural} added to ${targetTank.name}!`, 'success');
  };

  const toggleFilter = (type: 'temperament' | 'difficulty' | 'waterType', value: string) => {
    if (type === 'temperament') {
      setSelectedTemperament(prev => 
        prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
      );
    } else if (type === 'difficulty') {
      setSelectedDifficulty(prev => 
        prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
      );
    } else if (type === 'waterType') {
      setSelectedWaterType(prev => 
        prev.includes(value) ? prev.filter(w => w !== value) : [...prev, value]
      );
    }
  };

  const clearFilters = () => {
    setSelectedTemperament([]);
    setSelectedDifficulty([]);
    setSelectedWaterType([]);
  };

  const activeFiltersCount = selectedTemperament.length + selectedDifficulty.length + selectedWaterType.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Catalog</Text>
          <View style={[styles.tankBadge, { backgroundColor: colors.tankBackground, borderColor: colors.border }]}>
            <Text style={[styles.tankBadgeText, { color: colors.textSecondary }]}>for {selectedTank?.name}</Text>
          </View>
        </Animated.View>

        {/* Tab Selector */}
        <Animated.View entering={FadeInDown.delay(100).duration(220)} style={styles.tabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContent}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    !isActive && { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  {tab.id === 'fish' ? (
                     <MascotIcon variant="search" size={20} withHalo={false} />
                  ) : (
                    <Icon size={20} color={isActive ? '#FFF' : colors.textSecondary} />
                  )}
                  <Text style={[
                    styles.tabLabel,
                    isActive && styles.activeTabLabel,
                    !isActive && { color: colors.textSecondary }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              showFilters && { backgroundColor: colors.primary, borderColor: colors.primary },
              !showFilters && { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? '#FFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'fish' && (
            <>

              <View style={styles.fishGrid}>
                {filteredFish.map((fish, index) => {
                  const hasImage = (fish as any).image_key || (fish as any).imageKey;
                  
                  return (
                  <Animated.View
                    key={fish.id}
                      entering={FadeInDown.delay(180 + index * 30).duration(240)}
                    style={{ width: '48%' }}
                  >
                    <GlassCard 
                      style={styles.fishCard}
                      onPress={() => handleSelectSpecies(fish)}
                      animated={false}
                    >
                        {hasImage ? (
                          <View style={styles.fishCardIcon}>
                            <FishThumb imageKey={(fish as any).image_key ?? (fish as any).imageKey ?? null} size={44} />
                          </View>
                        ) : (
                      <View style={[styles.fishCardIcon, { backgroundColor: fish.color }]}>
                        <Text style={{ fontSize: 28 }}>🐠</Text>
                      </View>
                        )}
                      <Text style={[styles.fishCardName, { color: colors.text }]} numberOfLines={1}>
                        {fish.commonName}
                      </Text>
                      <Text style={[styles.fishCardScientific, { color: colors.textSecondary }]} numberOfLines={1}>
                        {fish.scientificName}
                      </Text>
                      <View style={styles.fishCardBadges}>
                        <Badge 
                          label={fish.difficulty} 
                          variant={fish.difficulty === 'easy' ? 'success' : fish.difficulty === 'medium' ? 'warning' : 'danger'}
                          size="small"
                        />
                        <Text style={[styles.fishCardSize, { color: colors.textSecondary }]}>{formatVolume(fish.minTankGallons)}+</Text>
                      </View>
                    </GlassCard>
                  </Animated.View>
                  );
                })}
              </View>

              {filteredFish.length === 0 && (
                <View style={styles.emptyState}>
                  <MascotIcon variant="search" size={80} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No fish found</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Try adjusting your filters or search</Text>
                  {activeFiltersCount > 0 && (
                    <Button 
                      title="Clear Filters" 
                      onPress={clearFilters}
                      variant="outline"
                      size="small"
                    />
                  )}
                </View>
              )}
            </>
          )}

          {activeTab === 'plants' && (
            <>
              <View style={styles.fishGrid}>
                {floraCatalog.map((flora, index) => {
                  return (
                    <Animated.View
                      key={flora.id}
                      entering={FadeInDown.delay(180 + index * 30).duration(240)}
                      style={{ width: '48%' }}
                    >
                      <GlassCard 
                        style={styles.fishCard} 
                        animated={false}
                        onPress={() => {
                          setSelectedFlora(flora);
                          setShowFloraModal(true);
                        }}
                      >
                        <View style={styles.fishCardIcon}>
                          <FishThumb imageKey={flora.imageKey ?? null} size={44} />
                        </View>
                        <Text style={[styles.fishCardName, { color: colors.text }]} numberOfLines={1}>
                          {flora.commonName}
                        </Text>
                        <Text style={[styles.fishCardScientific, { color: colors.textSecondary }]} numberOfLines={1}>
                          {flora.scientificName || flora.waterType}
                        </Text>
                        <View style={styles.fishCardBadges}>
                          <Badge 
                            label={flora.difficulty} 
                            variant={flora.difficulty === 'easy' ? 'success' : flora.difficulty === 'medium' ? 'warning' : 'danger'}
                            size="small"
                          />
                          {flora.lightRequirement && (
                            <Text style={[styles.fishCardSize, { color: colors.textSecondary }]}>{flora.lightRequirement} light</Text>
                          )}
                        </View>
                      </GlassCard>
                    </Animated.View>
                  );
                })}
              </View>

              {floraCatalog.length === 0 && !isLoadingFlora && (
                <View style={styles.emptyState}>
                  <Leaf size={80} color="#64748B" />
                  <Text style={styles.emptyTitle}>No plants or corals found</Text>
                  <Text style={styles.emptyText}>Try adjusting your filters or search</Text>
                  {activeFiltersCount > 0 && (
                    <Button 
                      title="Clear Filters" 
                      onPress={clearFilters}
                      variant="outline"
                      size="small"
                    />
                  )}
                </View>
              )}
            </>
          )}

          {activeTab === 'equipment' && (
            <View style={styles.fishGrid}>
              {equipmentCatalog.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(180 + index * 30).duration(240)}
                  style={{ width: '48%' }}
                >
                  <GlassCard 
                    style={styles.fishCard} 
                    animated={false}
                    onPress={() => {
                      setSelectedEquipment(item);
                      setShowEquipmentModal(true);
                    }}
                  >
                    <View style={[styles.fishCardIcon, { backgroundColor: '#64748B' }]}>
                      <Wrench size={28} color="#fff" />
                    </View>
                    <Text style={[styles.fishCardName, { color: colors.text }]} numberOfLines={1}>
                      {item.brand}
                    </Text>
                    <Text style={[styles.fishCardScientific, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.model}
                    </Text>
                    <Badge label={item.category} variant="default" size="small" />
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          )}

          {activeTab === 'decor' && (
            <>
              <View style={styles.fishGrid}>
                {hardscapeCatalog.map((item, index) => {
                  // Debug: log the image key to console
                  if (__DEV__ && index === 0) {
                    console.log('[Catalog Decor] First item imageKey:', item.imageKey);
                  }
                  
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay(180 + index * 30).duration(240)}
                      style={{ width: '48%' }}
                    >
                      <GlassCard 
                        style={styles.fishCard} 
                        animated={false}
                        onPress={() => {
                          setSelectedHardscape(item);
                          setShowHardscapeModal(true);
                        }}
                      >
                        <View style={styles.fishCardIcon}>
                          <FishThumb imageKey={item.imageKey ?? null} size={44} />
                        </View>
                        <Text style={[styles.fishCardName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.fishCardScientific, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.material || item.itemType}
                        </Text>
                        <Badge label={item.itemType} variant="default" size="small" />
                      </GlassCard>
                    </Animated.View>
                  );
                })}
              </View>

              {hardscapeCatalog.length === 0 && !isLoadingHardscape && (
                <View style={styles.emptyState}>
                  <Box size={80} color="#64748B" />
                  <Text style={styles.emptyTitle}>No decorations found</Text>
                  <Text style={styles.emptyText}>Try adjusting your filters or search</Text>
                  {activeFiltersCount > 0 && (
                    <Button 
                      title="Clear Filters" 
                      onPress={clearFilters}
                      variant="outline"
                      size="small"
                    />
                  )}
                </View>
              )}
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title={`Filter ${activeTab === 'fish' ? 'Fish' : activeTab === 'plants' ? 'Plants' : activeTab === 'decor' ? 'Decor' : 'Equipment'}`}
        size="medium"
      >
        <View style={styles.filterContent}>
          {/* Water Type - Show for all tabs */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Water Type</Text>
            <View style={styles.filterChips}>
              <Chip
                label="Freshwater"
                selected={selectedWaterType.includes('freshwater')}
                onPress={() => toggleFilter('waterType', 'freshwater')}
              />
              <Chip
                label="Saltwater"
                selected={selectedWaterType.includes('saltwater')}
                onPress={() => toggleFilter('waterType', 'saltwater')}
              />
              {activeTab === 'fish' && (
                <Chip
                  label="Brackish"
                  selected={selectedWaterType.includes('brackish')}
                  onPress={() => toggleFilter('waterType', 'brackish')}
                />
              )}
            </View>
          </View>

          {/* Temperament - Only for Fish */}
          {activeTab === 'fish' && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Temperament</Text>
              <View style={styles.filterChips}>
                {temperamentFilters.map(temp => (
                  <Chip
                    key={temp}
                    label={temp}
                    selected={selectedTemperament.includes(temp)}
                    onPress={() => toggleFilter('temperament', temp)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Difficulty - For Fish and Plants */}
          {(activeTab === 'fish' || activeTab === 'plants') && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Difficulty</Text>
              <View style={styles.filterChips}>
                {difficultyFilters.map(diff => (
                  <Chip
                    key={diff}
                    label={diff}
                    selected={selectedDifficulty.includes(diff)}
                    onPress={() => toggleFilter('difficulty', diff)}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.filterActions}>
            <Button
              title="Clear All"
              onPress={clearFilters}
              variant="ghost"
            />
            <Button
              title="Apply Filters"
              onPress={() => setShowFilters(false)}
              variant="primary"
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCompatibilityModal}
        onClose={() => {
          setShowCompatibilityModal(false);
          setSelectedSpecies(null);
        }}
        title="Fish Details"
        size="full"
      >
        {selectedSpecies && (() => {
          const hasImage = (selectedSpecies as any).image_key || (selectedSpecies as any).imageKey;
          
          return (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
                {hasImage ? (
                  <View style={styles.compatibilityIcon}>
                    <FishThumb imageKey={(selectedSpecies as any).image_key ?? (selectedSpecies as any).imageKey ?? null} size={72} />
                  </View>
                ) : (
              <View style={[styles.compatibilityIcon, { backgroundColor: selectedSpecies.color }]}>
                <Text style={{ fontSize: 36 }}>🐠</Text>
              </View>
                )}
              <View style={styles.compatibilityInfo}>
                <Text style={[styles.compatibilityName, { color: colors.text }]}>{selectedSpecies.commonName}</Text>
                <Text style={[styles.compatibilityScientific, { color: colors.textSecondary }]}>{selectedSpecies.scientificName}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Min Tank</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{formatVolume(selectedSpecies.minTankGallons)}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Adult Size</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{formatLength(selectedSpecies.adultSizeInches)}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Temperament</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedSpecies.temperament}</Text>
              </View>
              {selectedSpecies.tempMin !== undefined && selectedSpecies.tempMax !== undefined && (
                <View style={styles.compatibilityStat}>
                  <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Temp Range</Text>
                  <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedSpecies.tempMin}-{selectedSpecies.tempMax}°F</Text>
                </View>
              )}
              {selectedSpecies.phMin !== undefined && selectedSpecies.phMax !== undefined && (
                <View style={styles.compatibilityStat}>
                  <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>pH Range</Text>
                  <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedSpecies.phMin}-{selectedSpecies.phMax}</Text>
                </View>
              )}
            </View>

            <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Care Notes</Text>
              <Text style={[styles.careNotesText, { color: colors.text }]}>{selectedSpecies.careNotes}</Text>
            </View>

            <View style={styles.compatibilityActions}>
              {tanks.length === 0 ? (
                <Text style={styles.noTankText}>Create a tank first to add fish</Text>
              ) : (
                <Button
                  title="Add to Tank"
                  onPress={handleAddToTank}
                  variant="primary"
                  fullWidth
                />
              )}
            </View>
          </View>
          );
        })()}
      </Modal>

      {/* Add To Tank Sheet */}
      {selectedSpecies && tanks.length > 0 && (
        <AddToTankSheet
          visible={showAddToTankSheet}
          onClose={() => {
            setShowAddToTankSheet(false);
            setSelectedSpecies(null);
          }}
          species={selectedSpecies}
          tanks={tanks}
          onConfirm={handleConfirmAddFish}
        />
      )}

      {/* Add Equipment To Tank Sheet */}
      {selectedEquipment && tanks.length > 0 && (
        <AddEquipmentToTankSheet
          visible={showAddEquipmentSheet}
          onClose={() => {
            setShowAddEquipmentSheet(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
          tanks={tanks}
          onConfirm={handleConfirmAddEquipment}
        />
      )}

      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Premium Required"
        size="medium"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 15, color: '#2C3E50', lineHeight: 22 }}>
            Adding fish to your tank requires a premium subscription. Upgrade now to unlock:
          </Text>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 14, color: '#2C3E50' }}>• Add unlimited fish to your tanks</Text>
            <Text style={{ fontSize: 14, color: '#2C3E50' }}>• Disease detection with history</Text>
            <Text style={{ fontSize: 14, color: '#2C3E50' }}>• Advanced water quality tracking</Text>
            <Text style={{ fontSize: 14, color: '#2C3E50' }}>• Priority support</Text>
          </View>
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button
              title="Start Free Trial"
              onPress={() => {
                setShowPaywall(false);
                router.push('/onboarding/paywall');
              }}
              variant="primary"
              fullWidth
            />
            <Button
              title="Maybe Later"
              onPress={() => setShowPaywall(false)}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Flora Detail Modal */}
      <Modal
        visible={showFloraModal}
        onClose={() => {
          setShowFloraModal(false);
          setSelectedFlora(null);
        }}
        title="Plant/Coral Details"
        size="full"
      >
        {selectedFlora && (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
              <View style={styles.compatibilityIcon}>
                <FishThumb imageKey={selectedFlora.imageKey ?? null} size={72} />
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={[styles.compatibilityName, { color: colors.text }]}>{selectedFlora.commonName}</Text>
                <Text style={[styles.compatibilityScientific, { color: colors.textSecondary }]}>{selectedFlora.scientificName || selectedFlora.waterType}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Water Type</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedFlora.waterType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Difficulty</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedFlora.difficulty}</Text>
              </View>
              {selectedFlora.lightRequirement && (
                <View style={styles.compatibilityStat}>
                  <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Light</Text>
                  <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedFlora.lightRequirement}</Text>
                </View>
              )}
            </View>

            {selectedFlora.careNotes && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Care Notes</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>{selectedFlora.careNotes}</Text>
              </View>
            )}

            {selectedFlora.placement && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Placement</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>Best suited for {selectedFlora.placement} areas of the aquarium.</Text>
              </View>
            )}

            {selectedFlora.growthRate && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Growth Rate</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>Grows at a {selectedFlora.growthRate} pace.</Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Hardscape Detail Modal */}
      <Modal
        visible={showHardscapeModal}
        onClose={() => {
          setShowHardscapeModal(false);
          setSelectedHardscape(null);
        }}
        title="Decoration Details"
        size="full"
      >
        {selectedHardscape && (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
              <View style={styles.compatibilityIcon}>
                <FishThumb imageKey={selectedHardscape.imageKey ?? null} size={72} />
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={[styles.compatibilityName, { color: colors.text }]}>{selectedHardscape.name}</Text>
                <Text style={[styles.compatibilityScientific, { color: colors.textSecondary }]}>{selectedHardscape.material || selectedHardscape.itemType}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedHardscape.itemType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Water Type</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedHardscape.waterType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Water Chemistry</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>
                  {selectedHardscape.affectsWaterChemistry ? 'Affects' : 'Inert'}
                </Text>
              </View>
            </View>

            {selectedHardscape.description && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Description</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>{selectedHardscape.description}</Text>
              </View>
            )}

            {selectedHardscape.careNotes && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Care Notes</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>{selectedHardscape.careNotes}</Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Equipment Detail Modal */}
      <Modal
        visible={showEquipmentModal}
        onClose={() => {
          setShowEquipmentModal(false);
          setSelectedEquipment(null);
        }}
        title="Equipment Details"
        size="full"
      >
        {selectedEquipment && (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
              <View style={[styles.compatibilityIcon, { backgroundColor: '#64748B' }]}>
                <Wrench size={48} color="#fff" />
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={[styles.compatibilityName, { color: colors.text }]}>{selectedEquipment.brand}</Text>
                <Text style={[styles.compatibilityScientific, { color: colors.textSecondary }]}>{selectedEquipment.model}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Category</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>
                  {selectedEquipment.category.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Water Type</Text>
                <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>
                  {selectedEquipment.waterType === 'both' ? 'Freshwater & Saltwater' : selectedEquipment.waterType}
                </Text>
              </View>
              {(selectedEquipment.minTankGal || selectedEquipment.maxTankGal) && (
                <View style={styles.compatibilityStat}>
                  <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Tank Size</Text>
                  <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>
                    {selectedEquipment.minTankGal || '?'}-{selectedEquipment.maxTankGal || '?'} gal
                  </Text>
                </View>
              )}
            </View>

            {/* Specs Row */}
            {(selectedEquipment.wattage || selectedEquipment.flowGph) && (
              <View style={styles.compatibilityStats}>
                {selectedEquipment.wattage && (
                  <View style={styles.compatibilityStat}>
                    <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Power</Text>
                    <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedEquipment.wattage}W</Text>
                  </View>
                )}
                {selectedEquipment.flowGph && (
                  <View style={styles.compatibilityStat}>
                    <Text style={[styles.compatibilityStatLabel, { color: colors.textSecondary }]}>Flow Rate</Text>
                    <Text style={[styles.compatibilityStatValue, { color: colors.text }]}>{selectedEquipment.flowGph} GPH</Text>
                  </View>
                )}
              </View>
            )}

            {/* Description */}
            {selectedEquipment.description && (
              <View style={[styles.careNotesContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.careNotesTitle, { color: colors.primary }]}>Description</Text>
                <Text style={[styles.careNotesText, { color: colors.text }]}>{selectedEquipment.description}</Text>
              </View>
            )}

            {/* Pros */}
            {selectedEquipment.pros && (
              <View style={[styles.careNotesContainer, { backgroundColor: activeTheme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4' }]}>
                <Text style={[styles.careNotesTitle, { color: activeTheme === 'dark' ? '#4ADE80' : '#166534' }]}>Pros</Text>
                <Text style={[styles.careNotesText, { color: activeTheme === 'dark' ? '#4ADE80' : '#15803D' }]}>{selectedEquipment.pros}</Text>
              </View>
            )}

            {/* Cons */}
            {selectedEquipment.cons && (
              <View style={[styles.careNotesContainer, { backgroundColor: activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Text style={[styles.careNotesTitle, { color: activeTheme === 'dark' ? '#F87171' : '#991B1B' }]}>Cons</Text>
                <Text style={[styles.careNotesText, { color: activeTheme === 'dark' ? '#F87171' : '#DC2626' }]}>{selectedEquipment.cons}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ gap: 12 }}>
              {/* Add to Tank Button */}
              <Button
                title="Add to Tank"
                onPress={() => {
                  setShowEquipmentModal(false);
                  setShowAddEquipmentSheet(true);
                }}
                variant="primary"
                fullWidth
              />

              {/* Buy Button */}
              {(selectedEquipment.affiliateUrl || selectedEquipment.officialUrl) && (
                <Button
                  title="Buy Now"
                  onPress={() => {
                    const url = selectedEquipment.affiliateUrl || selectedEquipment.officialUrl;
                    if (url) {
                      // Open URL in browser
                      console.log('[Equipment] Opening URL:', url);
                    }
                  }}
                  variant="outline"
                  fullWidth
                />
              )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#0D7377',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  tabsContainer: {
    paddingBottom: 12,
  },
  tabs: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#0D7377',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  mascotHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  mascotHintText: {
    flex: 1,
    fontSize: 13,
    color: '#0D7377',
    lineHeight: 18,
  },
  fishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  fishCard: {
    padding: 12,
    alignItems: 'center',
  },
  fishCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  fishCardName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  fishCardScientific: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  fishCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fishCardSize: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 20,
  },
  filterContent: {
    gap: 24,
  },
  filterSection: {},
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  compatibilityContent: {
    gap: 16,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compatibilityIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  compatibilityInfo: {
    flex: 1,
  },
  compatibilityName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  compatibilityScientific: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  compatibilityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',

    borderRadius: 12,
    paddingVertical: 14,
  },
  compatibilityStat: {
    alignItems: 'center',
  },
  compatibilityStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  compatibilityStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A252F',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  warningsContainer: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  warningsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
  },
  warningItem: {
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  compatibleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  compatibleText: {
    flex: 1,
    fontSize: 14,
    color: '#0D7377',
    fontWeight: '500',
  },
  careNotesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 14,
  },
  careNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 6,
  },
  careNotesText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  compatibilityActions: {
    marginTop: 4,
  },
  noTankText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addAnywayNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  tankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
  },
  tankBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    paddingBottom: 12,
  },
  tabContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  activeTabLabel: {
    color: '#fff',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
    height: 48,
  },
  filtersPanel: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
});