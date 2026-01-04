import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';
import { getCatalogPublicUrl } from '@/utils/storageUrls';

interface FishThumbProps {
  imageKey?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Reusable fish thumbnail component that safely renders images from Supabase Storage
 * Returns null if no image available - never crashes
 */
export default function FishThumb({ imageKey, size = 44, style }: FishThumbProps) {
  const uri = getCatalogPublicUrl(imageKey);
  
  if (!uri) {
    return null;
  }
  
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={() => {
        // Silently fail - no crash, no retry, no state updates
      }}
    />
  );
}

