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
    if (__DEV__ && imageKey) {
      console.warn('[FishThumb] No URI generated for imageKey:', imageKey);
    }
    return null;
  }
  
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      onError={(error) => {
        // Silently fail - log as warning to avoid error pop-ups
        if (__DEV__) {
          console.warn('[FishThumb] Failed to load image:', uri.split('/').pop());
        }
      }}
    />
  );
}

