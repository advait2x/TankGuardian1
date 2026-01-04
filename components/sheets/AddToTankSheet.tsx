import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AlertTriangle, Check } from 'lucide-react-native';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import QuantityStepper from '@/components/ui/QuantityStepper';
import FishThumb from '@/components/FishThumb';
import { FishSpecies, Tank } from '@/data/types';
import { fishSpecies as allFishSpecies } from '@/data/mockData';
import { getSpeciesBySlugSync } from '@/utils/tankSpeciesLookup';
import * as Haptics from 'expo-haptics';

interface AddToTankSheetProps {
  visible: boolean;
  onClose: () => void;
  species: FishSpecies;
  tank: Tank;
  onConfirm: (quantity: number) => void;
}

type CompatibilityLevel = 'compatible' | 'caution' | 'not-recommended';

export default function AddToTankSheet({
  visible,
  onClose,
  species,
  tank,
  onConfirm,
}: AddToTankSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [compatibilityLevel, setCompatibilityLevel] = useState<CompatibilityLevel>('compatible');
  const [warnings, setWarnings] = useState<string[]>([]);

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
    const checkResults = checkCompatibility(species, tank, quantity);
    setWarnings(checkResults.warnings);
    setCompatibilityLevel(checkResults.level);
  }, [species, tank, quantity]);

  const checkCompatibility = (
    targetSpecies: FishSpecies,
    targetTank: Tank,
    qty: number
  ): { warnings: string[]; level: CompatibilityLevel } => {
    const warnings: string[] = [];
    let level: CompatibilityLevel = 'compatible';

    // Check water type compatibility (CRITICAL - prevent mismatched water types)
    if (targetSpecies.waterType !== targetTank.waterType) {
      warnings.push(
        `Water type mismatch: ${targetSpecies.commonName} is a ${targetSpecies.waterType} fish and cannot be added to a ${targetTank.waterType} tank`
      );
      level = 'not-recommended';
      // Return early - this is a hard blocker
      return { warnings, level };
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

    return { warnings, level };
  };

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(quantity);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
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
          text: 'Not Recommended',
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
            <Text style={styles.speciesName}>{species.commonName}</Text>
            <Text style={styles.speciesScientific}>{species.scientificName}</Text>
          </View>
        </View>

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
          <View style={styles.warningsContainer}>
            {warnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <Text style={styles.warningBullet}>•</Text>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quantity Selector */}
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={12} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={`Add ${quantity} to Tank`}
            onPress={handleConfirm}
            variant="primary"
            fullWidth
            disabled={compatibilityLevel === 'not-recommended' && warnings.some(w => w.includes('Water type mismatch'))}
          />
          <Button title="Cancel" onPress={handleCancel} variant="outline" fullWidth />
        </View>
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
    color: '#1A252F',
    marginBottom: 2,
  },
  speciesScientific: {
    fontSize: 14,
    color: '#64748B',
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
    backgroundColor: 'rgba(255, 167, 38, 0.05)',
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
    color: '#64748B',
    fontWeight: '600',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
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
    color: '#2C3E50',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
});

