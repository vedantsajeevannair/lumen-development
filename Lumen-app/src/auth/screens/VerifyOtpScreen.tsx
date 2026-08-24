import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { AuthService } from "@/services/auth.service";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30); // 30 seconds

  const inputRef = useRef<TextInput>(null);
  const OTP_LENGTH = 6;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const promptEnableBiometric = async () => {
    try {
      let hasHardware = await LocalAuthentication.hasHardwareAsync();
      let isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (__DEV__) {
        hasHardware = true;
        isEnrolled = true;
      }

      if (hasHardware && isEnrolled) {
        if (!email) return;
        const userBiometricKey = AuthService.getBiometricKey(email);
        const storedCreds = await SecureStore.getItemAsync(userBiometricKey);
        const declinedKey = `biometric_declined_${email}`;
        const hasDeclined = await AsyncStorage.getItem(declinedKey);

        if (!storedCreds && !hasDeclined) {
          return new Promise<void>((resolve) => {
            Alert.alert(
              "Enable Face ID / Touch ID?",
              "Would you like to securely log in with biometrics next time?",
              [
                {
                  text: "Not Now",
                  style: "cancel",
                  onPress: async () => {
                    await AsyncStorage.setItem(declinedKey, "true");
                    resolve();
                  },
                },
                {
                  text: "Enable",
                  onPress: async () => {
                    try {
                      await AuthService.enrollBiometric(email);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e: any) {
                      Alert.alert("Failed to enroll", e.message);
                    }
                    resolve();
                  },
                },
              ]
            );
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (codeToVerify: string = otp) => {
    if (codeToVerify.length !== OTP_LENGTH) return;
    setLoading(true);
    setErrorText(null);
    try {
      await AuthService.verifyOtp(email, codeToVerify);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await promptEnableBiometric();
      router.replace("/(citizen)/Dashboard" as any);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Invalid OTP. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val: string) => {
    const newVal = val.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setOtp(newVal);
    if (newVal.length === OTP_LENGTH) {
      handleVerify(newVal);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await AuthService.resendOtp({ email });
      setCountdown(30);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setErrorText(err.message || "Failed to resend OTP.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <BackButton />

      <LinearGradient colors={["#1E1B4B", "#0F172A", "#1E1B4B"]} style={StyleSheet.absoluteFill} />

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
              <LumenIcon name="shield" size="2xl" color="#38BDF8" />
            </View>
            <Text style={[TextStyles.heading1, styles.title]}>Verify Email</Text>
            <Text style={[TextStyles.body, styles.subtitle]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={styles.emailText}>{email}</Text>
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

              <Pressable style={styles.otpContainer} onPress={() => inputRef.current?.focus()}>
                {Array(OTP_LENGTH)
                  .fill(0)
                  .map((_, index) => {
                    const isActive = otp.length === index;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          isActive && styles.otpBoxActive,
                          otp.length > index && styles.otpBoxFilled,
                        ]}
                      >
                        <Text style={styles.otpText}>{otp[index] || ""}</Text>
                      </View>
                    );
                  })}
                <TextInput
                  ref={inputRef}
                  value={otp}
                  onChangeText={handleChange}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={OTP_LENGTH}
                  style={styles.hiddenInput}
                  autoFocus
                />
              </Pressable>

              <Button
                label="Verify Code"
                onPress={() => handleVerify()}
                loading={loading}
                variant="primary"
                size="lg"
                disabled={otp.length !== OTP_LENGTH}
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {countdown > 0 ? (
                  <Text style={styles.timerText}>{formatTime(countdown)}</Text>
                ) : (
                  <Pressable onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend Now</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </BlurView>
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
  emailText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 55,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxActive: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  otpBoxFilled: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  otpText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  resendText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  timerText: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  resendLink: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
  },
});
