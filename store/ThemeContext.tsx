import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  activeTheme: ThemeMode; // The actual theme being displayed (resolved from system if needed)
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    primaryLight: string;
    tankBackground: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const STORAGE_KEY = 'tank_guardian_theme_pref';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('light');
  const [activeTheme, setActiveTheme] = useState<ThemeMode>('light');

  // Load saved preference on mount
  useEffect(() => {
    async function loadThemerPreference() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreferenceState(saved);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    }
    loadThemerPreference();
  }, []);

  // Resolve active theme whenever preference or system theme changes
  useEffect(() => {
    if (themePreference === 'system') {
      setActiveTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setActiveTheme(themePreference);
    }
  }, [themePreference, systemColorScheme]);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const colors = activeTheme === 'dark' ? {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    primary: '#0D7377',
    primaryLight: '#5AABAE',
    tankBackground: 'rgba(255,255,255,0.05)',
  } : {
    background: '#E8F4F8',
    card: 'rgba(255, 255, 255, 0.9)',
    text: '#1A252F',
    textSecondary: '#64748B',
    border: 'rgba(0,0,0,0.05)',
    primary: '#0D7377',
    primaryLight: '#0D7377',
    tankBackground: 'rgba(13, 115, 119, 0.1)',
  };

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, activeTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
