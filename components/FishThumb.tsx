import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { getCatalogPublicUrl } from '@/utils/storageUrls';

interface FishThumbProps {
  imageKey?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

// Blurhash placeholder for loading state (light gray)
const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * Reusable fish thumbnail component that safely renders images from Supabase Storage
 * Uses expo-image for better caching and performance
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
      contentFit="contain"
      placeholder={{ blurhash: PLACEHOLDER_BLURHASH }}
      transition={200}
      cachePolicy="disk"
      onError={(error) => {
        // Silently fail - log as warning to avoid error pop-ups
        if (__DEV__) {
          console.warn('[FishThumb] Failed to load image:', uri.split('/').pop());
        }
      }}
    />
  );
}
