import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { AuthService } from "@/services/auth.service";
import * as Haptics from "expo-haptics";

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [step, setStep] = useState<"email" | "reset">("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setErrorText("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorText(null);
    try {
      await AuthService.generateForgotPasswordOtp(email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("reset");
    } catch (err: any) {
      setErrorText(err.message || "Failed to send reset link.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length !== 6 || newPassword.length < 6) {
      setErrorText("Please enter a valid 6-digit code and a password of at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorText(null);
    try {
      await AuthService.resetPassword(email, otp, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(auth)/Login" as any);
    } catch (err: any) {
      setErrorText(err.message || "Failed to reset password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0F172A", "#1E1B4B", "#0F172A"]} style={StyleSheet.absoluteFill} />

      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ type: "timing", duration: 4000, loop: true }}
        style={[styles.glowOrb, { top: -100, right: -50, backgroundColor: "#38BDF8" }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 100 }}
          style={styles.content}
        >
          <View style={styles.headerContainer}>
            <View style={styles.iconWrapper}>
              <LumenIcon
                name={step === "email" ? "shield" : "reportDetails"}
                size="2xl"
                color="#38BDF8"
              />
            </View>
            <Text style={[TextStyles.heading1, styles.title]}>
              {step === "email" ? "Reset Password" : "Create New Password"}
            </Text>
            <Text style={[TextStyles.body, styles.subtitle]}>
              {step === "email"
                ? "Enter your email to receive a recovery code."
                : `Enter the code sent to ${email} and your new password.`}
            </Text>
          </View>

          <BlurView intensity={30} tint="dark" style={styles.glassCard}>
            <View style={styles.formContainer}>
              {errorText && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.errorBox}>
                  <LumenIcon name="info" size="sm" color="#F87171" />
                  <Text style={styles.errorText}>{errorText}</Text>
                </MotiView>
              )}

              {step === "email" ? (
                <>
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <Button
                    label="Send Code"
                    onPress={handleSendOtp}
                    loading={loading}
                    variant="primary"
                    size="lg"
                    style={styles.primaryBtn}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="6-Digit Recovery Code"
                    placeholder="Enter code"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <Input
                    label="New Password"
                    placeholder="Create a new password"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <Button
                    label="Reset Password"
                    onPress={handleResetPassword}
                    loading={loading}
                    variant="primary"
                    size="lg"
                    style={styles.primaryBtn}
                  />
                </>
              )}
            </View>
          </BlurView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(auth)/Login" as any);
                }
              }}
            >
              <Text style={styles.loginText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  glowOrb: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    filter: "blur(60px)",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  title: {
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
  },
  glassCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  formContainer: {
    padding: 32,
    gap: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
    gap: 8,
  },
  errorText: {
    color: "#F87171",
    fontSize: 14,
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },
});
