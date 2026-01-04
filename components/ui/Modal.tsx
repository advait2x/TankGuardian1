import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, Dimensions, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

// Calm modal animation config
const SPRING_CONFIG = {
  damping: 30,
  stiffness: 400,
  overshootClamping: true,
};

const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium',
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);
  const modalOpacity = useSharedValue(1); // Start visible when modal is shown

  useEffect(() => {
    if (visible) {
      // Reset position and show
      translateY.value = 8; // Start with subtle offset
      backdropOpacity.value = 0;
      modalOpacity.value = 0;
      
      // Animate in with calm, premium feel
      requestAnimationFrame(() => {
        backdropOpacity.value = withTiming(1, { duration: 220, easing: EASE_IN_OUT });
        modalOpacity.value = withTiming(1, { duration: 220, easing: EASE_IN_OUT });
        translateY.value = withSpring(0, SPRING_CONFIG);
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(8, { duration: 220, easing: EASE_IN_OUT });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: modalOpacity.value,
  }));

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const sizeStyles = {
    small: { 
      maxHeight: height * 0.4,
      minHeight: Math.min(300, height * 0.3),
    },
    medium: { 
      maxHeight: height * 0.6,
      minHeight: Math.min(400, height * 0.4),
    },
    large: { 
      maxHeight: height * 0.8,
      minHeight: Math.min(500, height * 0.5),
    },
    full: { 
      maxHeight: height * 0.9,
      minHeight: height * 0.7,
    },
  };

  // Calculate content padding with safe area
  const contentPaddingBottom = insets.bottom + 16;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.container}>
        {/* Backdrop - owned by modal */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        
        {/* Modal Content - must be above backdrop */}
        <Animated.View 
          style={[styles.modal, sizeStyles[size], modalStyle]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={0}
          >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          )}
          
            {/* Content - Now properly scrollable with safe area */}
          <ScrollView
            style={styles.scrollView}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: contentPaddingBottom }
              ]}
            showsVerticalScrollIndicator={false}
            bounces={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1,
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
    maxHeight: '90%',
    zIndex: 2,
    width: '100%',
    opacity: 1, // Explicitly set opacity
  },
  keyboardView: {
    width: '100%',
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D4D4D8',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexGrow: 1,
    minHeight: 100,
  },
});