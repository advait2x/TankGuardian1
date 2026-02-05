/**
 * HardscapeSelectionSheet
 * Bottom sheet for selecting decorations from catalog to add to aquascape
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from '@/components/ui/Modal';
import { HardscapeItem, getHardscapeCatalog } from '@/utils/hardscapeCatalogAdapter';
import FishThumb from '@/components/FishThumb';
import Badge from '@/components/ui/Badge';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/store/ThemeContext';

interface HardscapeSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (hardscape: HardscapeItem) => void;
}

export default function HardscapeSelectionSheet({ visible, onClose, onSelect }: HardscapeSelectionSheetProps) {
  const { tanks, selectedTankId } = useApp();
  const { colors, activeTheme } = useTheme();
  const selectedTank = tanks.find(t => t.id === selectedTankId);
  
  const [hardscapeCatalog, setHardscapeCatalog] = useState<HardscapeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !selectedTank) return;

    let mounted = true;
    setIsLoading(true);

    // Filter by tank's water type (hardscape can be 'both')
    const waterType = selectedTank.waterType;
    
    if (__DEV__) {
      console.log('[HardscapeSheet] Loading for tank:', selectedTank.name, 'waterType:', waterType);
    }
    
    getHardscapeCatalog({ waterType })
      .then(catalog => {
        if (mounted) {
          if (__DEV__) {
            console.log('[HardscapeSheet] Loaded', catalog.length, 'items');
            catalog.forEach(item => {
              console.log('  -', item.name, '(', item.waterType, ')');
            });
          }
          setHardscapeCatalog(catalog);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setHardscapeCatalog([]);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [visible, selectedTank?.waterType]);

  const handleSelect = (hardscape: HardscapeItem) => {
    onSelect(hardscape);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Select Decoration" scrollable={false}>
      {!selectedTank ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tank selected</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hardscapeCatalog.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No decorations available for {selectedTank.waterType} tanks</Text>
        </View>
      ) : (
        <FlatList
          data={hardscapeCatalog}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.card }]}
              onPress={() => handleSelect(item)}
            >
              <View style={[styles.itemIcon, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }]}>
                <FishThumb imageKey={item.imageKey ?? null} size={48} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemScientific, { color: colors.textSecondary }]}>{item.material || item.itemType}</Text>
                <View style={styles.itemBadges}>
                  <Badge label={item.itemType} variant="default" size="small" />
                  {item.affectsWaterChemistry && (
                    <Text style={styles.itemWarning}>⚠️ Affects water chemistry</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemScientific: {
    fontSize: 13,
    marginBottom: 6,
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemWarning: {
    fontSize: 12,
    color: '#F59E0B',
  },
});

