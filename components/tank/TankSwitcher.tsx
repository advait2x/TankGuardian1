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
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Tank } from '@/data/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 170;
const CARD_SPACING = 12;
const SIDE_PADDING = 20;

interface TankSwitcherProps {
  tanks: Tank[];
  selectedTankId: string | null;
  onSelectTank: (tankId: string) => void;
  onCreateTank: () => void;
}

type TankItem = Tank | { id: '__new__'; isNewButton: true };

export default function TankSwitcher({
  tanks,
  selectedTankId,
  onSelectTank,
  onCreateTank,
}: TankSwitcherProps) {
  const flatListRef = useRef<FlatList<TankItem>>(null);
  
  // Combine tanks with "Add New" button
  const items: TankItem[] = [
    ...tanks,
    { id: '__new__', isNewButton: true } as TankItem,
  ];

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

  const handleCreateTank = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateTank();
  };

  const getItemLayout = (_data: ArrayLike<TankItem> | null | undefined, index: number) => ({
    length: CARD_WIDTH,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  });

  const keyExtractor = (item: TankItem) => {
    if ('isNewButton' in item && item.isNewButton) {
      return '__new__';
    }
    return (item as Tank).id;
  };

  const renderItem = ({ item }: ListRenderItemInfo<TankItem>) => {
    // Render "Add New Tank" button
    if ('isNewButton' in item && item.isNewButton) {
      return (
        <TouchableOpacity
          style={styles.newTankCard}
          onPress={handleCreateTank}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#0D7377" />
          <Text style={styles.newTankText}>New Tank</Text>
        </TouchableOpacity>
      );
    }

    // Render tank card
    const tank = item as Tank;
    const isActive = tank.id === selectedTankId;

    return (
      <TouchableOpacity
        style={[
          styles.tankCard,
          isActive && styles.tankCardActive,
        ]}
        onPress={() => handleSelectTank(tank.id)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tankName,
          isActive && styles.tankNameActive,
        ]}>
          {tank.name}
        </Text>
        <Text style={[
          styles.tankInfo,
          isActive && styles.tankInfoActive,
        ]}>
          {tank.sizeGallons}gal • {tank.fishInstances.length} fish
        </Text>
      </TouchableOpacity>
    );
  };

  if (tanks.length === 0) {
    // Show only "Add New Tank" button when no tanks exist
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.newTankCard}
          onPress={handleCreateTank}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#0D7377" />
          <Text style={styles.newTankText}>Create Your First Tank</Text>
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
  newTankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
    width: CARD_WIDTH,
    borderWidth: 2,
    borderColor: '#0D7377',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexDirection: 'row',
  },
  newTankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
  },
});
