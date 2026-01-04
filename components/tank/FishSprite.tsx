import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { getCatalogPublicUrl } from '@/utils/storageUrls';

interface FishSpriteProps {
  slug?: string | null;
  imageKey?: string | null;
  size?: number;
  style?: ViewStyle;
  color?: string;
}

export default function FishSprite({ 
  slug, 
  imageKey, 
  size = 34,
  style,
  color = '#FF6B35'
}: FishSpriteProps) {
  const [imageError, setImageError] = useState(false);

  // Determine if we should try to load an image
  const hasImage = !imageError && (imageKey || slug);
  const imageUrl = hasImage ? getCatalogPublicUrl(imageKey || slug || '') : null;

  // Fallback to emoji if no image or error
  if (!hasImage || !imageUrl) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }, style]}>
        <Text style={{ fontSize: size * 0.65 }}>🐠</Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageContainer, { width: size, height: size }, style]}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="contain"
        onError={() => {
          // Silently fall back to emoji - don't spam logs
          setImageError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});


