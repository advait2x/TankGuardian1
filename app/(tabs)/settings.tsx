import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
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
  Star,
  Check,
  X
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useUnitSettings } from '@/store/UnitSettingsContext';
import { useTheme } from '@/store/ThemeContext';
import { supabase } from '@/utils/supabase';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentUser, isPremium, setPremium, logout, updateUser } = useApp();
  const { signOut, user: authUser } = useAuth();
  const { showToast } = useToast();
  const { unitSystem, setUnitSystem } = useUnitSettings();
  
  const [notifications, setNotifications] = useState(true);
  const [feedReminders, setFeedReminders] = useState(true);
  const [waterReminders, setWaterReminders] = useState(true);
  const [creatorMode, setCreatorMode] = useState(currentUser?.role === 'creator');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Profile editing state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Units state
  const [showUnitsModal, setShowUnitsModal] = useState(false);

  // Initialize edit form when modal opens
  useEffect(() => {
    if (showEditProfileModal) {
      setEditDisplayName(currentUser?.displayName || '');
      setEditUsername(currentUser?.handle || '');
      setEditEmail(authUser?.email || '');
      setUsernameError(null);
      setUsernameAvailable(null);
    }
  }, [showEditProfileModal, currentUser, authUser]);

  // Username format validation (no DB check since profiles table doesn't have username column)
  useEffect(() => {
    if (!editUsername || editUsername === currentUser?.handle) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    // Validate username format only (client-side)
    if (editUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameAvailable(false);
      return;
    }
    if (editUsername.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      setUsernameAvailable(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(editUsername)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      setUsernameAvailable(false);
      return;
    }

    // Format is valid - mark as available
    setUsernameAvailable(true);
    setUsernameError(null);
  }, [editUsername, currentUser?.handle]);

  const handleSaveProfile = async () => {
    if (usernameError || isCheckingUsername) return;
    
    setIsSavingProfile(true);
    
    try {
      // Update display name in auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: editDisplayName }
      });
      
      if (authError) {
        showToast('Failed to update profile', 'error');
        console.error('[Settings] Auth update error:', authError);
        return;
      }

      // Update display_name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: editDisplayName })
        .eq('id', authUser?.id);
      
      if (profileError) {
        console.error('[Settings] Profile update error:', profileError);
        // Don't fail entirely - auth metadata was updated
      }

      // Update local state
      updateUser({ 
        displayName: editDisplayName,
        handle: editUsername.toLowerCase()
      });

      showToast('Profile updated successfully!', 'success');
      setShowEditProfileModal(false);
    } catch (err) {
      console.error('[Settings] Save profile error:', err);
      showToast('Failed to save profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    
    // Sign out from Supabase (this will trigger auth state change)
    await signOut();
    
    // Clear app context state
    await logout();
    
    // Reset navigation stack to landing page
    router.replace('/landing');
  };

  const handleUpgrade = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPremium(true);
    setShowPremiumModal(false);
    showToast('Premium activated! Enjoy all features.', 'success');
  };

  const handleSaveUnits = async (system: 'imperial' | 'metric') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUnitSystem(system);
    const unitLabel = system === 'imperial' ? 'Imperial (gal, °F, in)' : 'Metric (L, °C, cm)';
    showToast(`Units set to ${unitLabel}`, 'success');
    setShowUnitsModal(false);
  };
 
  // Theme state
  const { themePreference, setThemePreference, activeTheme, colors } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleSaveTheme = async (pref: 'light' | 'dark' | 'system') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemePreference(pref);
    setShowThemeModal(false);
    showToast(`Theme set to ${pref.charAt(0).toUpperCase() + pref.slice(1)}`, 'success');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <GlassCard style={[styles.profileCard, { backgroundColor: colors.card }]} delay={100}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {currentUser?.displayName.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{currentUser?.displayName || 'Aquarist'}</Text>
                  {isPremium && <Badge label="Premium" variant="warning" size="small" />}
                </View>
                <Text style={[styles.profileHandle, { color: colors.textSecondary }]}>@{currentUser?.handle || 'user'}</Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{authUser?.email || ''}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowEditProfileModal(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Subscription Section */}
          <Animated.View entering={FadeInDown.delay(150).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>
            <GlassCard 
              style={[styles.subscriptionCard, { backgroundColor: colors.card }]}
              onPress={() => !isPremium && setShowPremiumModal(true)}
            >
              <View style={styles.subscriptionContent}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <Crown size={22} color="#FF6B35" />
                </View>
                <View style={styles.subscriptionInfo}>
                  <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                    {isPremium ? 'Premium Active' : 'Upgrade to Premium'}
                  </Text>
                  <Text style={[styles.subscriptionDesc, { color: colors.textSecondary }]}>
                    {isPremium 
                      ? 'Enjoy unlimited access to all features' 
                      : 'Get unlimited tanks, disease checks & more'}
                  </Text>
                </View>
                {!isPremium && <ChevronRight size={20} color={colors.textSecondary} />}
              </View>
              {isPremium && (
                <View style={styles.subscriptionBadge}>
                  <Star size={14} color="#FF6B35" fill="#FF6B35" />
                  <Text style={styles.subscriptionBadgeText}>Premium Member</Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Appearance Section */}
          <Animated.View entering={FadeInDown.delay(180).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
            <GlassCard style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setShowThemeModal(true)}
              >
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(96, 125, 139, 0.15)' }]}>
                  <Palette size={20} color="#607D8B" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                    {themePreference === 'system' ? 'System Default' : themePreference === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Notifications Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
            <GlassCard style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(13, 115, 119, 0.15)' }]}>
                  <Bell size={20} color="#0D7377" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Receive alerts and reminders</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: '#78909C', true: 'rgba(13, 115, 119, 0.5)' }}
                  thumbColor={notifications ? '#0D7377' : '#fff'}
                />
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)' }]}>
                  <Bell size={20} color="#FF6B35" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Feed Reminders</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Daily feeding notifications</Text>
                </View>
                <Switch
                  value={feedReminders}
                  onValueChange={(v) => setFeedReminders(v)}
                  trackColor={{ false: '#78909C', true: 'rgba(255, 107, 53, 0.5)' }}
                  thumbColor={feedReminders ? '#FF6B35' : '#fff'}
                />
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(78, 205, 196, 0.15)' }]}>
                  <Bell size={20} color="#4ECDC4" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Water Change Reminders</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Weekly maintenance alerts</Text>
                </View>
                <Switch
                  value={waterReminders}
                  onValueChange={(v) => setWaterReminders(v)}
                  trackColor={{ false: '#78909C', true: 'rgba(78, 205, 196, 0.5)' }}
                  thumbColor={waterReminders ? '#4ECDC4' : '#fff'}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(250).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
            <GlassCard style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
              <View style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(156, 39, 176, 0.15)' }]}>
                  <Star size={20} color="#9C27B0" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Creator Mode</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Enable public tank gallery</Text>
                </View>
                <Switch
                  value={creatorMode}
                  onValueChange={handleToggleCreatorMode}
                  trackColor={{ false: '#78909C', true: 'rgba(156, 39, 176, 0.5)' }}
                  thumbColor={creatorMode ? '#9C27B0' : '#fff'}
                />
              </View>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setShowUnitsModal(true)}
              >
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                  <Globe size={20} color="#2196F3" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Units</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                    {unitSystem === 'imperial' ? 'Imperial (gal, °F, in)' : 'Metric (L, °C, cm)'}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                  <Shield size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Manage your data</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Support Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
            <GlassCard style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(0, 188, 212, 0.15)' }]}>
                  <HelpCircle size={20} color="#00BCD4" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Help Center</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>FAQs and guides</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                  <MessageCircle size={20} color="#FFC107" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Contact Us</Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Get in touch</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
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
          <Text style={styles.versionText}>TankGuardian v0.5.2</Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        title="Edit Profile"
        size="large"
      >
        <View style={styles.editProfileContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.usernameInputContainer}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={[styles.textInput, styles.usernameInput]}
                value={editUsername}
                onChangeText={(text) => setEditUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isCheckingUsername && (
                <ActivityIndicator size="small" color="#0D7377" style={styles.usernameIndicator} />
              )}
              {!isCheckingUsername && usernameAvailable === true && (
                <Check size={20} color="#10B981" style={styles.usernameIndicator} />
              )}
              {!isCheckingUsername && usernameAvailable === false && (
                <X size={20} color="#EF4444" style={styles.usernameIndicator} />
              )}
            </View>
            {usernameError && (
              <Text style={styles.usernameErrorText}>{usernameError}</Text>
            )}
            {usernameAvailable === true && !usernameError && (
              <Text style={styles.usernameSuccessText}>Username is available!</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, styles.disabledInput]}
              value={editEmail}
              editable={false}
              placeholder="your@email.com"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.inputHint}>Email cannot be changed</Text>
          </View>

          <View style={styles.editProfileActions}>
            <Button
              title="Cancel"
              onPress={() => setShowEditProfileModal(false)}
              variant="ghost"
            />
            <Button
              title={isSavingProfile ? "Saving..." : "Save Changes"}
              onPress={handleSaveProfile}
              variant="primary"
              disabled={!!usernameError || isCheckingUsername || isSavingProfile}
            />
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title="App Appearance"
        size="medium"
      >
        <View style={styles.unitsContent}>
          <Text style={styles.unitSectionSubtitle}>
            Choose your preferred theme
          </Text>

          <View style={styles.unitOptions}>
            <TouchableOpacity
              style={[
                styles.unitSystemOption,
                themePreference === 'light' && styles.unitSystemOptionSelected
              ]}
              onPress={() => handleSaveTheme('light')}
            >
              <View style={styles.unitSystemHeader}>
                <Text style={[
                  styles.unitSystemTitle,
                  themePreference === 'light' && styles.unitSystemTitleSelected
                ]}>Light Mode</Text>
                {themePreference === 'light' && <Check size={20} color="#0D7377" />}
              </View>
              <Text style={styles.unitSystemDesc}>
                Classic clean look
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.unitSystemOption,
                themePreference === 'dark' && styles.unitSystemOptionSelected
              ]}
              onPress={() => handleSaveTheme('dark')}
            >
              <View style={styles.unitSystemHeader}>
                <Text style={[
                  styles.unitSystemTitle,
                  themePreference === 'dark' && styles.unitSystemTitleSelected
                ]}>Dark Mode</Text>
                {themePreference === 'dark' && <Check size={20} color="#0D7377" />}
              </View>
              <Text style={styles.unitSystemDesc}>
                Easy on the eyes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitSystemOption,
                themePreference === 'system' && styles.unitSystemOptionSelected
              ]}
              onPress={() => handleSaveTheme('system')}
            >
              <View style={styles.unitSystemHeader}>
                <Text style={[
                  styles.unitSystemTitle,
                  themePreference === 'system' && styles.unitSystemTitleSelected
                ]}>System Default</Text>
                {themePreference === 'system' && <Check size={20} color="#0D7377" />}
              </View>
              <Text style={styles.unitSystemDesc}>
                Matches your device settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Units Modal */}
      <Modal
        visible={showUnitsModal}
        onClose={() => setShowUnitsModal(false)}
        title="Unit System"
        size="medium"
      >
        <View style={styles.unitsContent}>
          <Text style={styles.unitSectionSubtitle}>
            Choose your preferred measurement system
          </Text>

          <View style={styles.unitOptions}>
            <TouchableOpacity
              style={[
                styles.unitSystemOption,
                unitSystem === 'imperial' && styles.unitSystemOptionSelected
              ]}
              onPress={() => handleSaveUnits('imperial')}
            >
              <View style={styles.unitSystemHeader}>
                <Text style={[
                  styles.unitSystemTitle,
                  unitSystem === 'imperial' && styles.unitSystemTitleSelected
                ]}>Imperial</Text>
                {unitSystem === 'imperial' && <Check size={20} color="#0D7377" />}
              </View>
              <Text style={styles.unitSystemDesc}>
                Gallons • Fahrenheit • Inches
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitSystemOption,
                unitSystem === 'metric' && styles.unitSystemOptionSelected
              ]}
              onPress={() => handleSaveUnits('metric')}
            >
              <View style={styles.unitSystemHeader}>
                <Text style={[
                  styles.unitSystemTitle,
                  unitSystem === 'metric' && styles.unitSystemTitleSelected
                ]}>Metric</Text>
                {unitSystem === 'metric' && <Check size={20} color="#0D7377" />}
              </View>
              <Text style={styles.unitSystemDesc}>
                Liters • Celsius • Centimeters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  profileEmail: {
    fontSize: 12,
    color: '#94A3B8',
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
  // Edit Profile Modal
  editProfileContent: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  disabledInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    color: '#94A3B8',
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#64748B',
    marginRight: 2,
    fontWeight: '500',
  },
  usernameInput: {
    flex: 1,
  },
  usernameIndicator: {
    marginLeft: 8,
  },
  usernameErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  usernameSuccessText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  editProfileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  // Units Modal
  unitsContent: {
    gap: 24,
  },
  unitSection: {
    gap: 12,
  },
  unitSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  unitOptions: {
    gap: 8,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitOptionSelected: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.08)',
  },
  unitOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  unitOptionTextSelected: {
    color: '#0D7377',
    fontWeight: '600',
  },
  unitSectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  unitSystemOption: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitSystemOptionSelected: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
  },
  unitSystemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  unitSystemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  unitSystemTitleSelected: {
    color: '#0D7377',
  },
  unitSystemDesc: {
    fontSize: 13,
    color: '#94A3B8',
  },
  // Premium Modal
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

