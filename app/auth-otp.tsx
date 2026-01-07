import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Mail, Shield } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MascotIcon from '@/components/mascot/MascotIcon';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/utils/supabase';
import * as Haptics from 'expo-haptics';

export default function AuthOTPScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});

  const validateEmail = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = () => {
    const newErrors: typeof errors = {};
    
    if (!code) {
      newErrors.code = 'Code is required';
    } else if (code.length !== 6) {
      newErrors.code = 'Code must be 6 digits';
    } else if (!/^\d+$/.test(code)) {
      newErrors.code = 'Code must contain only numbers';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        showToast(error.message || 'Failed to send code', 'error');
        return;
      }

      showToast('Code sent! Check your email.', 'success');
      setCodeSent(true);
      setErrors({});
    } catch (error) {
      showToast('Failed to send code. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) return;
    
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'email',
      });

      if (error) {
        showToast(error.message || 'Invalid code', 'error');
        return;
      }

      if (data.session) {
        showToast('Welcome!', 'success');
        // Routing gate will handle navigation based on auth state
      }
    } catch (error) {
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    setErrors({});
    await handleSendCode();
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (codeSent) {
      setCodeSent(false);
      setCode('');
      setErrors({});
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#0D7377" />
            </TouchableOpacity>
          </Animated.View>

          {/* Mascot */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.mascotContainer}>
            <MascotIcon size={120} variant="guide" />
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.titleContainer}>
            <Text style={styles.title}>
              {codeSent ? 'Check Your Email' : 'Sign In with Email'}
            </Text>
            <Text style={styles.subtitle}>
              {codeSent 
                ? `We sent a 6-digit code to ${email}`
                : 'Enter your email to receive a login code'
              }
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
            {!codeSent ? (
              <>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#0D7377" style={styles.inputIcon} />
                  <Input
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setErrors({});
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email}
                  />
                </View>

                <Button
                  title="Send Code"
                  onPress={handleSendCode}
                  isLoading={isLoading}
                  style={styles.button}
                />
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Shield size={20} color="#0D7377" style={styles.inputIcon} />
                  <Input
                    placeholder="000000"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text);
                      setErrors({});
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.code}
                  />
                </View>

                <Button
                  title="Verify Code"
                  onPress={handleVerifyCode}
                  isLoading={isLoading}
                  style={styles.button}
                />

                <TouchableOpacity 
                  onPress={handleResendCode}
                  style={styles.resendContainer}
                  disabled={isLoading}
                >
                  <Text style={styles.resendText}>
                    Didn't receive it? <Text style={styles.resendLink}>Resend code</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Footer */}
          {!codeSent && (
            <Animated.View entering={FadeInDown.delay(500)} style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text style={styles.link}>Terms</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A252F',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  inputIcon: {
    marginTop: 16,
  },
  button: {
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  resendLink: {
    color: '#0D7377',
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: '#0D7377',
    fontWeight: '600',
  },
});
