import "../global.css";
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { ThemeProvider, useTheme } from "@/store/ThemeContext";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { AppProvider } from "@/store/AppContext";
import { AuthProvider } from "@/store/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { MascotProvider } from "@/components/mascot/MascotContext";
import { UnitSettingsProvider } from "@/store/UnitSettingsContext";
import { QueryClientProvider } from "@/store/QueryClientProvider";
import { listFishSpecies } from "@/utils/remoteFishCatalog";
import { preloadCatalogImages } from "@/utils/imagePreloader";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { activeTheme } = useTheme();
  
  const CurrentTheme = activeTheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#121212', // Deep dark background
      primary: '#0D7377',
      card: '#1E1E1E',
      text: '#FFFFFF',
      border: '#333333',
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#E8F4F8',
      primary: '#0D7377',
    }
  };

  return (
    <NavigationThemeProvider value={CurrentTheme}>
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: CurrentTheme.colors.background },
        })}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Dev-only smoke test for Supabase catalog
  useEffect(() => {
    if (__DEV__) {
      // Run async smoke test without blocking render
      listFishSpecies({ limit: 1 })
        .then(result => {
          if (result && result.items.length > 0) {
            console.log('[Supabase] catalog ok ✓');
          } else {
            console.warn('[Supabase] catalog failed (fallback active)');
          }
        })
        .catch(() => {
          console.warn('[Supabase] catalog failed (fallback active)');
        });
    }
  }, []);

  // Preload all catalog images on app startup
  useEffect(() => {
    // Start preloading images in the background
    preloadCatalogImages();
  }, []);

  if (!loaded) {
    return null;
  }
  

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider>
      <AuthProvider>
        <AppProvider>
          <UnitSettingsProvider>
          <ToastProvider>
              <MascotProvider>
                <ThemeProvider>
                  <AppContent />
                </ThemeProvider>
              </MascotProvider>
          </ToastProvider>
          </UnitSettingsProvider>
        </AppProvider>
      </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
