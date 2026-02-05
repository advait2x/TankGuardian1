/**
 * FloraSelectionSheet
 * Bottom sheet for selecting plants/corals from catalog to add to aquascape
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from '@/components/ui/Modal';
import { FloraItem, getFloraCatalog } from '@/utils/floraCatalogAdapter';
import FishThumb from '@/components/FishThumb';
import Badge from '@/components/ui/Badge';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/store/ThemeContext';

interface FloraSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (flora: FloraItem) => void;
}

export default function FloraSelectionSheet({ visible, onClose, onSelect }: FloraSelectionSheetProps) {
  const { tanks, selectedTankId } = useApp();
  const { colors, activeTheme } = useTheme();
  const selectedTank = tanks.find(t => t.id === selectedTankId);
  
  const [floraCatalog, setFloraCatalog] = useState<FloraItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !selectedTank) return;

    let mounted = true;
    setIsLoading(true);

    // Filter by tank's water type
    const waterType = selectedTank.waterType;
    
    if (__DEV__) {
      console.log('[FloraSheet] Loading for tank:', selectedTank.name, 'waterType:', waterType);
    }
    
    getFloraCatalog({ waterType })
      .then(catalog => {
        if (mounted) {
          if (__DEV__) {
            console.log('[FloraSheet] Loaded', catalog.length, 'items');
            catalog.forEach(item => {
              console.log('  -', item.commonName, '(', item.waterType, ')');
            });
          }
          setFloraCatalog(catalog);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setFloraCatalog([]);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [visible, selectedTank?.waterType]);

  const handleSelect = (flora: FloraItem) => {
    onSelect(flora);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Select Plant/Coral" scrollable={false}>
      {!selectedTank ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tank selected</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : floraCatalog.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No plants/corals available for {selectedTank.waterType} tanks</Text>
        </View>
      ) : (
        <FlatList
          data={floraCatalog}
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
                <Text style={[styles.itemName, { color: colors.text }]}>{item.commonName}</Text>
                <Text style={[styles.itemScientific, { color: colors.textSecondary }]}>{item.scientificName || item.waterType}</Text>
                <View style={styles.itemBadges}>
                  <Badge 
                    label={item.difficulty} 
                    variant={item.difficulty === 'easy' ? 'success' : item.difficulty === 'medium' ? 'warning' : 'danger'}
                    size="small"
                  />
                  {item.lightRequirement && (
                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>{item.lightRequirement} light</Text>
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
    fontStyle: 'italic',
    marginBottom: 6,
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDetail: {
    fontSize: 12,
  },
});

