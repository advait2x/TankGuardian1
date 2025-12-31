import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  Search, 
  Filter, 
  Fish as FishIcon,
  Leaf,
  Box,
  Wrench,
  AlertTriangle,
  Check,
  X
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Chip from '@/components/ui/Chip';
import Modal from '@/components/ui/Modal';
import Mascot from '@/components/ui/Mascot';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { fishSpecies, plants, equipment, decor, generateId } from '@/data/mockData';
import { FishSpecies } from '@/data/types';
import * as Haptics from 'expo-haptics';

type CatalogTab = 'fish' | 'plants' | 'decor' | 'equipment';

const tabs: { id: CatalogTab; label: string; icon: any }[] = [
  { id: 'fish', label: 'Fish', icon: FishIcon },
  { id: 'plants', label: 'Plants', icon: Leaf },
  { id: 'decor', label: 'Decor', icon: Box },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
];

const temperamentFilters = ['peaceful', 'semi-aggressive', 'aggressive'];
const difficultyFilters = ['easy', 'medium', 'hard'];

export default function CatalogScreen() {
  const router = useRouter();
  const { tanks, selectedTankId, addFishToTank } = useApp();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<CatalogTab>('fish');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemperament, setSelectedTemperament] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpecies | null>(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>([]);

  const selectedTank = tanks.find(t => t.id === selectedTankId);

  // Filter fish based on search and filters
  const filteredFish = useMemo(() => {
    return fishSpecies.filter(fish => {
      const matchesSearch = fish.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           fish.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTemperament = selectedTemperament.length === 0 || 
                                 selectedTemperament.includes(fish.temperament);
      const matchesDifficulty = selectedDifficulty.length === 0 || 
                                selectedDifficulty.includes(fish.difficulty);
      return matchesSearch && matchesTemperament && matchesDifficulty;
    });
  }, [searchQuery, selectedTemperament, selectedDifficulty]);

  // Check compatibility when adding fish
  const checkCompatibility = (species: FishSpecies): string[] => {
    const warnings: string[] = [];
    
    if (!selectedTank) {
      warnings.push('No tank selected');
      return warnings;
    }

    // Check tank size
    if (selectedTank.sizeGallons < species.minTankGallons) {
      warnings.push(`Tank too small: ${species.commonName} needs at least ${species.minTankGallons} gallons`);
    }

    // Check temperament conflicts
    const existingFish = selectedTank.fishInstances.map(f => 
      fishSpecies.find(s => s.id === f.speciesId)
    ).filter(Boolean);

    for (const existing of existingFish) {
      if (existing) {
        // Aggressive with peaceful
        if ((species.temperament === 'aggressive' && existing.temperament === 'peaceful') ||
            (species.temperament === 'peaceful' && existing.temperament === 'aggressive')) {
          warnings.push(`Temperament conflict: ${species.commonName} (${species.temperament}) may not do well with ${existing.commonName} (${existing.temperament})`);
        }
      }
    }

    // Check schooling requirements
    if (species.schooling && species.recommendedGroupSize > 1) {
      warnings.push(`${species.commonName} is a schooling fish and should be kept in groups of ${species.recommendedGroupSize}+`);
    }

    // Check overstocking
    const currentBioload = existingFish.reduce((acc, f) => acc + (f?.adultSizeInches || 0), 0);
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
    
    await Haptics.notificationAsync(
      compatibilityWarnings.length > 0 
        ? Haptics.NotificationFeedbackType.Warning 
        : Haptics.NotificationFeedbackType.Success
    );

    addFishToTank(selectedTank.id, {
      instanceId: generateId(),
      speciesId: selectedSpecies.id,
      nickname: '',
      addedAt: new Date().toISOString(),
    });

    setShowCompatibilityModal(false);
    setSelectedSpecies(null);
    showToast(`${selectedSpecies.commonName} added to ${selectedTank.name}!`, 'success');
  };

  const toggleFilter = (type: 'temperament' | 'difficulty', value: string) => {
    if (type === 'temperament') {
      setSelectedTemperament(prev => 
        prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
      );
    } else {
      setSelectedDifficulty(prev => 
        prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
      );
    }
  };

  const clearFilters = () => {
    setSelectedTemperament([]);
    setSelectedDifficulty([]);
  };

  const activeFiltersCount = selectedTemperament.length + selectedDifficulty.length;

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <Text style={styles.title}>Catalog</Text>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.searchContainer}>
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

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.tabsContainer}>
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

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'fish' && (
            <>
              {/* Mascot hint */}
              {filteredFish.length > 0 && (
                <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.mascotHint}>
                  <Mascot variant="search" size="small" animate={false} />
                  <Text style={styles.mascotHintText}>
                    Tap any fish to check compatibility with your tank!
                  </Text>
                </Animated.View>
              )}

              {/* Fish Grid */}
              <View style={styles.fishGrid}>
                {filteredFish.map((fish, index) => (
                  <Animated.View
                    key={fish.id}
                    entering={FadeInDown.delay(300 + index * 50).duration(300)}
                    style={{ width: '48%' }}
                  >
                    <GlassCard 
                      style={styles.fishCard}
                      onPress={() => handleSelectSpecies(fish)}
                      animated={false}
                    >
                      <View style={[styles.fishCardIcon, { backgroundColor: fish.color }]}>
                        <Text style={{ fontSize: 28 }}>🐠</Text>
                      </View>
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
                ))}
              </View>

              {filteredFish.length === 0 && (
                <View style={styles.emptyState}>
                  <FishIcon size={48} color="#94A3B8" />
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
                  entering={FadeInDown.delay(300 + index * 50).duration(300)}
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
                  entering={FadeInDown.delay(300 + index * 50).duration(300)}
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
                  entering={FadeInDown.delay(300 + index * 50).duration(300)}
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

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Fish"
        size="medium"
      >
        <View style={styles.filterContent}>
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

      {/* Compatibility Check Modal */}
      <Modal
        visible={showCompatibilityModal}
        onClose={() => {
          setShowCompatibilityModal(false);
          setSelectedSpecies(null);
        }}
        title="Compatibility Check"
        size="large"
      >
        {selectedSpecies && (
          <View style={styles.compatibilityContent}>
            {/* Species Header */}
            <View style={styles.compatibilityHeader}>
              <View style={[styles.compatibilityIcon, { backgroundColor: selectedSpecies.color }]}>
                <Text style={{ fontSize: 36 }}>🐠</Text>
              </View>
              <View style={styles.compatibilityInfo}>
                <Text style={styles.compatibilityName}>{selectedSpecies.commonName}</Text>
                <Text style={styles.compatibilityScientific}>{selectedSpecies.scientificName}</Text>
              </View>
            </View>

            {/* Stats */}
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

            {/* Warnings */}
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

            {/* Care Notes */}
            <View style={styles.careNotesContainer}>
              <Text style={styles.careNotesTitle}>Care Notes</Text>
              <Text style={styles.careNotesText}>{selectedSpecies.careNotes}</Text>
            </View>

            {/* Actions */}
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
    paddingBottom: 100,
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
