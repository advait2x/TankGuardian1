import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { 
  User, 
  Bell, 
  Crown, 
  Palette, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Globe,
  Shield,
  MessageCircle,
  Star
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, isPremium, setPremium, logout, updateUser } = useApp();
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [feedReminders, setFeedReminders] = useState(true);
  const [waterReminders, setWaterReminders] = useState(true);
  const [creatorMode, setCreatorMode] = useState(currentUser?.role === 'creator');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleToggleNotifications = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(value);
    showToast(value ? 'Notifications enabled' : 'Notifications disabled', 'info');
  };

  const handleToggleCreatorMode = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreatorMode(value);
    updateUser({ role: value ? 'creator' : 'user' });
    showToast(value ? 'Creator mode enabled!' : 'Creator mode disabled', 'success');
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logout();
    router.replace('/landing');
  };

  const handleUpgrade = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPremium(true);
    setShowPremiumModal(false);
    showToast('Premium activated! Enjoy all features.', 'success');
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <GlassCard style={styles.profileCard} delay={100}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {currentUser?.displayName.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName}>{currentUser?.displayName || 'Aquarist'}</Text>
                  {isPremium && <Badge label="Premium" variant="warning" size="small" />}
                </View>
                <Text style={styles.profileHandle}>@{currentUser?.handle || 'user'}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Subscription Section */}
          <Animated.View entering={FadeInDown.delay(150).duration(220)}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <GlassCard 
              style={styles.subscriptionCard}
              onPress={() => !isPremium && setShowPremiumModal(true)}
            >
              <View style={styles.subscriptionContent}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <Crown size={22} color="#FF6B35" />
                </View>
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionTitle}>
                    {isPremium ? 'Premium Active' : 'Upgrade to Premium'}
                  </Text>
                  <Text style={styles.subscriptionDesc}>
                    {isPremium 
                      ? 'Enjoy unlimited access to all features' 
                      : 'Get unlimited tanks, disease checks & more'}
                  </Text>
                </View>
                {!isPremium && <ChevronRight size={20} color="#64748B" />}
              </View>
              {isPremium && (
                <View style={styles.subscriptionBadge}>
                  <Star size={14} color="#FF6B35" fill="#FF6B35" />
                  <Text style={styles.subscriptionBadgeText}>Premium Member</Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Notifications Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(220)}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <GlassCard style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(13, 115, 119, 0.15)' }]}>
                  <Bell size={20} color="#0D7377" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>Receive alerts and reminders</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: '#E2E8F0', true: 'rgba(13, 115, 119, 0.3)' }}
                  thumbColor={notifications ? '#0D7377' : '#fff'}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <Bell size={20} color="#FF6B35" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Feed Reminders</Text>
                  <Text style={styles.settingDesc}>Daily feeding notifications</Text>
                </View>
                <Switch
                  value={feedReminders}
                  onValueChange={(v) => setFeedReminders(v)}
                  trackColor={{ false: '#E2E8F0', true: 'rgba(255, 107, 53, 0.3)' }}
                  thumbColor={feedReminders ? '#FF6B35' : '#fff'}
                />
              </View>

              <View style={styles.settingDivider} />

              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(78, 205, 196, 0.15)' }]}>
                  <Bell size={20} color="#4ECDC4" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Water Change Reminders</Text>
                  <Text style={styles.settingDesc}>Weekly maintenance alerts</Text>
                </View>
                <Switch
                  value={waterReminders}
                  onValueChange={(v) => setWaterReminders(v)}
                  trackColor={{ false: '#E2E8F0', true: 'rgba(78, 205, 196, 0.3)' }}
                  thumbColor={waterReminders ? '#4ECDC4' : '#fff'}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(250).duration(220)}>
            <Text style={styles.sectionTitle}>Account</Text>
            <GlassCard style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(156, 39, 176, 0.15)' }]}>
                  <Star size={20} color="#9C27B0" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Creator Mode</Text>
                  <Text style={styles.settingDesc}>Enable public tank gallery</Text>
                </View>
                <Switch
                  value={creatorMode}
                  onValueChange={handleToggleCreatorMode}
                  trackColor={{ false: '#E2E8F0', true: 'rgba(156, 39, 176, 0.3)' }}
                  thumbColor={creatorMode ? '#9C27B0' : '#fff'}
                />
              </View>

              <View style={styles.settingDivider} />

              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Globe size={20} color="#2196F3" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Units</Text>
                  <Text style={styles.settingDesc}>Gallons, °F</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                  <Shield size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Privacy</Text>
                  <Text style={styles.settingDesc}>Manage your data</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Support Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(220)}>
            <Text style={styles.sectionTitle}>Support</Text>
            <GlassCard style={styles.settingsGroup}>
              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(0, 188, 212, 0.15)' }]}>
                  <HelpCircle size={20} color="#00BCD4" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Help Center</Text>
                  <Text style={styles.settingDesc}>FAQs and guides</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                  <MessageCircle size={20} color="#FFC107" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Contact Us</Text>
                  <Text style={styles.settingDesc}>Get in touch</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(350).duration(220)}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => setShowLogoutModal(true)}
            >
              <LogOut size={20} color="#E57373" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* App Version */}
          <Text style={styles.versionText}>TankGuardian v1.0.0</Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        title="Upgrade to Premium"
        size="medium"
      >
        <View style={styles.premiumContent}>
          <View style={styles.premiumIcon}>
            <Crown size={40} color="#FF6B35" />
          </View>
          <Text style={styles.premiumTitle}>Unlock All Features</Text>
          <Text style={styles.premiumDesc}>
            Get unlimited tanks, advanced disease checks, full community access, and more!
          </Text>
          
          <View style={styles.premiumBenefits}>
            <Text style={styles.premiumBenefit}>✓ Unlimited tanks</Text>
            <Text style={styles.premiumBenefit}>✓ Disease check history</Text>
            <Text style={styles.premiumBenefit}>✓ Advanced reminders</Text>
            <Text style={styles.premiumBenefit}>✓ Creator messaging</Text>
          </View>

          <Button
            title="Start Premium - $6.99/month"
            onPress={handleUpgrade}
            variant="secondary"
            fullWidth
          />
          <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
            <Text style={styles.premiumSkip}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Log Out?"
        size="small"
      >
        <View style={styles.logoutContent}>
          <Text style={styles.logoutConfirmText}>
            Are you sure you want to log out? Your data will be saved.
          </Text>
          <View style={styles.logoutActions}>
            <Button
              title="Cancel"
              onPress={() => setShowLogoutModal(false)}
              variant="ghost"
            />
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="danger"
            />
          </View>
        </View>
      </Modal>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  profileCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
  },
  profileHandle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  subscriptionCard: {
    marginBottom: 24,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  subscriptionDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  settingsGroup: {
    marginBottom: 24,
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E57373',
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
  },
  bottomPadding: {
    height: 20,
  },
  premiumContent: {
    alignItems: 'center',
    gap: 12,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A252F',
  },
  premiumDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumBenefits: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    padding: 14,
    borderRadius: 12,
    width: '100%',
    marginVertical: 8,
  },
  premiumBenefit: {
    fontSize: 14,
    color: '#0D7377',
    paddingVertical: 4,
    fontWeight: '500',
  },
  premiumSkip: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  logoutContent: {
    gap: 16,
  },
  logoutConfirmText: {
    fontSize: 15,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 22,
  },
  logoutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
