// ============================================================
// LUMEN — Premium OTP Screen
// Phase 2: Authentication Redesign
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView, MotiText } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/design-system/ThemeContext";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import * as Haptics from "expo-haptics";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { colors, isDark } = useTheme();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Success - in reality, we'd navigate to reset password or dashboard
      router.replace("/(auth)/Login" as any);
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(30);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Trigger backend resend here
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bgBase }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <LinearGradient
        colors={[colors.brand + "15", colors.brand + "05", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.topGradient}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={s.hero}
        >
          <View style={[s.iconWrapper, { backgroundColor: colors.brand + "20" }]}>
            <LumenIcon name="email" size="xl" color={colors.brand} />
          </View>
          <Text style={[TextStyles.heading2, { color: colors.textPrimary }]}>Check your email</Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary, textAlign: "center" }]}>
            We sent a verification code to{"\n"}
            <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
              {email || "your email"}
            </Text>
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100 }}
        >
          <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={s.glassCard}>
            <LinearGradient
              colors={[isDark ? "#1a1a2e30" : "#ffffff50", isDark ? "#1a1a2e15" : "#ffffff25"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.cardContent}>
              <Pressable onPress={() => inputRef.current?.focus()} style={s.otpContainer}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.otpSlot,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: otp.length === i ? colors.brand : colors.borderDefault,
                        borderWidth: otp.length === i ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={[TextStyles.heading2, { color: colors.textPrimary }]}>
                      {otp[i] || ""}
                    </Text>
                  </View>
                ))}
              </Pressable>

              {/* Hidden Input */}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
                  setOtp(cleaned);
                  if (cleaned.length === OTP_LENGTH) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={s.hiddenInput}
                autoFocus
              />

              <Button
                label={loading ? "Verifying..." : "Verify Code"}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleVerify}
                disabled={otp.length !== OTP_LENGTH}
              />

              <View style={s.resendContainer}>
                <Text style={[TextStyles.body, { color: colors.textSecondary }]}>
                  Didn't receive the code?{" "}
                </Text>
                {timer > 0 ? (
                  <MotiText
                    style={[
                      TextStyles.body,
                      { color: colors.textTertiary, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    Resend in 00:{timer.toString().padStart(2, "0")}
                  </MotiText>
                ) : (
                  <Pressable onPress={handleResend} hitSlop={8}>
                    <Text style={[TextStyles.body, { color: colors.brand, fontWeight: "600" }]}>
                      Click to resend
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </BlurView>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: 100,
    paddingBottom: Spacing[12],
    gap: Spacing[8],
  },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  hero: { gap: Spacing[4], alignItems: "center" },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  glassCard: {
    borderRadius: Radius["3xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardContent: { padding: Spacing[6], gap: Spacing[6] },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  otpSlot: {
    width: 48,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing[2],
  },
});
