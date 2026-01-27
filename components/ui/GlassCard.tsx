import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/store/ThemeContext';
import { StyleProp, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'flat';
  animated?: boolean;
  delay?: number;
}

// Calm press animation config
const EASE_OUT = Easing.bezier(0.25, 0.1, 0.25, 1);

export default function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  animated = true,
  delay = 0,
}: GlassCardProps) {
  const { colors, activeTheme } = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 150, easing: EASE_OUT });
    translateY.value = withTiming(1, { duration: 150, easing: EASE_OUT });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 220, easing: EASE_OUT });
    translateY.value = withTiming(0, { duration: 220, easing: EASE_OUT });
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
    { backgroundColor: colors.card, borderColor: colors.border },
    variant === 'elevated' && [
      styles.elevated, 
      { 
        backgroundColor: activeTheme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.85)',
        shadowColor: activeTheme === 'dark' ? '#000' : '#000' 
      }
    ],
    variant === 'flat' && [
      styles.flat,
       { 
         backgroundColor: activeTheme === 'dark' ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.6)',
         borderColor: colors.border
       }
    ],
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
        entering={animated ? FadeInDown.delay(delay).duration(240) : undefined}
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
      entering={animated ? FadeInDown.delay(delay).duration(240) : undefined}
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
