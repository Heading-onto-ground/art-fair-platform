import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { LogBox } from "react-native";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/useLanguage";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

// Expo Go (SDK 53+) shows a noisy push warning for expo-notifications remote push.
// This app currently uses local notifications in Expo Go, so we suppress this warning
// to prevent red error overlays during user testing.
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);

export default function RootLayout() {
  const initFromStorage = useAuth((s) => s.initFromStorage);
  const initLang = useLanguage((s) => s.init);

  useEffect(() => {
    initFromStorage();
    initLang();
  }, [initFromStorage, initLang]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="verify-day1" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ErrorBoundary>
  );
}
