import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Check, AlertTriangle, X, ChevronDown } from 'lucide-react-native';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { EquipmentCatalogItem, Tank } from '@/data/types';
import { useTheme } from '@/store/ThemeContext';
import { addEquipmentToTank } from '@/utils/remoteEquipment';

interface AddEquipmentToTankSheetProps {
  visible: boolean;
  onClose: () => void;
  equipment: EquipmentCatalogItem;
  tanks: Tank[];
  onConfirm: (tankId: string, status: 'installed' | 'wishlist') => void;
}

type CompatibilityLevel = 'compatible' | 'caution' | 'not-recommended';

export default function AddEquipmentToTankSheet({
  visible,
  onClose,
  equipment,
  tanks,
  onConfirm,
}: AddEquipmentToTankSheetProps) {
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [compatibilityLevel, setCompatibilityLevel] = useState<CompatibilityLevel>('compatible');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [addingAs, setAddingAs] = useState<'installed' | 'wishlist' | null>(null);
  const [showTankPicker, setShowTankPicker] = useState(false);
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
    if (!selectedTank) return;
    checkCompatibility();
  }, [selectedTank, equipment]);

  const checkCompatibility = () => {
    if (!selectedTank) return;

    const newWarnings: string[] = [];
    let level: CompatibilityLevel = 'compatible';

    // Check water type compatibility
    if (equipment.waterType !== 'both') {
      if (selectedTank.waterType === 'freshwater' && equipment.waterType === 'saltwater') {
        newWarnings.push('❌ This equipment is designed for saltwater tanks only');
        level = 'not-recommended';
      } else if (selectedTank.waterType === 'saltwater' && equipment.waterType === 'freshwater') {
        newWarnings.push('❌ This equipment is designed for freshwater tanks only');
        level = 'not-recommended';
      }
    } else {
      newWarnings.push('✅ Compatible with both freshwater and saltwater');
    }

    // Check tank size requirements
    if (equipment.minTankGal && selectedTank.sizeGallons < equipment.minTankGal) {
      newWarnings.push(`⚠️ Recommended for tanks ${equipment.minTankGal}+ gallons (yours is ${selectedTank.sizeGallons} gal)`);
      if (level === 'compatible') level = 'caution';
    } else if (equipment.maxTankGal && selectedTank.sizeGallons > equipment.maxTankGal) {
      newWarnings.push(`⚠️ May be undersized for your ${selectedTank.sizeGallons} gallon tank (max recommended: ${equipment.maxTankGal} gal)`);
      if (level === 'compatible') level = 'caution';
    } else if (equipment.minTankGal || equipment.maxTankGal) {
      const range = `${equipment.minTankGal || '?'}-${equipment.maxTankGal || '?'} gallons`;
      newWarnings.push(`✅ Perfect size for your ${selectedTank.sizeGallons} gallon tank (recommended: ${range})`);
    }

    // Category-specific recommendations
    if (equipment.category === 'heater' && selectedTank.waterType === 'saltwater') {
      newWarnings.push('💡 Consider a titanium heater for saltwater to prevent corrosion');
    }

    if (equipment.category === 'light' && equipment.wattage) {
      const wattsPerGallon = equipment.wattage / selectedTank.sizeGallons;
      if (wattsPerGallon > 5) {
        newWarnings.push('💡 High-intensity light - great for demanding plants/corals');
      } else if (wattsPerGallon < 1) {
        newWarnings.push('💡 Lower light output - suitable for low-light setups');
      }
    }

    setWarnings(newWarnings);
    setCompatibilityLevel(level);
  };

  const handleConfirm = async (status: 'installed' | 'wishlist') => {
    if (!selectedTankId) return;
    
    setAddingAs(status);
    try {
      await onConfirm(selectedTankId, status);
      onClose();
    } catch (error) {
      console.error('Error adding equipment:', error);
    } finally {
      setAddingAs(null);
    }
  };

  const compatibilityColor = 
    compatibilityLevel === 'compatible' ? '#10B981' :
    compatibilityLevel === 'caution' ? '#F59E0B' :
    '#EF4444';

  const compatibilityIcon = 
    compatibilityLevel === 'compatible' ? <Check size={20} color="#fff" /> :
    compatibilityLevel === 'caution' ? <AlertTriangle size={20} color="#fff" /> :
    <X size={20} color="#fff" />;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Add ${equipment.brand} ${equipment.model}`}
      size="large"
    >
      <ScrollView style={styles.content}>
        {/* Equipment Info */}
        <View style={[styles.equipmentCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.equipmentName, { color: colors.text }]}>
            {equipment.brand} {equipment.model}
          </Text>
          <Text style={[styles.equipmentCategory, { color: colors.textSecondary }]}>
            {equipment.category.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>

        {/* Tank Selection */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Tank</Text>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            { 
              backgroundColor: colors.cardBackground,
              borderColor: colors.border
            }
          ]}
          onPress={() => setShowTankPicker(!showTankPicker)}
        >
          <View style={styles.dropdownContent}>
            {selectedTank ? (
              <>
                <Text style={[styles.dropdownText, { color: colors.text }]}>{selectedTank.name}</Text>
                <Text style={[styles.dropdownSubtext, { color: colors.textSecondary }]}>
                  {selectedTank.sizeGallons} gal • {selectedTank.waterType}
                </Text>
              </>
            ) : (
              <Text style={[styles.dropdownText, { color: colors.textSecondary }]}>
                Choose a tank...
              </Text>
            )}
          </View>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Tank Picker Dropdown */}
        {showTankPicker && (
          <View style={[styles.tankPickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {tanks.map(tank => (
              <TouchableOpacity
                key={tank.id}
                style={[
                  styles.tankPickerOption,
                  { borderBottomColor: colors.border },
                  selectedTankId === tank.id && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setSelectedTankId(tank.id);
                  setShowTankPicker(false);
                }}
              >
                <View style={styles.tankInfo}>
                  <Text style={[styles.tankName, { color: colors.text }]}>{tank.name}</Text>
                  <Text style={[styles.tankDetails, { color: colors.textSecondary }]}>
                    {tank.sizeGallons} gal • {tank.waterType}
                  </Text>
                </View>
                {selectedTankId === tank.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Check size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Compatibility Info */}
        {selectedTank && (
          <View style={styles.compatibilitySection}>
            <View style={styles.compatibilityHeader}>
              <View style={[styles.compatibilityBadge, { backgroundColor: compatibilityColor }]}>
                {compatibilityIcon}
              </View>
              <Text style={[styles.compatibilityTitle, { color: colors.text }]}>
                {compatibilityLevel === 'compatible' ? 'Compatible' :
                 compatibilityLevel === 'caution' ? 'Use with Caution' :
                 'Not Recommended'}
              </Text>
            </View>

            <View style={[styles.warningsContainer, { backgroundColor: colors.cardBackground }]}>
              {warnings.map((warning, index) => (
                <Text key={index} style={[styles.warningText, { color: colors.text }]}>
                  {warning}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Add as Installed"
          onPress={() => handleConfirm('installed')}
          disabled={!selectedTankId || addingAs !== null || compatibilityLevel === 'not-recommended'}
          variant="primary"
          style={styles.actionButton}
        />
        <Button
          title="Add to Wishlist"
          onPress={() => handleConfirm('wishlist')}
          disabled={!selectedTankId || addingAs !== null}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  equipmentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  equipmentCategory: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dropdownSubtext: {
    fontSize: 14,
  },
  tankPickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    maxHeight: 300,
  },
  tankPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  tankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  selectedTank: {
    borderWidth: 2,
  },
  tankInfo: {
    flex: 1,
  },
  tankName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tankDetails: {
    fontSize: 14,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compatibilitySection: {
    marginTop: 20,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compatibilityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compatibilityTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  warningsContainer: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
});
