import { Easing, withTiming, withSpring } from 'react-native-reanimated';

/**
 * Shared animation configurations for a calm, premium feel
 * All values are tuned for minimal bounce and subtle motion
 */

// Spring config with minimal overshoot
export const SPRING_CONFIG = {
  damping: 30,       // High damping = less bounce
  stiffness: 400,    // Higher stiffness = faster settle
  overshootClamping: true,  // Prevent overshoot
};

// Extra subtle spring (for very delicate interactions)
export const SPRING_CONFIG_GENTLE = {
  damping: 35,
  stiffness: 350,
  overshootClamping: true,
};

// Timing-based easing for button presses
export const EASE_OUT = Easing.bezier(0.25, 0.1, 0.25, 1);
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

// Standard durations
export const DURATION = {
  fast: 150,
  normal: 220,
  medium: 260,
  slow: 350,
};

// Button press animation
export const pressIn = (scale: any) => {
  'worklet';
  return withTiming(0.98, { duration: DURATION.fast, easing: EASE_OUT });
};

export const pressOut = (scale: any) => {
  'worklet';
  return withTiming(1, { duration: DURATION.normal, easing: EASE_OUT });
};

// Card entrance fade
export const fadeInConfig = {
  duration: DURATION.normal,
  easing: EASE_IN_OUT,
};

// Modal/Sheet entrance
export const slideUpConfig = {
  duration: DURATION.medium,
  easing: EASE_IN_OUT,
};

// Translate distance for entrances (px)
export const TRANSLATE = {
  subtle: 6,
  normal: 8,
};

