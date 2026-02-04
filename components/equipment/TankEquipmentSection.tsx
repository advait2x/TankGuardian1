import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TankEquipmentCard } from './TankEquipmentCard';
import type { TankEquipment } from '../../data/types';
import {
  getInstalledEquipment,
  getWishlistEquipment,
  moveWishlistToInstalled,
  removeEquipmentFromTank,
} from '../../utils/remoteEquipment';
import { adaptTankEquipmentList } from '../../utils/equipmentAdapter';
import { useTheme } from '@/store/ThemeContext';

interface TankEquipmentSectionProps {
  tankId: string;
  onAddEquipment?: () => void;
  onEquipmentPress?: (equipment: TankEquipment) => void;
}

export interface TankEquipmentSectionRef {
  refresh: () => void;
}

export const TankEquipmentSection = forwardRef<TankEquipmentSectionRef, TankEquipmentSectionProps>(
  ({ tankId, onAddEquipment, onEquipmentPress }, ref) => {
    const [installed, setInstalled] = useState<TankEquipment[]>([]);
    const [wishlist, setWishlist] = useState<TankEquipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { colors } = useTheme();

    const loadEquipment = async () => {
      try {
        const [installedData, wishlistData] = await Promise.all([
          getInstalledEquipment(tankId),
          getWishlistEquipment(tankId),
        ]);

        setInstalled(adaptTankEquipmentList(installedData));
        setWishlist(adaptTankEquipmentList(wishlistData));
      } catch (error) {
        console.error('Error loading equipment:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    useEffect(() => {
      loadEquipment();
    }, [tankId]);

    const handleRefresh = () => {
      setRefreshing(true);
      loadEquipment();
    };

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh: handleRefresh,
    }));

    const handleMoveToInstalled = async (item: TankEquipment) => {
      try {
        const result = await moveWishlistToInstalled(item.id);
        if (result.error) {
          Alert.alert('Error', 'Failed to move equipment to installed');
          return;
        }
        // Refresh the lists
        handleRefresh();
      } catch (error) {
        console.error('Error moving equipment:', error);
        Alert.alert('Error', 'Failed to move equipment to installed');
      }
    };

    const handleRemove = async (item: TankEquipment, status: 'installed' | 'wishlist') => {
      Alert.alert(
        'Remove Equipment',
        `Remove ${item.equipment?.name} from ${status === 'installed' ? 'installed' : 'wishlist'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await removeEquipmentFromTank(item.id);
                if (result.error) {
                  Alert.alert('Error', 'Failed to remove equipment');
                  return;
                }
                // Refresh the lists
                handleRefresh();
              } catch (error) {
                console.error('Error removing equipment:', error);
                Alert.alert('Error', 'Failed to remove equipment');
              }
            },
          },
        ]
      );
    };

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="construct-outline" size={24} color="#3B82F6" />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Equipment</Text>
          </View>
          {onAddEquipment && (
            <TouchableOpacity
              onPress={onAddEquipment}
              style={[styles.addButton, { backgroundColor: '#3B82F6' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Installed Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Installed
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {installed.length}
              </Text>
            </View>
          </View>

          {installed.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No equipment installed yet
              </Text>
            </View>
          ) : (
            installed.map((item) => (
              <TankEquipmentCard
                key={item.id}
                item={item}
                onPress={() => onEquipmentPress?.(item)}
                onRemove={() => handleRemove(item, 'installed')}
              />
            ))
          )}
        </View>

        {/* Wishlist Section */}
        <View>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Wishlist
            </Text>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: '#92400E' }]}>
                {wishlist.length}
              </Text>
            </View>
          </View>

          {wishlist.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="heart-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No equipment in wishlist
              </Text>
            </View>
          ) : (
            wishlist.map((item) => (
              <TankEquipmentCard
                key={item.id}
                item={item}
                onPress={() => onEquipmentPress?.(item)}
                onRemove={() => handleRemove(item, 'wishlist')}
                onMoveToInstalled={() => handleMoveToInstalled(item)}
              />
            ))
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  emptyState: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
