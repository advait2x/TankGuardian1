import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react-native';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import QuantityStepper from '@/components/ui/QuantityStepper';
import FishThumb from '@/components/FishThumb';
import { FishSpecies, Tank } from '@/data/types';
import { fishSpecies as allFishSpecies } from '@/data/mockData';
import { getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/store/ThemeContext';

interface AddToTankSheetProps {
  visible: boolean;
  onClose: () => void;
  species: FishSpecies;
  tanks: Tank[];
  onConfirm: (tankId: string, quantity: number) => void;
}

type CompatibilityLevel = 'compatible' | 'caution' | 'not-recommended';

export default function AddToTankSheet({
  visible,
  onClose,
  species,
  tanks,
  onConfirm,
}: AddToTankSheetProps) {
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [compatibilityLevel, setCompatibilityLevel] = useState<CompatibilityLevel>('compatible');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showTankPicker, setShowTankPicker] = useState(false);
  const [isWaterTypeMismatch, setIsWaterTypeMismatch] = useState(false);
  const { colors, activeTheme } = useTheme();

  const selectedTank = tanks?.find(t => t.id === selectedTankId);

  useEffect(() => {
    // Auto-select first tank if only one exists
    if (tanks?.length === 1) {
      setSelectedTankId(tanks[0].id);
    } else if (tanks?.length > 0 && !selectedTankId) {
      // Default to first tank if none selected
      setSelectedTankId(tanks[0].id);
    }
  }, [tanks]);

  useEffect(() => {
    // Set default quantity based on species
    if (species.schooling && species.recommendedGroupSize > 1) {
      setQuantity(species.recommendedGroupSize);
    } else {
      setQuantity(1);
    }
  }, [species]);

  useEffect(() => {
    // Run compatibility check
    if (selectedTank) {
      const checkResults = checkCompatibility(species, selectedTank, quantity);
      setWarnings(checkResults.warnings);
      setCompatibilityLevel(checkResults.level);
      setIsWaterTypeMismatch(checkResults.isWaterTypeMismatch);
    }
  }, [species, selectedTank, quantity]);

  const checkCompatibility = (
    targetSpecies: FishSpecies,
    targetTank: Tank,
    qty: number
  ): { warnings: string[]; level: CompatibilityLevel; isWaterTypeMismatch: boolean } => {
    const warnings: string[] = [];
    let level: CompatibilityLevel = 'compatible';
    let isWaterTypeMismatch = false;

    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (targetSpecies.waterType !== targetTank.waterType) {
      warnings.push(
        `${targetSpecies.commonName} is a ${targetSpecies.waterType} fish and cannot be added to a ${targetTank.waterType} tank`
      );
      level = 'not-recommended';
      isWaterTypeMismatch = true;
      // Return early - this is a hard blocker
      return { warnings, level, isWaterTypeMismatch };
    }

    // Check tank size
    if (targetTank.sizeGallons < targetSpecies.minTankGallons) {
      warnings.push(
        `Tank too small: ${targetSpecies.commonName} needs at least ${targetSpecies.minTankGallons} gallons`
      );
      level = 'not-recommended';
    }

    // Check bioload using the new lookup helper
    const existingFish = targetTank.fishInstances
      .map((f) => getSpeciesBySlugSync(f.speciesId, f))
      .filter(Boolean) as FishSpecies[];

    const currentBioload = existingFish.reduce((acc, f) => acc + f.adultSizeInches, 0);
    const addedBioload = targetSpecies.adultSizeInches * qty;
    const newBioload = currentBioload + addedBioload;
    const maxBioload = targetTank.sizeGallons * 1.2;

    if (newBioload > maxBioload) {
      warnings.push(
        `Adding ${qty} ${targetSpecies.commonName} will overstock your tank (${newBioload.toFixed(1)}" / ${maxBioload.toFixed(1)}" max)`
      );
      level = 'not-recommended';
    } else if (newBioload > maxBioload * 0.8) {
      warnings.push(
        `This will bring your tank close to capacity (${newBioload.toFixed(1)}" / ${maxBioload.toFixed(1)}" max)`
      );
      if (level !== 'not-recommended') level = 'caution';
    }

    // Check temperament compatibility
    for (const existing of existingFish) {
      if (
        (targetSpecies.temperament === 'aggressive' && existing.temperament === 'peaceful') ||
        (targetSpecies.temperament === 'peaceful' && existing.temperament === 'aggressive')
      ) {
        warnings.push(
          `Temperament mismatch: ${targetSpecies.commonName} (${targetSpecies.temperament}) may conflict with ${existing.commonName} (${existing.temperament})`
        );
        if (level !== 'not-recommended') level = 'caution';
      }
    }

    // Check schooling quantity
    if (targetSpecies.schooling && qty < targetSpecies.recommendedGroupSize) {
      warnings.push(
        `${targetSpecies.commonName} is a schooling fish and does best in groups of ${targetSpecies.recommendedGroupSize}+. Consider adding more.`
      );
      if (level !== 'not-recommended') level = 'caution';
    }

    return { warnings, level, isWaterTypeMismatch };
  };

  const handleConfirm = async () => {
    if (!selectedTankId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(selectedTankId, quantity);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleSelectTank = async (tankId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTankId(tankId);
    setShowTankPicker(false);
  };

  const getCompatibilityBanner = () => {
    switch (compatibilityLevel) {
      case 'compatible':
        return {
          icon: <Check size={20} color="#4ECDC4" />,
          text: 'Compatible',
          bgColor: 'rgba(78, 205, 196, 0.1)',
          borderColor: 'rgba(78, 205, 196, 0.3)',
          textColor: '#0D7377',
        };
      case 'caution':
        return {
          icon: <AlertTriangle size={20} color="#FFA726" />,
          text: 'Caution',
          bgColor: 'rgba(255, 167, 38, 0.1)',
          borderColor: 'rgba(255, 167, 38, 0.3)',
          textColor: '#E65100',
        };
      case 'not-recommended':
        return {
          icon: <AlertTriangle size={20} color="#E57373" />,
          text: isWaterTypeMismatch ? 'Water Type Mismatch' : 'Not Recommended',
          bgColor: 'rgba(229, 115, 115, 0.1)',
          borderColor: 'rgba(229, 115, 115, 0.3)',
          textColor: '#C62828',
        };
    }
  };

  const compatibilityBanner = getCompatibilityBanner();

  return (
    <Modal visible={visible} onClose={onClose} title="Add to Tank" size="medium">
      <View style={styles.container}>
        {/* Species Header */}
        <View style={styles.speciesHeader}>
          {(species as any).image_key || (species as any).imageKey ? (
            <View style={styles.speciesIcon}>
              <FishThumb 
                imageKey={(species as any).image_key ?? (species as any).imageKey ?? null} 
                size={52} 
              />
            </View>
          ) : (
            <View style={[styles.speciesIcon, { backgroundColor: species.color }]}>
              <Text style={{ fontSize: 32 }}>🐠</Text>
            </View>
          )}
          <View style={styles.speciesInfo}>
            <Text style={[styles.speciesName, { color: colors.text }]}>{species.commonName}</Text>
            <Text style={[styles.speciesScientific, { color: colors.textSecondary }]}>{species.scientificName}</Text>
          </View>
        </View>

        {/* Tank Selector */}
        {tanks && tanks.length > 1 ? (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Tank</Text>
            <TouchableOpacity
              style={[styles.tankSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowTankPicker(!showTankPicker)}
            >
              <View style={styles.tankSelectorContent}>
                <Text style={[styles.tankSelectorText, { color: colors.text }]}>
                  {selectedTank?.name || 'Select a tank'}
                </Text>
                <Text style={[styles.tankSelectorSubtext, { color: colors.textSecondary }]}>
                  {selectedTank ? `${selectedTank.sizeGallons}g ${selectedTank.waterType}` : ''}
                </Text>
              </View>
              <ChevronDown size={20} color="#64748B" />
            </TouchableOpacity>

            {showTankPicker && (
              <View style={[styles.tankPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={styles.tankPickerScroll}>
                  {tanks.map((tank) => (
                    <TouchableOpacity
                      key={tank.id}
                      style={[
                        styles.tankOption,
                        selectedTankId === tank.id && styles.tankOptionSelected,
                        { borderBottomColor: colors.border }
                      ]}
                      onPress={() => handleSelectTank(tank.id)}
                    >
                      <View>
                        <Text style={[styles.tankOptionName, { color: colors.text }]}>{tank.name}</Text>
                        <Text style={[styles.tankOptionDetails, { color: colors.textSecondary }]}>
                          {tank.sizeGallons}g • {tank.waterType} • {tank.fishInstances?.length || 0} fish
                        </Text>
                      </View>
                      {selectedTankId === tank.id && (
                        <Check size={20} color="#0D7377" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.singleTankInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.singleTankLabel, { color: colors.textSecondary }]}>Tank</Text>
            <Text style={[styles.singleTankName, { color: colors.text }]}>{selectedTank?.name}</Text>
            <Text style={[styles.singleTankDetails, { color: colors.textSecondary }]}>
              {selectedTank?.sizeGallons}g • {selectedTank?.waterType}
            </Text>
          </View>
        )}

        {selectedTank && (
          <>
            {/* Compatibility Banner */}
            <View
              style={[
                styles.compatibilityBanner,
                {
                  backgroundColor: compatibilityBanner.bgColor,
                  borderColor: compatibilityBanner.borderColor,
                },
              ]}
            >
              {compatibilityBanner.icon}
              <Text style={[styles.compatibilityText, { color: compatibilityBanner.textColor }]}>
                {compatibilityBanner.text}
              </Text>
            </View>

            {/* Warnings */}
            {warnings.length > 0 && (
              <View style={[styles.warningsContainer, { backgroundColor: activeTheme === 'dark' ? 'rgba(255, 167, 38, 0.15)' : 'rgba(255, 167, 38, 0.05)' }]}>
                {warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Text style={[styles.warningBullet, { color: colors.textSecondary }]}>•</Text>
                    <Text style={[styles.warningText, { color: colors.text }]}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={[styles.quantityLabel, { color: colors.text }]}>Quantity</Text>
              <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={12} />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title={`Add ${quantity} to Tank`}
                onPress={handleConfirm}
                variant="primary"
                fullWidth
                disabled={isWaterTypeMismatch}
              />
              <Button title="Cancel" onPress={handleCancel} variant="outline" fullWidth />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  speciesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  speciesIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speciesInfo: {
    flex: 1,
  },
  speciesName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  speciesScientific: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  compatibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  compatibilityText: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningsContainer: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    gap: 8,
  },
  warningBullet: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  quantitySection: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  tankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  tankSelectorContent: {
    flex: 1,
  },
  tankSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  tankSelectorSubtext: {
    fontSize: 13,
  },
  tankPicker: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
  },
  tankPickerScroll: {
    maxHeight: 200,
  },
  tankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  tankOptionSelected: {
    backgroundColor: 'rgba(78, 205, 196, 0.05)',
  },
  tankOptionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  tankOptionDetails: {
    fontSize: 13,
  },
  singleTankInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  singleTankLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  singleTankName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  singleTankDetails: {
    fontSize: 13,
  },
});
