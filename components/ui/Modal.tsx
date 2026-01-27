import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, Dimensions, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/store/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Smooth spring for snapping
const SNAP_SPRING = {
  damping: 50,
  stiffness: 400,
  overshootClamping: true,
};

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  scrollable?: boolean;
  enableDrag?: boolean;
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium',
  scrollable = true,
  enableDrag = true,
}: ModalProps) {
  const { colors, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // modalHeight represents the height of the modal
  const modalHeight = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);

  // Define snap points as heights
  const HALF_HEIGHT = SCREEN_HEIGHT * 0.5;
  const FULL_HEIGHT = SCREEN_HEIGHT - insets.top - 20;
  const MIN_HEIGHT = 100;

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      // Start from 0 height, animate to half screen
      modalHeight.value = 0;
      backdropOpacity.value = 0;
      
      requestAnimationFrame(() => {
        backdropOpacity.value = withTiming(0.5, { duration: 250 });
        modalHeight.value = withTiming(HALF_HEIGHT, { duration: 300 });
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalHeight.value = withTiming(0, { duration: 250 });
    }
  }, [visible, HALF_HEIGHT]);

  // Pan gesture - TRUE 1:1 finger tracking
  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStartHeight.value = modalHeight.value;
    })
    .onUpdate((event) => {
      // Dragging DOWN (positive translationY) = DECREASE height
      // Dragging UP (negative translationY) = INCREASE height
      const newHeight = dragStartHeight.value - event.translationY;
      // Clamp between min and full height
      modalHeight.value = Math.max(MIN_HEIGHT, Math.min(FULL_HEIGHT, newHeight));
      
      // Backdrop fades based on height
      const progress = modalHeight.value / FULL_HEIGHT;
      backdropOpacity.value = Math.max(0.3, Math.min(0.6, progress * 0.6));
    })
    .onEnd((event) => {
      const currentHeight = modalHeight.value;
      const velocity = event.velocityY;
      
      // Fast swipe down = dismiss
      if (velocity > 800) {
        runOnJS(triggerHaptic)();
        backdropOpacity.value = withTiming(0, { duration: 150 });
        modalHeight.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(closeModal)();
        });
        return;
      }
      
      // Fast swipe up = full screen
      if (velocity < -800) {
        runOnJS(triggerHaptic)();
        modalHeight.value = withSpring(FULL_HEIGHT, SNAP_SPRING);
        backdropOpacity.value = withTiming(0.6, { duration: 150 });
        return;
      }
      
      // Snap based on height
      const DISMISS_HEIGHT = SCREEN_HEIGHT * 0.25;
      const MID_POINT = (HALF_HEIGHT + FULL_HEIGHT) / 2;
      
      if (currentHeight < DISMISS_HEIGHT) {
        // Dismiss
        runOnJS(triggerHaptic)();
        backdropOpacity.value = withTiming(0, { duration: 150 });
        modalHeight.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(closeModal)();
        });
      } else if (currentHeight < MID_POINT) {
        // Snap to half
        runOnJS(triggerHaptic)();
        modalHeight.value = withSpring(HALF_HEIGHT, SNAP_SPRING);
        backdropOpacity.value = withTiming(0.5, { duration: 150 });
      } else {
        // Snap to full
        runOnJS(triggerHaptic)();
        modalHeight.value = withSpring(FULL_HEIGHT, SNAP_SPRING);
        backdropOpacity.value = withTiming(0.6, { duration: 150 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    height: modalHeight.value,
  }));

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

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
      <GestureHandlerRootView style={styles.container}>
        {/* Backdrop */}
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        
        {/* Modal Content */}
        <Animated.View style={[
          styles.modal, 
          modalStyle, 
          { backgroundColor: activeTheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }
        ]}>
          <View style={styles.modalInner}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
              keyboardVerticalOffset={0}
            >
              {/* Draggable Handle */}
              {enableDrag ? (
                <GestureDetector gesture={panGesture}>
                  <Animated.View style={styles.handleContainer}>
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />
                  </Animated.View>
                </GestureDetector>
              ) : (
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: colors.border }]} />
                </View>
              )}
              
              {/* Header */}
              {(title || showCloseButton) && (
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                  {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                  {showCloseButton && (
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <X size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Content */}
              {scrollable ? (
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
              ) : (
                <View style={[styles.scrollView, { paddingBottom: contentPaddingBottom }]}>
                  {children}
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  },
  modalInner: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#D4D4D8',
    borderRadius: 3,
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
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexGrow: 1,
    minHeight: 100,
  },
});