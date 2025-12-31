import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export default function Badge({
  label,
  variant = 'default',
  size = 'medium',
  style,
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[`${size}Size`], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  // Variants
  default: {
    backgroundColor: 'rgba(13, 115, 119, 0.15)',
  },
  success: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  warning: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
  },
  danger: {
    backgroundColor: 'rgba(229, 115, 115, 0.2)',
  },
  info: {
    backgroundColor: 'rgba(0, 180, 216, 0.15)',
  },
  // Sizes
  smallSize: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  mediumSize: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  // Text styles
  text: {
    fontWeight: '600',
  },
  defaultText: {
    color: '#0D7377',
  },
  successText: {
    color: '#0D7377',
  },
  warningText: {
    color: '#E65100',
  },
  dangerText: {
    color: '#C62828',
  },
  infoText: {
    color: '#0277BD',
  },
  smallText: {
    fontSize: 11,
  },
  mediumText: {
    fontSize: 13,
  },
});
