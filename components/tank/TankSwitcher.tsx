import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUnitSettings } from '@/store/UnitSettingsContext';
import { useTheme } from '@/store/ThemeContext';
import type { Tank } from '@/data/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 170;
const CARD_SPACING = 12;
const SIDE_PADDING = 20;

interface TankSwitcherProps {
  tanks: Tank[];
  selectedTankId: string | null;
  onSelectTank: (tankId: string) => void;
}

type TankItem = Tank | { id: '__new__'; isNewButton: true };

export default function TankSwitcher({
  tanks,
  selectedTankId,
  onSelectTank,
}: TankSwitcherProps) {
  const { formatVolume } = useUnitSettings();
  const { colors, activeTheme } = useTheme();
  const flatListRef = useRef<FlatList<TankItem>>(null);
  
  // Use tanks as items
  const items: TankItem[] = tanks;

  // Scroll to selected tank when it changes
  useEffect(() => {
    if (!selectedTankId || tanks.length === 0) return;
    
    const selectedIndex = tanks.findIndex(t => t.id === selectedTankId);
    if (selectedIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5, // Center the item
      });
    }
  }, [selectedTankId, tanks]);

  const handleSelectTank = async (tankId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTank(tankId);
  };

  const getItemLayout = (_data: ArrayLike<TankItem> | null | undefined, index: number) => ({
    length: CARD_WIDTH,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  });

  const keyExtractor = (item: TankItem) => (item as Tank).id;

  const renderItem = ({ item }: ListRenderItemInfo<TankItem>) => {
    // Render tank card
    const tank = item as Tank;
    const isActive = tank.id === selectedTankId;

    return (
      <TouchableOpacity
        style={[
          styles.tankCard,
          { backgroundColor: colors.card, borderColor: 'transparent' },
          isActive && [styles.tankCardActive, { backgroundColor: activeTheme === 'dark' ? 'rgba(13, 115, 119, 0.3)' : 'rgba(13, 115, 119, 0.15)', borderColor: colors.primary }],
        ]}
        onPress={() => handleSelectTank(tank.id)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tankName,
          { color: colors.text },
          isActive && [styles.tankNameActive, { color: colors.primary }],
        ]}>
          {tank.name}
        </Text>
        <Text style={[
          styles.tankInfo,
          { color: colors.textSecondary },
          isActive && [styles.tankInfoActive, { color: colors.primary }],
        ]}>
          {formatVolume(tank.sizeGallons)} • {tank.fishInstances.length} fish
        </Text>
      </TouchableOpacity>
    );
  };

  if (tanks.length === 0) {
    // Show only "Add New Tank" button when no tanks exist
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.newTankCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={handleCreateTank}
          activeOpacity={0.7}
        >
          <Plus size={20} color={colors.primary} />
          <Text style={[styles.newTankText, { color: colors.primary }]}>Create Your First Tank</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        getItemLayout={getItemLayout}
        initialScrollIndex={
          selectedTankId
            ? Math.max(0, tanks.findIndex(t => t.id === selectedTankId))
            : 0
        }
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset if index fails
          const wait = new Promise(resolve => setTimeout(resolve, 100));
          wait.then(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: SIDE_PADDING,
    gap: CARD_SPACING,
  },
  tankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    width: CARD_WIDTH,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tankCardActive: {
    backgroundColor: 'rgba(13, 115, 119, 0.15)',
    borderColor: '#0D7377',
  },
  tankName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tankNameActive: {
    color: '#0D7377',
  },
  tankInfo: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tankInfoActive: {
    color: '#0D7377',
  },
});
