import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MascotIcon from '@/components/mascot/MascotIcon';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/utils/supabase';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Handle deep link and extract tokens
    const handleDeepLink = async () => {
      try {
        // Get the initial URL if app was opened via link
        const url = await Linking.getInitialURL();
        
        // Extract access_token and refresh_token from URL or params
        const accessToken = params.access_token as string || extractTokenFromUrl(url, 'access_token');
        const refreshToken = params.refresh_token as string || extractTokenFromUrl(url, 'refresh_token');
        const type = params.type as string || extractTokenFromUrl(url, 'type');

        if (type === 'recovery' && accessToken) {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('[ResetPassword] Session error:', error);
            showToast('Invalid or expired reset link. Please request a new one.', 'error');
            router.replace('/forgot-password');
            return;
          }

          if (data.session) {
            setIsValidSession(true);
          }
        } else {
          // Check if there's already a valid session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            showToast('Invalid or expired reset link. Please request a new one.', 'error');
            router.replace('/forgot-password');
          }
        }
      } catch (error) {
        console.error('[ResetPassword] Error handling deep link:', error);
        showToast('Something went wrong. Please try again.', 'error');
        router.replace('/forgot-password');
      }
    };
    
    handleDeepLink();
  }, [params]);

  const extractTokenFromUrl = (url: string | null, paramName: string): string | null => {
    if (!url) return null;
    try {
      const parsed = Linking.parse(url);
      return parsed.queryParams?.[paramName] as string || null;
    } catch {
      return null;
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        showToast(error.message || 'Failed to reset password. Please try again.', 'error');
        return;
      }

      showToast('Password updated successfully!', 'success');
      
      // Navigate back to login after a short delay
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (error) {
      console.error('[ResetPassword] Exception:', error);
      showToast('Failed to reset password. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <View style={styles.container}>
        <AnimatedBackground variant="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Validating reset link...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
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
              Create new password
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(300).duration(220)}
              style={styles.subtitle}
            >
              Enter a new password for your account
            </Animated.Text>

            {/* Form */}
            <Animated.View 
              entering={FadeInDown.delay(400).duration(220)}
              style={styles.form}
            >
              <Input
                label="New Password"
                placeholder="Enter your new password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={errors.password}
                leftIcon={<Lock size={20} color="#64748B" />}
              />
              
              <Input
                label="Confirm Password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                error={errors.confirmPassword}
                leftIcon={<Lock size={20} color="#64748B" />}
              />
            </Animated.View>

            {/* Actions */}
            <Animated.View 
              entering={FadeInDown.delay(500).duration(220)}
              style={styles.actions}
            >
              <Button
                title="Update Password"
                onPress={handleResetPassword}
                variant="primary"
                size="large"
                fullWidth
                loading={isLoading}
              />
            </Animated.View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});
