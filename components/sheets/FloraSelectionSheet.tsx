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

interface FloraSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (flora: FloraItem) => void;
}

export default function FloraSelectionSheet({ visible, onClose, onSelect }: FloraSelectionSheetProps) {
  const { tanks, selectedTankId } = useApp();
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
          <Text style={styles.emptyText}>No tank selected</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#0D7377" />
        </View>
      ) : floraCatalog.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No plants/corals available for {selectedTank.waterType} tanks</Text>
        </View>
      ) : (
        <FlatList
          data={floraCatalog}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.itemIcon}>
                <FishThumb imageKey={item.imageKey ?? null} size={48} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.commonName}</Text>
                <Text style={styles.itemScientific}>{item.scientificName || item.waterType}</Text>
                <View style={styles.itemBadges}>
                  <Badge 
                    label={item.difficulty} 
                    variant={item.difficulty === 'easy' ? 'success' : item.difficulty === 'medium' ? 'warning' : 'danger'}
                    size="small"
                  />
                  {item.lightRequirement && (
                    <Text style={styles.itemDetail}>{item.lightRequirement} light</Text>
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
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
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
    color: '#1A252F',
    marginBottom: 2,
  },
  itemScientific: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#64748B',
  },
});
