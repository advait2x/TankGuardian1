import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useMascot } from './MascotContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing: 12% of screen width with min/max constraints
const MASCOT_SIZE = Math.max(60, Math.min(120, SCREEN_WIDTH * 0.12));
const GLOW_SIZE = MASCOT_SIZE + 24;

// Tab bar height (from _layout.tsx)
const TAB_BAR_HEIGHT = 80;
// FAB height + offset
const FAB_HEIGHT = 56;
const FAB_BOTTOM_OFFSET = 100;

// Calm animation config
const FLOAT_AMPLITUDE = 3; // Gentle 3px floating
const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_SINE = Easing.inOut(Easing.sin);

// Safe area fallback hook
function useSafeAreaInsetsFallback() {
  try {
    // Try to import and use safe area context
    const { useSafeAreaInsets } = require('react-native-safe-area-context');
    const insets = useSafeAreaInsets();
    return insets;
  } catch (error) {
    // Fallback if SafeAreaProvider is not available
    console.warn('MascotOverlay: SafeAreaProvider not available, using fallback insets');
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

// Load mascot images inside component with fail-safe
function loadMascotImages() {
  try {
    return {
      happy: require('@/assets/images/mascots/mascot.png'),
      checklist: require('@/assets/images/mascots/mascot-checklist.png'),
      search: require('@/assets/images/mascots/mascot-search.png'),
    };
  } catch (error) {
    console.warn('MascotOverlay: Failed to load mascot images', error);
    return {};
  }
}

export default function MascotOverlay() {
  const { state } = useMascot();
  const insets = useSafeAreaInsetsFallback();
  
  // React Native Animated values
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  
  const [showTip, setShowTip] = useState(false);
  const [mascotImages, setMascotImages] = useState<Record<string, any>>({});
  const [hasLoadedImages, setHasLoadedImages] = useState(false);

  const visible = state.variant !== null;

  // Load images on mount
  useEffect(() => {
    const images = loadMascotImages();
    setMascotImages(images);
    setHasLoadedImages(true);
    
    if (Object.keys(images).length === 0) {
      console.warn('MascotOverlay: No mascot images loaded, component will not render');
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedImages) return;

    if (visible) {
      // Reset values
      opacity.setValue(0);
      translateY.setValue(20);
      scale.setValue(0.8);

      // Calm entrance animation - fade in with subtle translate
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 260,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle continuous floating (2-4px amplitude)
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, {
            toValue: -FLOAT_AMPLITUDE,
            duration: 2500,
            easing: EASE_SINE,
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            toValue: 0,
            duration: 2500,
            easing: EASE_SINE,
            useNativeDriver: true,
          }),
        ])
      );
      floatAnimation.start();

      // Auto-hide if duration is set
      if (state.duration && state.duration > 0) {
        const timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 220,
              easing: EASE_IN_OUT,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 6,
              duration: 220,
              easing: EASE_IN_OUT,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.96,
              duration: 220,
              easing: EASE_IN_OUT,
              useNativeDriver: true,
            }),
          ]).start();
        }, state.duration);

        return () => {
          clearTimeout(timer);
          floatAnimation.stop();
        };
      }

      return () => {
        floatAnimation.stop();
      };
    } else {
      // Calm exit animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 6,
          duration: 220,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 220,
          easing: EASE_IN_OUT,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, state.duration, hasLoadedImages]);

  const handlePress = async () => {
    // Subtle press animation - no bounce
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 150,
        easing: EASE_IN_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        easing: EASE_IN_OUT,
        useNativeDriver: true,
      }),
    ]).start();
    
    if (state.tipText) {
      setShowTip(true);
      setTimeout(() => setShowTip(false), 3000);
    }
    
    // Haptics with error handling
    try {
      const Haptics = require('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silently fail if haptics not available
    }
  };

  // Calculate position based on safe area and UI elements
  const getPositionStyle = () => {
    const baseRight = 12;
    
    switch (state.position) {
      case 'top-right':
        return {
          top: insets.top + 12,
          right: baseRight,
        };
      case 'mid-right':
        return {
          top: SCREEN_HEIGHT / 2 - MASCOT_SIZE / 2,
          right: baseRight,
        };
      case 'bottom-right':
        // Position above tab bar and FAB
        return {
          bottom: Math.max(
            insets.bottom + TAB_BAR_HEIGHT + 12,
            FAB_BOTTOM_OFFSET + FAB_HEIGHT + 12
          ),
          right: baseRight,
        };
      default:
        return {
          bottom: insets.bottom + TAB_BAR_HEIGHT + 12,
          right: baseRight,
        };
    }
  };

  // Early returns for fail-safe behavior
  if (!hasLoadedImages) {
    return null;
  }

  if (Object.keys(mascotImages).length === 0) {
    return null;
  }

  if (!visible) {
    return null;
  }

  if (!state.variant || !mascotImages[state.variant]) {
    return null;
  }

  const positionStyle = getPositionStyle();

  // Animated transform with floatY
  const animatedTransform = [
    { 
      translateY: Animated.add(translateY, floatY)
    },
    { scale },
  ];

  return (
    <View 
      style={[styles.container, positionStyle]} 
      pointerEvents="none"
    >
      <Animated.View 
        style={[
          styles.mascotContainer,
          {
            opacity,
            transform: animatedTransform,
          }
        ]}
      >
        {/* Soft aqua glow effect */}
        <Animated.View 
          style={[
            styles.glow,
            {
              width: GLOW_SIZE,
              height: GLOW_SIZE,
              borderRadius: GLOW_SIZE / 2,
              opacity: Animated.multiply(opacity, 0.25),
            },
          ]}
        />
        
        <View style={styles.mascotButton} pointerEvents="auto">
          <TouchableOpacity 
            onPress={handlePress}
            activeOpacity={0.8}
            style={styles.mascotTouchable}
          >
            <Image
              source={mascotImages[state.variant]}
              style={styles.mascotImage}
              resizeMode="contain"
              onError={(error) => {
                console.warn('MascotOverlay: Failed to load image for variant', state.variant);
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Tooltip */}
        {showTip && state.tipText && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{state.tipText}</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 998, // Below modals (1000+), below toasts (9999), above screens
    pointerEvents: 'none',
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 0,
  },
  mascotButton: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  mascotTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  tooltip: {
    position: 'absolute',
    right: '100%',
    marginRight: 12,
    top: '50%',
    marginTop: -20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tooltipText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  tooltipArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
  },
});
