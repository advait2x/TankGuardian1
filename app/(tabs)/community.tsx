import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Users, Sparkles } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import MascotIcon from '@/components/mascot/MascotIcon';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
          <MascotIcon variant="checklist" size={120} withHalo={true} />
          
          <GlassCard style={styles.card}>
            <View style={styles.iconContainer}>
              <Users size={48} color="#0D7377" />
              <View style={styles.sparkleContainer}>
                <Sparkles size={24} color="#FFD700" />
              </View>
            </View>
            
            <Text style={styles.title}>Community Coming Soon!</Text>
            
            <Text style={styles.description}>
              We're building something amazing! Connect with fellow aquarium enthusiasts, share your tanks, and learn from the community.
            </Text>
            
            <View style={styles.features}>
              <View style={styles.feature}>
                <Text style={styles.featureBullet}>🐠</Text>
                <Text style={styles.featureText}>Share tank photos & setups</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureBullet}>💬</Text>
                <Text style={styles.featureText}>Get advice from experts</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureBullet}>🏆</Text>
                <Text style={styles.featureText}>Join challenges & events</Text>
              </View>
            </View>
            
            <Text style={styles.comingSoon}>Stay tuned for updates!</Text>
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
    marginBottom: 32,
  },
  features: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureBullet: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  comingSoon: {
    fontSize: 14,
    color: '#0D7377',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
