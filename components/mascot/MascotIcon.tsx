import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

type MascotVariant = 'guide' | 'checklist' | 'search';

interface MascotIconProps {
  variant?: MascotVariant;
  size?: number;
  withHalo?: boolean;
  style?: ViewStyle;
}

// Load mascot images with fail-safe
function getMascotSource(variant: MascotVariant) {
  try {
    switch (variant) {
      case 'checklist':
        return require('@/assets/images/mascots/mascot-checklist.png');
      case 'search':
        return require('@/assets/images/mascots/mascot-search.png');
      case 'guide':
      default:
        return require('@/assets/images/mascots/mascot.png');
    }
  } catch (error) {
    console.warn(`MascotIcon: Failed to load mascot image for variant "${variant}"`, error);
    return null;
  }
}

export default function MascotIcon({
  variant = 'guide',
  size = 28,
  withHalo = true,
  style,
}: MascotIconProps) {
  const source = getMascotSource(variant);

  // Fail-safe: if source failed to load, render nothing
  if (!source) {
    return null;
  }

  const iconSize = { width: size, height: size };
  const haloSize = { width: size * 1.5, height: size * 1.5 };

  return (
    <View style={[styles.container, iconSize, style]}>
      {withHalo && (
        <View style={[styles.halo, haloSize]} />
      )}
      <Image
        source={source}
        style={[styles.image, iconSize] as ImageStyle}
        resizeMode="contain"
        onError={(error) => {
          console.warn(`MascotIcon: Failed to render image for variant "${variant}"`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderRadius: 9999,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    zIndex: 1,
  },
});

