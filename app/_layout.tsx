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
import "react-native-reanimated";
import "../global.css";
import { AppProvider } from "@/store/AppContext";
import { ToastProvider } from "@/components/ui/Toast";

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

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ToastProvider>
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
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </ToastProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
