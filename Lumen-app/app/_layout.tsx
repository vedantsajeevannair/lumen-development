import { Stack, usePathname, useSegments, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, LogBox } from "react-native";
import { ThemeProvider } from "@/design-system";
import { useEffect } from "react";
import { useAuthStore } from "@/store/AuthStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/services/api.client";
import { socketService } from "@/services/socket.service";
import { StripeProvider } from "@stripe/stripe-react-native";
import "@/i18n/i18n";

LogBox.ignoreLogs(["SafeAreaView has been deprecated", "setLayoutAnimationEnabledExperimental"]);

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { user, role, isUnlocked } = useAuthStore();

  const segmentsJoined = segments.join("/");

  useEffect(() => {
    // Reset session lock status to false on fresh app launch
    useAuthStore.getState().setUnlocked(false);
  }, []);

  useEffect(() => {
    if (user) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (pathname) {
      console.log(`[NAVIGATION] Screen changed to: ${pathname}`);
    }
  }, [pathname]);

  useEffect(() => {
    const isAuthRoute =
      segments.includes("welcome") ||
      segments.includes("(auth)") ||
      segments.includes("onboarding") ||
      segments.includes("landing");
    const isCitizenRoute = segments.includes("(citizen)");
    const isAdminRoute = segments.includes("(admin)");

    if (user && isUnlocked) {
      if (isAuthRoute) {
        const target =
          role === "ADMIN" || role === "SUPER_ADMIN"
            ? "/(admin)/Dashboard"
            : "/(citizen)/Dashboard";
        console.log(
          `[AUTH GUARD] Logged in and unlocked user tried to access auth route /${segmentsJoined}. Redirecting to ${target}`
        );
        setTimeout(() => router.replace(target as any), 0);
      }
    } else {
      if (isCitizenRoute || isAdminRoute) {
        console.log(
          `[AUTH GUARD] Logged-out or locked user tried to access protected route /${segmentsJoined}. Redirecting to /Login`
        );
        setTimeout(() => router.replace("/(auth)/Login" as any), 0);
      }
    }
  }, [segmentsJoined, user, role, isUnlocked]);

  return (
    <GestureHandlerRootView style={s.root}>
      <QueryClientProvider client={queryClient}>
        <StripeProvider publishableKey="pk_test_mock_stripe_key">
          <ThemeProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(citizen)" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(shared)" />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", animation: "slide_from_bottom" }}
              />
            </Stack>
          </ThemeProvider>
        </StripeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
