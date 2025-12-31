import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'flat';
  animated?: boolean;
  delay?: number;
}

export default function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  animated = true,
  delay = 0,
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
    translateY.value = withSpring(2, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const cardStyles = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && styles.flat,
    style,
  ];

  const content = (
    <View style={cardStyles}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View
        entering={animated ? FadeInDown.delay(delay).duration(300).springify() : undefined}
        style={animatedStyle}
      >
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          activeOpacity={1}
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={animated ? FadeInDown.delay(delay).duration(300).springify() : undefined}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  flat: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    shadowOpacity: 0,
    elevation: 0,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
