import "../global.css";
import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
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
import { listFishSpecies } from "@/utils/remoteFishCatalog";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const CustomTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#E8F4F8',
    primary: '#0D7377',
  },
};

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

  if (!loaded) {
    return null;
  }
  

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
              <MascotProvider>
            <ThemeProvider value={CustomTheme}>
              <Stack
                screenOptions={({ route }) => ({
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: '#E8F4F8' },
                })}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="landing" />
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="auth-otp" />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
              </MascotProvider>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
