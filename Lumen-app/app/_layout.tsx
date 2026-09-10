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
      segments.includes("onboarding");
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
      {/* No StripeProvider here.
       *
       * It wrapped the whole tree with the literal key "pk_test_mock_stripe_key"
       * — a placeholder, not a Stripe key — and @stripe/stripe-react-native was
       * never added to app.config.ts's plugins, which a real native build
       * requires. So it processed no payments in any build. The one screen that
       * uses Stripe, src/features/payments/screens/PaymentScreen.tsx, has no
       * route pointing at it and is never bundled.
       *
       * What it did do was break the app in Expo Go, which ships a fixed set of
       * native modules and does not include Stripe's: importing it at the root
       * layout crashed on launch, before any screen rendered.
       *
       * To actually take payments, add the config plugin, supply a real
       * publishable key from the environment, restore this provider, and give
       * PaymentScreen a route. It will need a development build — Expo Go
       * cannot load Stripe's native module at all. */}
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
