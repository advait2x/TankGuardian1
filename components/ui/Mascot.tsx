import React, { useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type MascotVariant = 'guide' | 'checklist' | 'search';

interface MascotProps {
  variant?: MascotVariant;
  size?: 'small' | 'medium' | 'large';
  position?: 'left' | 'right' | 'center';
  showTip?: boolean;
  tipText?: string;
  onPress?: () => void;
  style?: any;
  animate?: boolean;
}

const mascotImages = {
  guide: require('@/assets/images/mascots/mascot.png'),
  checklist: require('@/assets/images/mascots/mascot-checklist.png'),
  search: require('@/assets/images/mascots/mascot-search.png'),
};

const sizeMap = {
  small: 60,
  medium: 100,
  large: 150,
};

export default function Mascot({
  variant = 'guide',
  size = 'medium',
  position = 'right',
  showTip = false,
  tipText = '',
  onPress,
  style,
  animate = true,
}: MascotProps) {
  const float = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const [tipVisible, setTipVisible] = React.useState(false);

  useEffect(() => {
    // Entrance animation
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    
    // Floating animation
    if (animate) {
      float.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [animate]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Bounce animation
    scale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1.05, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (tipText) {
      setTipVisible(true);
      setTimeout(() => setTipVisible(false), 3000);
    }

    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(float.value, [0, 1], [0, -8]);
    
    return {
      transform: [{ translateY }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const imageSize = sizeMap[size];

  const positionStyle = {
    left: position === 'left' ? 16 : position === 'center' ? '50%' : undefined,
    right: position === 'right' ? 16 : undefined,
    marginLeft: position === 'center' ? -imageSize / 2 : 0,
  };

  return (
    <Animated.View style={[styles.container, positionStyle, animatedStyle, style]}>
      {/* Glow effect */}
      <View style={[styles.glow, { width: imageSize + 20, height: imageSize + 20, borderRadius: (imageSize + 20) / 2 }]} />
      
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Image
          source={mascotImages[variant]}
          style={{
            width: imageSize,
            height: imageSize,
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>

      {/* Tooltip */}
      {tipVisible && tipText && (
        <Animated.View 
          style={[
            styles.tooltip,
            position === 'right' ? styles.tooltipLeft : styles.tooltipRight
          ]}
        >
          <Text style={styles.tooltipText}>{tipText}</Text>
          <View style={[
            styles.tooltipArrow,
            position === 'right' ? styles.arrowRight : styles.arrowLeft
          ]} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// Celebration animation component
export function MascotCelebration({ onComplete }: { onComplete?: () => void }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 10 })
    );
    
    rotation.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      onComplete?.();
    }, 2000);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  return (
    <View style={styles.celebrationContainer}>
      <Animated.View style={animatedStyle}>
        <Image
          source={mascotImages.checklist}
          style={{ width: 120, height: 120, resizeMode: 'contain' }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(78, 205, 196, 0.25)',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  tooltip: {
    position: 'absolute',
    top: '50%',
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
  tooltipLeft: {
    right: '100%',
    marginRight: 12,
  },
  tooltipRight: {
    left: '100%',
    marginLeft: 12,
  },
  tooltipText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  tooltipArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arrowRight: {
    right: -6,
    borderLeftWidth: 6,
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
  },
  arrowLeft: {
    left: -6,
    borderRightWidth: 6,
    borderRightColor: 'rgba(255, 255, 255, 0.95)',
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
});
