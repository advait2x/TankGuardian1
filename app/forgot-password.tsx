import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Mail } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MascotIcon from '@/components/mascot/MascotIcon';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/utils/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string>('');

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      // Don't specify redirectTo - let Supabase handle it via their default page
      // User will click the link, then manually open the app to reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        showToast(error.message || 'Failed to send reset email. Please try again.', 'error');
        return;
      }

      setEmailSent(true);
      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
      console.error('[ForgotPassword] Exception:', error);
      showToast('Failed to send reset email. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#2C3E50" />
            </TouchableOpacity>
          </Animated.View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <Animated.View 
              entering={FadeInDown.delay(100).duration(220)}
              style={styles.logoContainer}
            >
              <View style={styles.logoIcon}>
                <MascotIcon variant="guide" size={80} withHalo={false} />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.Text 
              entering={FadeInDown.delay(200).duration(220)}
              style={styles.title}
            >
              {emailSent ? 'Check your email' : 'Forgot password?'}
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(300).duration(220)}
              style={styles.subtitle}
            >
              {emailSent 
                ? "We've sent a password reset link to your email. Click the link in the email, then come back to the app to reset your password." 
                : 'Enter your email and we\'ll send you instructions to reset your password.'}
            </Animated.Text>

            {!emailSent && (
              <>
                {/* Form */}
                <Animated.View 
                  entering={FadeInDown.delay(400).duration(220)}
                  style={styles.form}
                >
                  <Input
                    label="Email"
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={error}
                    leftIcon={<Mail size={20} color="#64748B" />}
                  />
                </Animated.View>

                {/* Actions */}
                <Animated.View 
                  entering={FadeInDown.delay(500).duration(220)}
                  style={styles.actions}
                >
                  <Button
                    title="Send Reset Link"
                    onPress={handleResetPassword}
                    variant="primary"
                    size="large"
                    fullWidth
                    loading={isLoading}
                  />
                </Animated.View>
              </>
            )}

            {emailSent && (
              <Animated.View 
                entering={FadeInDown.delay(400).duration(220)}
                style={styles.actions}
              >
                <Button
                  title="Open Reset Password Screen"
                  onPress={() => router.push('/reset-password')}
                  variant="primary"
                  size="large"
                  fullWidth
                />
                
                <TouchableOpacity 
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendText}>Didn't receive the email? Send again</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A252F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    marginBottom: 24,
  },
  actions: {
    gap: 20,
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    color: '#0D7377',
    fontWeight: '500',
    textAlign: 'center',
  },
});
