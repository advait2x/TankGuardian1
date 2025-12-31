import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'danger';
  height?: number;
  showAnimation?: boolean;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  variant = 'default',
  height = 8,
  showAnimation = true,
  style,
}: ProgressBarProps) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, Math.max(0, progress)), {
      duration: showAnimation ? 500 : 0,
      easing: Easing.out(Easing.ease),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const colors = {
    default: '#0D7377',
    success: '#4ECDC4',
    warning: '#FFA726',
    danger: '#E57373',
  };

  return (
    <View style={[styles.container, { height }, style]}>
      <Animated.View
        style={[
          styles.progress,
          { backgroundColor: colors[variant], height },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 10,
  },
});
