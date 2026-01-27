import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface BubbleProps {
  delay: number;
  startX: number;
  size: number;
  duration: number;
}

const Bubble = ({ delay, startX, size, duration }: BubbleProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [height + 50, -50]);
    const translateX = interpolate(
      progress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, 10, 0, -10, 0]
    );
    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.9, 1],
      [0, 0.6, 0.6, 0]
    );

    return {
      transform: [{ translateY }, { translateX }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
};

interface AnimatedBackgroundProps {
  variant?: 'default' | 'light' | 'dark';
  showBubbles?: boolean;
}

export default function AnimatedBackground({ 
  variant = 'default',
  showBubbles = true 
}: AnimatedBackgroundProps) {
  const gradientProgress = useSharedValue(0);

  useEffect(() => {
    gradientProgress.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const bubbles = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 800,
      startX: Math.random() * width,
      size: Math.random() * 12 + 6,
      duration: Math.random() * 4000 + 5000,
    }));
  }, []);

  const backgroundColors = {
    default: ['#E8F4F8', '#D4EBF0', '#C5E4E9'],
    light: ['#F0F9FB', '#E8F4F8', '#E0F0F4'],
    dark: ['#121212', '#1A1A1A', '#222222'],
  };

  const colors = backgroundColors[variant];

  return (
    <View style={[styles.container, { backgroundColor: colors[0] }]} pointerEvents="none">
      {/* Gradient layers */}
      <View style={[styles.gradientLayer, { backgroundColor: colors[1], opacity: 0.5 }]} pointerEvents="none" />
      <View style={[styles.gradientLayer, styles.gradientBottom, { backgroundColor: colors[2], opacity: 0.3 }]} pointerEvents="none" />
      
      {/* Noise texture overlay */}
      <View style={styles.noiseOverlay} pointerEvents="none" />
      
      {/* Animated bubbles */}
      {showBubbles && bubbles.map((bubble) => (
        <Bubble key={bubble.id} {...bubble} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientBottom: {
    top: '50%',
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    backgroundColor: '#000',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
});
