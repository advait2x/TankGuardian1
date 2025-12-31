import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#E8F4F8' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="create-tank" />
    </Stack>
  );
}
