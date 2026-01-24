import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
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
import { useMascot } from '@/components/mascot/MascotContext';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies as mockFishSpecies, plants, equipment, decor, generateId } from '@/data/mockData';
import { FishSpecies } from '@/data/types';
import { getFishCatalog } from '@/utils/fishCatalogAdapter';
import { getFloraCatalog, FloraItem } from '@/utils/floraCatalogAdapter';
import { getHardscapeCatalog, HardscapeItem } from '@/utils/hardscapeCatalogAdapter';
import { getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import * as Haptics from 'expo-haptics';

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
  const { tanks, selectedTankId, addFishToTank, addFishInstances, isPremium } = useApp();
  const { showToast } = useToast();
  const { showMascot, hideMascot } = useMascot();
  
  const [activeTab, setActiveTab] = useState<CatalogTab>('fish');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemperament, setSelectedTemperament] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedWaterType, setSelectedWaterType] = useState<string[]>([]); // NEW: Water type filter
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpecies | null>(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [showAddToTankSheet, setShowAddToTankSheet] = useState(false);
  const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>([]);
  const [fishCatalog, setFishCatalog] = useState<FishSpecies[]>(mockFishSpecies);
  const [isLoadingFish, setIsLoadingFish] = useState(false);
  const [floraCatalog, setFloraCatalog] = useState<FloraItem[]>([]);
  const [isLoadingFlora, setIsLoadingFlora] = useState(false);
  const [hardscapeCatalog, setHardscapeCatalog] = useState<HardscapeItem[]>([]);
  const [isLoadingHardscape, setIsLoadingHardscape] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedFlora, setSelectedFlora] = useState<FloraItem | null>(null);
  const [showFloraModal, setShowFloraModal] = useState(false);
  const [selectedHardscape, setSelectedHardscape] = useState<HardscapeItem | null>(null);
  const [showHardscapeModal, setShowHardscapeModal] = useState(false);

  const selectedTank = tanks.find(t => t.id === selectedTankId);

  // Load fish catalog on mount and when search/filters change
  useEffect(() => {
    if (activeTab !== 'fish') return;
    
    let mounted = true;
    setIsLoadingFish(true);

    // Determine waterType for database query (if exactly one type is selected)
    const dbWaterType = selectedWaterType.length === 1 
      ? (selectedWaterType[0] as 'freshwater' | 'saltwater' | 'brackish')
      : undefined; // Don't filter if 0 or multiple selected

    if (__DEV__ && dbWaterType) {
      console.log('[Catalog] waterType filter:', dbWaterType);
    }

    getFishCatalog({ 
      search: searchQuery,
      waterType: dbWaterType 
    })
      .then(catalog => {
        if (mounted) {
          setFishCatalog(catalog);
          setIsLoadingFish(false);
        }
      })
      .catch(() => {
        if (mounted) {
          // On error, use mock data
          setFishCatalog(mockFishSpecies);
          setIsLoadingFish(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeTab, searchQuery, selectedWaterType]); // Added selectedWaterType dependency

  // Load flora catalog when plants tab is active
  useEffect(() => {
    if (activeTab !== 'plants') return;
    
    let mounted = true;
    setIsLoadingFlora(true);

    // Determine waterType for database query (if exactly one type is selected)
    const dbWaterType = selectedWaterType.length === 1 
      ? (selectedWaterType[0] as 'freshwater' | 'saltwater' | 'brackish')
      : undefined;

    if (__DEV__ && dbWaterType) {
      console.log('[Catalog] Flora waterType filter:', dbWaterType);
    }

    getFloraCatalog({ 
      search: searchQuery,
      waterType: dbWaterType,
      difficulty: selectedDifficulty.length === 1 ? selectedDifficulty[0] as 'easy' | 'medium' | 'hard' : undefined
    })
      .then(catalog => {
        if (mounted) {
          setFloraCatalog(catalog);
          setIsLoadingFlora(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setFloraCatalog([]);
          setIsLoadingFlora(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeTab, searchQuery, selectedWaterType, selectedDifficulty]);

  // Load hardscape catalog when decor tab is active
  useEffect(() => {
    if (activeTab !== 'decor') return;
    
    let mounted = true;
    setIsLoadingHardscape(true);

    // Determine waterType for database query (if exactly one type is selected)
    const dbWaterType = selectedWaterType.length === 1 
      ? (selectedWaterType[0] as 'freshwater' | 'saltwater' | 'brackish')
      : undefined;

    if (__DEV__ && dbWaterType) {
      console.log('[Catalog] Hardscape waterType filter:', dbWaterType);
    }

    getHardscapeCatalog({ 
      search: searchQuery,
      waterType: dbWaterType
    })
      .then(catalog => {
        if (mounted) {
          setHardscapeCatalog(catalog);
          setIsLoadingHardscape(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setHardscapeCatalog([]);
          setIsLoadingHardscape(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeTab, searchQuery, selectedWaterType]);

  useEffect(() => {
    // Show search mascot on catalog screen briefly
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
      .map(f => getSpeciesBySlugSync(f.speciesId, f))
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
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Text style={styles.title}>Catalog</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search species..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color={activeFiltersCount > 0 ? '#fff' : '#0D7377'} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(220)} style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} color={isActive ? '#fff' : '#64748B'} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

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
                      <Text style={styles.fishCardName} numberOfLines={1}>
                        {fish.commonName}
                      </Text>
                      <Text style={styles.fishCardScientific} numberOfLines={1}>
                        {fish.scientificName}
                      </Text>
                      <View style={styles.fishCardBadges}>
                        <Badge 
                          label={fish.difficulty} 
                          variant={fish.difficulty === 'easy' ? 'success' : fish.difficulty === 'medium' ? 'warning' : 'danger'}
                          size="small"
                        />
                        <Text style={styles.fishCardSize}>{fish.minTankGallons}g+</Text>
                      </View>
                    </GlassCard>
                  </Animated.View>
                  );
                })}
              </View>

              {filteredFish.length === 0 && (
                <View style={styles.emptyState}>
                  <MascotIcon variant="search" size={80} />
                  <Text style={styles.emptyTitle}>No fish found</Text>
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
                        <Text style={styles.fishCardName} numberOfLines={1}>
                          {flora.commonName}
                        </Text>
                        <Text style={styles.fishCardScientific} numberOfLines={1}>
                          {flora.scientificName || flora.waterType}
                        </Text>
                        <View style={styles.fishCardBadges}>
                          <Badge 
                            label={flora.difficulty} 
                            variant={flora.difficulty === 'easy' ? 'success' : flora.difficulty === 'medium' ? 'warning' : 'danger'}
                            size="small"
                          />
                          {flora.lightRequirement && (
                            <Text style={styles.fishCardSize}>{flora.lightRequirement} light</Text>
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
              {equipment.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(180 + index * 30).duration(240)}
                  style={{ width: '48%' }}
                >
                  <GlassCard style={styles.fishCard} animated={false}>
                    <View style={[styles.fishCardIcon, { backgroundColor: '#64748B' }]}>
                      <Wrench size={28} color="#fff" />
                    </View>
                    <Text style={styles.fishCardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.fishCardScientific} numberOfLines={1}>
                      {item.brand}
                    </Text>
                    <Badge label={item.type} variant="default" size="small" />
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
                        <Text style={styles.fishCardName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.fishCardScientific} numberOfLines={1}>
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
        title="Filter Fish"
        size="medium"
      >
        <View style={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Water Type</Text>
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
              <Chip
                label="Brackish"
                selected={selectedWaterType.includes('brackish')}
                onPress={() => toggleFilter('waterType', 'brackish')}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Temperament</Text>
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

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Difficulty</Text>
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
        size="large"
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
                <Text style={styles.compatibilityName}>{selectedSpecies.commonName}</Text>
                <Text style={styles.compatibilityScientific}>{selectedSpecies.scientificName}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Min Tank</Text>
                <Text style={styles.compatibilityStatValue}>{selectedSpecies.minTankGallons}g</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Adult Size</Text>
                <Text style={styles.compatibilityStatValue}>{selectedSpecies.adultSizeInches}"</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Temperament</Text>
                <Text style={styles.compatibilityStatValue}>{selectedSpecies.temperament}</Text>
              </View>
              {selectedSpecies.tempMin !== undefined && selectedSpecies.tempMax !== undefined && (
                <View style={styles.compatibilityStat}>
                  <Text style={styles.compatibilityStatLabel}>Temp Range</Text>
                  <Text style={styles.compatibilityStatValue}>{selectedSpecies.tempMin}-{selectedSpecies.tempMax}°F</Text>
                </View>
              )}
              {selectedSpecies.phMin !== undefined && selectedSpecies.phMax !== undefined && (
                <View style={styles.compatibilityStat}>
                  <Text style={styles.compatibilityStatLabel}>pH Range</Text>
                  <Text style={styles.compatibilityStatValue}>{selectedSpecies.phMin}-{selectedSpecies.phMax}</Text>
                </View>
              )}
            </View>

            <View style={styles.careNotesContainer}>
              <Text style={styles.careNotesTitle}>Care Notes</Text>
              <Text style={styles.careNotesText}>{selectedSpecies.careNotes}</Text>
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
        size="large"
      >
        {selectedFlora && (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
              <View style={styles.compatibilityIcon}>
                <FishThumb imageKey={selectedFlora.imageKey ?? null} size={72} />
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={styles.compatibilityName}>{selectedFlora.commonName}</Text>
                <Text style={styles.compatibilityScientific}>{selectedFlora.scientificName || selectedFlora.waterType}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Water Type</Text>
                <Text style={styles.compatibilityStatValue}>{selectedFlora.waterType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Difficulty</Text>
                <Text style={styles.compatibilityStatValue}>{selectedFlora.difficulty}</Text>
              </View>
              {selectedFlora.lightRequirement && (
                <View style={styles.compatibilityStat}>
                  <Text style={styles.compatibilityStatLabel}>Light</Text>
                  <Text style={styles.compatibilityStatValue}>{selectedFlora.lightRequirement}</Text>
                </View>
              )}
            </View>

            {selectedFlora.careNotes && (
              <View style={styles.careNotesContainer}>
                <Text style={styles.careNotesTitle}>Care Notes</Text>
                <Text style={styles.careNotesText}>{selectedFlora.careNotes}</Text>
              </View>
            )}

            {selectedFlora.placement && (
              <View style={styles.careNotesContainer}>
                <Text style={styles.careNotesTitle}>Placement</Text>
                <Text style={styles.careNotesText}>Best suited for {selectedFlora.placement} areas of the aquarium.</Text>
              </View>
            )}

            {selectedFlora.growthRate && (
              <View style={styles.careNotesContainer}>
                <Text style={styles.careNotesTitle}>Growth Rate</Text>
                <Text style={styles.careNotesText}>Grows at a {selectedFlora.growthRate} pace.</Text>
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
        size="large"
      >
        {selectedHardscape && (
          <View style={styles.compatibilityContent}>
            <View style={styles.compatibilityHeader}>
              <View style={styles.compatibilityIcon}>
                <FishThumb imageKey={selectedHardscape.imageKey ?? null} size={72} />
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={styles.compatibilityName}>{selectedHardscape.name}</Text>
                <Text style={styles.compatibilityScientific}>{selectedHardscape.material || selectedHardscape.itemType}</Text>
              </View>
            </View>

            <View style={styles.compatibilityStats}>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Type</Text>
                <Text style={styles.compatibilityStatValue}>{selectedHardscape.itemType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Water Type</Text>
                <Text style={styles.compatibilityStatValue}>{selectedHardscape.waterType}</Text>
              </View>
              <View style={styles.compatibilityStat}>
                <Text style={styles.compatibilityStatLabel}>Water Chemistry</Text>
                <Text style={styles.compatibilityStatValue}>
                  {selectedHardscape.affectsWaterChemistry ? 'Affects' : 'Inert'}
                </Text>
              </View>
            </View>

            {selectedHardscape.description && (
              <View style={styles.careNotesContainer}>
                <Text style={styles.careNotesTitle}>Description</Text>
                <Text style={styles.careNotesText}>{selectedHardscape.description}</Text>
              </View>
            )}

            {selectedHardscape.careNotes && (
              <View style={styles.careNotesContainer}>
                <Text style={styles.careNotesTitle}>Care Notes</Text>
                <Text style={styles.careNotesText}>{selectedHardscape.careNotes}</Text>
              </View>
            )}
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
    color: '#1A252F',
    textAlign: 'center',
    marginBottom: 2,
  },
  fishCardScientific: {
    fontSize: 11,
    color: '#64748B',
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
    color: '#64748B',
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
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
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
});