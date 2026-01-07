/**
 * SubstrateLayer.tsx
 * 
 * Shared component for rendering substrate/bottom layer in tanks.
 * Used by both Aquascape editor and MyTank viewer.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

export type SubstrateType = 'sand' | 'gravel' | 'black_sand' | 'bare';

export interface SubstrateConfig {
  type: SubstrateType;
  heightPct: number; // Percentage of container height (0.0 - 1.0)
}

interface SubstrateLayerProps {
  config: SubstrateConfig;
  containerWidth: number;
  containerHeight: number;
}

/**
 * Returns the visual top position of substrate (where items should sit)
 */
export function getSubstrateTop(containerHeight: number, heightPct: number): number {
  return containerHeight * (1 - heightPct);
}

/**
 * Default substrate configuration
 */
export const DEFAULT_SUBSTRATE: SubstrateConfig = {
  type: 'sand',
  heightPct: 0.16,
};

/**
 * Substrate layer component
 */
export default function SubstrateLayer({ config, containerWidth, containerHeight }: SubstrateLayerProps) {
  if (config.type === 'bare') {
    return null; // No substrate
  }

  const height = containerHeight * config.heightPct;
  const backgroundColor = getSubstrateColor(config.type);

  return (
    <View
      style={[
        styles.substrate,
        {
          height,
          backgroundColor,
        },
      ]}
      pointerEvents="none"
    >
      {/* Texture overlay for visual interest */}
      <View style={styles.texture}>
          {/* Simple dot pattern for texture */}
          {Array.from({ length: 20 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.textureDot,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: config.type === 'black_sand' ? 0.15 : 0.1,
                },
              ]}
            />
          ))}
        </View>
    </View>
  );
}

function getSubstrateColor(type: SubstrateType): string {
  switch (type) {
    case 'sand':
      return '#D4B896'; // Light tan
    case 'gravel':
      return '#A89F91'; // Gray-beige
    case 'black_sand':
      return '#3A3A3A'; // Dark charcoal
    case 'bare':
      return 'transparent';
    default:
      return '#D4B896';
  }
}

const styles = StyleSheet.create({
  substrate: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  texture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textureDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#000',
  },
});
