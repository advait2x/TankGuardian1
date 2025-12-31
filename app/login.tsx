import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Mail, Lock, Fish } from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';

export default function LoginScreen() {
  const router = useRouter();
  const { login, hasCompletedOnboarding } = useApp();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        showToast('Welcome back!', 'success');
        if (hasCompletedOnboarding) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (error) {
      showToast('Login failed. Please try again.', 'error');
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
              entering={FadeInDown.delay(100).duration(400)}
              style={styles.logoContainer}
            >
              <View style={styles.logoIcon}>
                <Fish size={32} color="#fff" />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.Text 
              entering={FadeInDown.delay(200).duration(400)}
              style={styles.title}
            >
              Welcome back
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(300).duration(400)}
              style={styles.subtitle}
            >
              Sign in to check on your tank
            </Animated.Text>

            {/* Form */}
            <Animated.View 
              entering={FadeInDown.delay(400).duration(400)}
              style={styles.form}
            >
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon={<Mail size={20} color="#64748B" />}
              />
              
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={errors.password}
                leftIcon={<Lock size={20} color="#64748B" />}
              />
              
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Actions */}
            <Animated.View 
              entering={FadeInDown.delay(500).duration(400)}
              style={styles.actions}
            >
              <Button
                title="Sign In"
                onPress={handleLogin}
                variant="primary"
                size="large"
                fullWidth
                loading={isLoading}
              />
              
              <View style={styles.signupPrompt}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text style={styles.signupLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0D7377',
    fontWeight: '500',
  },
  actions: {
    gap: 20,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 15,
    color: '#64748B',
  },
  signupLink: {
    fontSize: 15,
    color: '#0D7377',
    fontWeight: '600',
  },
});
