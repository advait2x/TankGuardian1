import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EquipmentCatalogItem } from '../../data/types';
import { getPublicUrl } from '../../utils/storageUrls';

interface EquipmentCardProps {
  item: EquipmentCatalogItem;
  onPress?: () => void;
  showCategory?: boolean;
}

export function EquipmentCard({ item, onPress, showCategory = true }: EquipmentCardProps) {
  const imageUrl = item.imageKey ? getPublicUrl(item.imageKey) : null;

  // Format category for display
  const categoryDisplay = item.category
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Format tank size range
  const tankSizeRange =
    item.minTankGal || item.maxTankGal
      ? `${item.minTankGal || '?'}-${item.maxTankGal || '?'} gal`
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700"
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Image */}
        <View className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3 items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {showCategory && (
            <View className="flex-row items-center mb-1">
              <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                <Text className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  {categoryDisplay}
                </Text>
              </View>
              {item.waterType !== 'both' && (
                <View
                  className={`ml-2 px-2 py-0.5 rounded ${
                    item.waterType === 'freshwater'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-cyan-100 dark:bg-cyan-900/30'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      item.waterType === 'freshwater'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-cyan-700 dark:text-cyan-300'
                    }`}
                  >
                    {item.waterType}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
            {item.brand}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-1">{item.model}</Text>

          {/* Specs */}
          <View className="flex-row items-center flex-wrap">
            {tankSizeRange && (
              <View className="flex-row items-center mr-3 mb-1">
                <Ionicons name="resize-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {tankSizeRange}
                </Text>
              </View>
            )}
            {item.wattage && (
              <View className="flex-row items-center mr-3 mb-1">
                <Ionicons name="flash-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {item.wattage}W
                </Text>
              </View>
            )}
            {item.flowGph && (
              <View className="flex-row items-center mb-1">
                <Ionicons name="water-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {item.flowGph} GPH
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View className="justify-center ml-2">
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
