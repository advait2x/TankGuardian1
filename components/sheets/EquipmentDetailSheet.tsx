import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { EquipmentCatalogItem } from '../../data/types';
import { getPublicUrl } from '../../utils/storageUrls';
import { useTheme } from '@/store/ThemeContext';

interface EquipmentDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  equipment: EquipmentCatalogItem | null;
  onAddToTank?: (equipmentId: string, status: 'installed' | 'wishlist') => Promise<void>;
  tankId?: string;
}

export function EquipmentDetailSheet({
  visible,
  onClose,
  equipment,
  onAddToTank,
  tankId,
}: EquipmentDetailSheetProps) {
  const [adding, setAdding] = useState(false);
  const { colors } = useTheme();

  if (!equipment) {
    return null;
  }

  const imageUrl = equipment.imageKey ? getPublicUrl(equipment.imageKey) : null;

  // Format category for display
  const categoryDisplay = equipment.category
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Format tank size range
  const tankSizeRange =
    equipment.minTankGal || equipment.maxTankGal
      ? `${equipment.minTankGal || '?'}-${equipment.maxTankGal || '?'} gallons`
      : 'Any size';

  const handleAddToTank = async (status: 'installed' | 'wishlist') => {
    if (!onAddToTank || !tankId) return;

    try {
      setAdding(true);
      await onAddToTank(equipment.id, status);
      onClose();
    } catch (error) {
      console.error('Error adding equipment to tank:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = () => {
    const url = equipment.affiliateUrl || equipment.officialUrl;
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={equipment.name} size="full">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={[styles.imageContainer, { backgroundColor: colors.cardBackground }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          )}
        </View>

        {/* Brand & Model */}
        <View style={styles.headerSection}>
          <Text style={[styles.brandText, { color: colors.text }]}>{equipment.brand}</Text>
          <Text style={[styles.modelText, { color: colors.textSecondary }]}>{equipment.model}</Text>
        </View>

        {/* Tags */}
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, styles.categoryTag]}>
            <Text style={styles.categoryTagText}>{categoryDisplay}</Text>
          </View>
          <View
            style={[
              styles.tag,
              equipment.waterType === 'freshwater'
                ? styles.freshwaterTag
                : equipment.waterType === 'saltwater'
                ? styles.saltwaterTag
                : styles.bothTag,
            ]}
          >
            <Text
              style={[
                styles.tagText,
                equipment.waterType === 'freshwater'
                  ? styles.freshwaterTagText
                  : equipment.waterType === 'saltwater'
                  ? styles.saltwaterTagText
                  : styles.bothTagText,
              ]}
            >
              {equipment.waterType === 'both' ? 'Freshwater & Saltwater' : equipment.waterType}
            </Text>
          </View>
        </View>

        {/* Specs */}
        <View style={[styles.specsCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Specifications</Text>

          <View style={styles.specRow}>
            <Ionicons name="resize-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Tank Size:</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>{tankSizeRange}</Text>
          </View>

          {equipment.wattage && (
            <View style={styles.specRow}>
              <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Power:</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>{equipment.wattage}W</Text>
            </View>
          )}

          {equipment.flowGph && (
            <View style={styles.specRow}>
              <Ionicons name="water-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Flow Rate:</Text>
              <Text style={[styles.specValue, { color: colors.text }]}>
                {equipment.flowGph} GPH
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {equipment.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {equipment.description}
            </Text>
          </View>
        )}

        {/* Pros */}
        {equipment.pros && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pros</Text>
            <View style={styles.prosCard}>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {equipment.pros}
              </Text>
            </View>
          </View>
        )}

        {/* Cons */}
        {equipment.cons && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cons</Text>
            <View style={styles.consCard}>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {equipment.cons}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
        {/* Buy Button */}
        {(equipment.affiliateUrl || equipment.officialUrl) && (
          <Button
            title="Buy Now"
            onPress={handleBuyNow}
            variant="primary"
            fullWidth
            style={styles.buyButton}
          />
        )}

        {/* Add to Tank Buttons */}
        {tankId && onAddToTank && (
          <View style={styles.addButtonsRow}>
            <Button
              title="Add Installed"
              onPress={() => handleAddToTank('installed')}
              disabled={adding}
              variant="primary"
              style={styles.addButton}
            />
            <Button
              title="Wishlist"
              onPress={() => handleAddToTank('wishlist')}
              disabled={adding}
              variant="outline"
              style={styles.addButton}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerSection: {
    marginBottom: 16,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modelText: {
    fontSize: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#DBEAFE',
  },
  categoryTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  freshwaterTag: {
    backgroundColor: '#D1FAE5',
  },
  freshwaterTagText: {
    color: '#065F46',
  },
  saltwaterTag: {
    backgroundColor: '#CFFAFE',
  },
  saltwaterTagText: {
    color: '#155E75',
  },
  bothTag: {
    backgroundColor: '#E9D5FF',
  },
  bothTagText: {
    color: '#6B21A8',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  specsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  specLabel: {
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  prosCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  consCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
  },
  actionsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  buyButton: {
    marginBottom: 12,
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
  },
});
