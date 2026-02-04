import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TankEquipment } from '../../data/types';
import { getPublicUrl } from '../../utils/storageUrls';

interface TankEquipmentCardProps {
  item: TankEquipment;
  onPress?: () => void;
  onRemove?: () => void;
  onMoveToInstalled?: () => void;
  showStatus?: boolean;
}

export function TankEquipmentCard({
  item,
  onPress,
  onRemove,
  onMoveToInstalled,
  showStatus = false,
}: TankEquipmentCardProps) {
  const equipment = item.equipment;

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

  const isWishlist = item.status === 'wishlist';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700"
      activeOpacity={0.7}
    >
      <View className="flex-row">
        {/* Image */}
        <View className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 mr-3 items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">{categoryDisplay}</Text>
            {item.quantity > 1 && (
              <View className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                <Text className="text-xs text-gray-700 dark:text-gray-300">x{item.quantity}</Text>
              </View>
            )}
            {showStatus && (
              <View
                className={`ml-2 px-2 py-0.5 rounded ${
                  isWishlist
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isWishlist
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}
                >
                  {item.status}
                </Text>
              </View>
            )}
          </View>

          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
            {equipment.brand} {equipment.model}
          </Text>

          {/* Specs */}
          <View className="flex-row items-center flex-wrap">
            {equipment.wattage && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="flash-outline" size={12} color="#6B7280" />
                <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {equipment.wattage}W
                </Text>
              </View>
            )}
            {equipment.flowGph && (
              <View className="flex-row items-center">
                <Ionicons name="water-outline" size={12} color="#6B7280" />
                <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  {equipment.flowGph} GPH
                </Text>
              </View>
            )}
          </View>

          {item.notes && (
            <Text
              className="text-xs text-gray-500 dark:text-gray-400 mt-1"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.notes}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View className="justify-center ml-2">
          {isWishlist && onMoveToInstalled && (
            <TouchableOpacity
              onPress={onMoveToInstalled}
              className="bg-green-500 p-2 rounded-lg mb-2"
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              className="bg-red-500 p-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
