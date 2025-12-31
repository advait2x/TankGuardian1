import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Bell, Shield, Search, Users, Fish, Droplets } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Mascot from '@/components/ui/Mascot';

const { width } = Dimensions.get('window');

const features = [
  {
    icon: <Bell size={28} color="#0D7377" />,
    title: 'Smart Reminders',
    description: 'Never forget a water change or feeding. Auto-generated schedules for your tank.',
  },
  {
    icon: <Shield size={28} color="#0D7377" />,
    title: 'Compatibility Checks',
    description: 'Know before you add. Prevent aggression and overstocking disasters.',
  },
  {
    icon: <Search size={28} color="#0D7377" />,
    title: 'Disease Detection',
    description: 'Upload a photo and get instant analysis with treatment steps.',
  },
  {
    icon: <Users size={28} color="#0D7377" />,
    title: 'Community',
    description: 'Connect with hobbyists, share your tanks, and learn from experts.',
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View 
            entering={FadeIn.duration(600)}
            style={styles.heroSection}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Fish size={32} color="#fff" />
              </View>
              <Text style={styles.logoText}>TankGuardian</Text>
            </View>
            
            <Animated.Text 
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.heroTitle}
            >
              Keep fish alive.{'\n'}Prevent disasters.
            </Animated.Text>
            
            <Animated.Text 
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.heroSubtitle}
            >
              Your pocket aquarium assistant that guides you through setup, reminds you of tasks, and helps diagnose problems.
            </Animated.Text>
            
            {/* Mascot */}
            <Animated.View
              entering={FadeIn.delay(600).duration(800)}
              style={styles.mascotContainer}
            >
              <Mascot 
                variant="guide" 
                size="large" 
                position="center"
                tipText="Hey! Ready to keep your fish happy?"
              />
            </Animated.View>
          </Animated.View>

          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Everything you need</Text>
            
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <GlassCard 
                  key={feature.title}
                  style={styles.featureCard}
                  delay={index * 100}
                >
                  <View style={styles.featureIconContainer}>
                    {feature.icon}
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </GlassCard>
              ))}
            </View>
          </View>

          {/* Social Proof */}
          <GlassCard style={styles.socialProof} delay={500}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>10K+</Text>
                <Text style={styles.statLabel}>Happy Fishkeepers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>50K+</Text>
                <Text style={styles.statLabel}>Fish Saved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4.9★</Text>
                <Text style={styles.statLabel}>App Rating</Text>
              </View>
            </View>
          </GlassCard>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Button
              title="Get Started Free"
              onPress={() => router.push('/signup')}
              variant="primary"
              size="large"
              fullWidth
            />
            <Button
              title="I already have an account"
              onPress={() => router.push('/login')}
              variant="ghost"
              size="medium"
              fullWidth
            />
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Join the community of aquarium enthusiasts who never lose another fish.
          </Text>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A252F',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  mascotContainer: {
    marginTop: 32,
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A252F',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    padding: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  socialProof: {
    marginBottom: 32,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D7377',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  ctaSection: {
    gap: 12,
    marginBottom: 24,
  },
  footer: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
