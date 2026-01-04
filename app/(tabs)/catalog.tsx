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
import { getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import * as Haptics from 'expo-haptics';

type CatalogTab = 'fish' | 'plants' | 'decor' | 'equipment';

const tabs: { id: CatalogTab; label: string; icon: any }[] = [
  { id: 'fish', label: 'Fish', icon: () => <MascotIcon variant="search" size={24} withHalo={false} /> },
  { id: 'plants', label: 'Plants', icon: Leaf },
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
  const [showPaywall, setShowPaywall] = useState(false);

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

  const checkCompatibility = (species: FishSpecies): string[] => {
    const warnings: string[] = [];
    
    if (!selectedTank) {
      warnings.push('No tank selected');
      return warnings;
    }

    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (species.waterType !== selectedTank.waterType) {
      warnings.push(`Water type mismatch: ${species.commonName} is a ${species.waterType} fish and cannot be added to a ${selectedTank.waterType} tank`);
      return warnings; // Return early - this is a hard blocker
    }

    if (selectedTank.sizeGallons < species.minTankGallons) {
      warnings.push(`Tank too small: ${species.commonName} needs at least ${species.minTankGallons} gallons`);
    }

    const existingFish = selectedTank.fishInstances
      .map(f => getSpeciesBySlugSync(f.speciesId, f))
      .filter(Boolean) as FishSpecies[];

    for (const existing of existingFish) {
        if ((species.temperament === 'aggressive' && existing.temperament === 'peaceful') ||
            (species.temperament === 'peaceful' && existing.temperament === 'aggressive')) {
          warnings.push(`Temperament conflict: ${species.commonName} (${species.temperament}) may not do well with ${existing.commonName} (${existing.temperament})`);
      }
    }

    if (species.schooling && species.recommendedGroupSize > 1) {
      warnings.push(`${species.commonName} is a schooling fish and should be kept in groups of ${species.recommendedGroupSize}+`);
    }

    const currentBioload = existingFish.reduce((acc, f) => acc + f.adultSizeInches, 0);
    const newBioload = currentBioload + species.adultSizeInches;
    const maxBioload = selectedTank.sizeGallons * 1.2;
    
    if (newBioload > maxBioload) {
      warnings.push(`Overstocking risk: Adding ${species.commonName} would exceed recommended bioload`);
    }

    return warnings;
  };

  const handleSelectSpecies = async (species: FishSpecies) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSpecies(species);
    
    const warnings = checkCompatibility(species);
    setCompatibilityWarnings(warnings);
    setShowCompatibilityModal(true);
  };

  const handleAddToTank = async () => {
    if (!selectedTank || !selectedSpecies) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if user has premium before allowing to add fish
    if (!isPremium) {
      setShowCompatibilityModal(false);
      setShowPaywall(true);
      return;
    }

    // Close compatibility modal and open AddToTankSheet
    setShowCompatibilityModal(false);
    setShowAddToTankSheet(true);
  };

  const handleConfirmAddFish = async (quantity: number) => {
    if (!selectedTank || !selectedSpecies) return;
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Use the new batch add method
    addFishInstances(selectedTank.id, selectedSpecies.id, quantity);

    setShowAddToTankSheet(false);
    setSelectedSpecies(null);
    
    const plural = quantity > 1 ? `${quantity} ${selectedSpecies.commonName}` : selectedSpecies.commonName;
    showToast(`${plural} added to ${selectedTank.name}!`, 'success');
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
            <View style={styles.fishGrid}>
              {plants.map((plant, index) => (
                <Animated.View
                  key={plant.id}
                  entering={FadeInDown.delay(180 + index * 30).duration(240)}
                  style={{ width: '48%' }}
                >
                  <GlassCard style={styles.fishCard} animated={false}>
                    <View style={[styles.fishCardIcon, { backgroundColor: '#4CAF50' }]}>
                      <Text style={{ fontSize: 28 }}>🌿</Text>
                    </View>
                    <Text style={styles.fishCardName} numberOfLines={1}>
                      {plant.commonName}
                    </Text>
                    <Text style={styles.fishCardScientific} numberOfLines={1}>
                      {plant.scientificName}
                    </Text>
                    <View style={styles.fishCardBadges}>
                      <Badge 
                        label={plant.difficulty} 
                        variant={plant.difficulty === 'easy' ? 'success' : 'warning'}
                        size="small"
                      />
                      <Text style={styles.fishCardSize}>{plant.lightRequirement} light</Text>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
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
            <View style={styles.fishGrid}>
              {decor.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(180 + index * 30).duration(240)}
                  style={{ width: '48%' }}
                >
                  <GlassCard style={styles.fishCard} animated={false}>
                    <View style={[styles.fishCardIcon, { backgroundColor: '#8B7355' }]}>
                      <Text style={{ fontSize: 28 }}>🪨</Text>
                    </View>
                    <Text style={styles.fishCardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Badge label={item.type} variant="default" size="small" />
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
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
        title="Compatibility Check"
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
            </View>

            {compatibilityWarnings.length > 0 ? (
              <View style={styles.warningsContainer}>
                <View style={styles.warningsHeader}>
                  <AlertTriangle size={20} color="#FFA726" />
                  <Text style={styles.warningsTitle}>Compatibility Warnings</Text>
                </View>
                {compatibilityWarnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Text style={styles.warningText}>• {warning}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.compatibleContainer}>
                <Check size={24} color="#4ECDC4" />
                <Text style={styles.compatibleText}>
                  This fish looks compatible with your tank!
                </Text>
              </View>
            )}

            <View style={styles.careNotesContainer}>
              <Text style={styles.careNotesTitle}>Care Notes</Text>
              <Text style={styles.careNotesText}>{selectedSpecies.careNotes}</Text>
            </View>

            <View style={styles.compatibilityActions}>
              {!selectedTank ? (
                <Text style={styles.noTankText}>Create a tank first to add fish</Text>
              ) : (
                <>
                  <Button
                    title={compatibilityWarnings.length > 0 ? "Add Anyway" : "Add to Tank"}
                    onPress={handleAddToTank}
                    variant={compatibilityWarnings.length > 0 ? "outline" : "primary"}
                    fullWidth
                  />
                  {compatibilityWarnings.length > 0 && (
                    <Text style={styles.addAnywayNote}>
                      Adding despite warnings may cause issues
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
          );
        })()}
      </Modal>

      {/* Add To Tank Sheet */}
      {selectedTank && selectedSpecies && (
        <AddToTankSheet
          visible={showAddToTankSheet}
          onClose={() => {
            setShowAddToTankSheet(false);
            setSelectedSpecies(null);
          }}
          species={selectedSpecies}
          tank={selectedTank}
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