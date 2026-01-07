import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Users, Sparkles } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import MascotIcon from '@/components/mascot/MascotIcon';
import * as Haptics from 'expo-haptics';

export default function UserProfileScreen() {
  const router = useRouter();

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#1A252F" />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
          <MascotIcon variant="checklist" size={120} withHalo={true} />
          
          <GlassCard style={styles.card}>
            <View style={styles.iconContainer}>
              <Users size={48} color="#0D7377" />
              <View style={styles.sparkleContainer}>
                <Sparkles size={24} color="#FFD700" />
              </View>
            </View>
            
            <Text style={styles.title}>User Profiles Coming Soon!</Text>
            
            <Text style={styles.description}>
              User profiles are part of our upcoming community features. Stay tuned!
            </Text>
          </GlassCard>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    marginTop: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
});
