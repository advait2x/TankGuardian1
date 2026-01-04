import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Calm toast animation config
const SPRING_CONFIG = {
  damping: 30,
  stiffness: 400,
  overshootClamping: true,
};

const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

export default function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Haptic feedback based on type
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      opacity.value = withTiming(1, { duration: 220, easing: EASE_IN_OUT });
      translateY.value = withSpring(0, SPRING_CONFIG);

      // Auto hide with calm exit
      setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 220, easing: EASE_IN_OUT });
        opacity.value = withDelay(100, withTiming(0, { duration: 180 }, () => {
          if (onHide) {
            runOnJS(onHide)();
          }
        }));
      }, duration);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const icons = {
    success: <CheckCircle size={20} color="#fff" />,
    error: <AlertCircle size={20} color="#fff" />,
    info: <Info size={20} color="#fff" />,
    warning: <AlertTriangle size={20} color="#fff" />,
  };

  const colors = {
    success: '#4ECDC4',
    error: '#E57373',
    info: '#0D7377',
    warning: '#FFA726',
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.toast, { backgroundColor: colors[type] }]}>
        {icons[type]}
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// Toast Context for global toast management
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info' as ToastType,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: width - 40,
  },
  message: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
