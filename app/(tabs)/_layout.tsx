import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Grid3X3, Users, Settings, Plus, Layers } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import MascotIcon from '@/components/mascot/MascotIcon';

import { useTheme } from '@/store/ThemeContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function FAB() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to add screen or show modal
    router.push('/(tabs)/catalog');
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.fab, animatedStyle]}
    >
      <Plus size={28} color="#fff" />
    </AnimatedTouchable>
  );
}

export default function TabsLayout() {
  const { colors, activeTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [styles.tabBar, { 
            backgroundColor: activeTheme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderTopColor: colors.border
          }],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarLabelPosition: 'below-icon',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="mytank"
          options={{
            title: 'My Tank',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <MascotIcon variant="guide" size={size + 4} withHalo={false} />
            ),
          }}
        />
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Catalog',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Grid3X3 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="aquascape"
          options={{
            title: 'Scape',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Layers size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
