// ============================================================
// LUMEN — Premium VerifyEmail Screen
// Phase 2: Authentication (Verification Check)
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, StatusBar } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { Button } from "@/design-system/components/Button";
import { TextStyles, Spacing, Radius } from "@/design-system/tokens";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function BackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/welcome" as any);
        }
      }}
      style={{
        position: "absolute",
        top: Math.max(insets.top, 16),
        left: 20,
        zIndex: 100,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LumenIcon name="arrowLeft" size={20} color="#FFF" />
    </Pressable>
  );
}

export function VerifyEmailScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleOpenEmail = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // Simulate user verification completed successfully and route to Dashboard
    router.replace("/(citizen)/Dashboard" as any);
  };

  const handleResend = async () => {
    setResent(true);
    await new Promise((r) => setTimeout(r, 800));
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />
      <BackButton />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo + Hero */}
        <Animated.View style={[s.hero, { opacity: logoAnim }]}>
          <View style={[s.wordmarkRow]}>
            <View style={[s.wordmarkDot, { backgroundColor: colors.brand }]} />
            <Text style={[TextStyles.badge, { color: colors.brand, letterSpacing: 3 }]}>LUMEN</Text>
          </View>
          <Text style={[TextStyles.heading1, { color: colors.textPrimary }]}>Verify Email</Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary, marginTop: 4 }]}>
            Confirm your inbox setup. We've sent a verification link to your registered email
            address.
          </Text>
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            s.card,
            {
              backgroundColor: colors.bgGlass,
              borderColor: colors.borderGlass,
              transform: [{ translateY: cardAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={s.illustrationContainer}>
            <View style={[s.iconBg, { backgroundColor: colors.brandSoft }]}>
              <LumenIcon name="email" size="xl" color={colors.brand} strokeWidth={1.5} />
            </View>
          </View>

          <View style={s.content}>
            <Text style={[TextStyles.subtitle, { color: colors.textPrimary, textAlign: "center" }]}>
              Verification Sent
            </Text>
            <Text
              style={[
                TextStyles.bodySmall,
                { color: colors.textSecondary, textAlign: "center", marginTop: 8 },
              ]}
            >
              Please tap the activation button inside the email we sent to activate your citizen or
              engineer credentials.
            </Text>
          </View>

          <Button
            label={loading ? "Opening Inbox…" : "Open Email App"}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleOpenEmail}
            iconRight="external"
          />

          <View style={s.resendRow}>
            {resent ? (
              <Text
                style={[TextStyles.bodySmall, { color: colors.successText, fontWeight: "600" }]}
              >
                ✓ Verification email resent!
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={[TextStyles.bodySmall, { color: colors.brand, fontWeight: "600" }]}>
                  Resend verification email
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={s.backToLogin}
            onPress={() => router.replace("/Login" as any)}
            accessibilityLabel="Back to sign in"
          >
            <Text style={[TextStyles.bodySmall, { color: colors.textTertiary }]}>
              Back to <Text style={{ color: colors.brand, fontWeight: "600" }}>Sign In</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: 80,
    paddingBottom: Spacing[12],
    gap: Spacing[8],
  },
  hero: { gap: Spacing[3] },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing[2] },
  wordmarkDot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    borderRadius: Radius["3xl"],
    borderWidth: 1,
    padding: Spacing[6],
    gap: Spacing[5],
    overflow: "hidden",
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[4],
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    marginVertical: Spacing[2],
  },
  resendRow: {
    alignItems: "center",
    marginTop: Spacing[2],
  },
  backToLogin: {
    alignItems: "center",
  },
});

export default VerifyEmailScreen;
