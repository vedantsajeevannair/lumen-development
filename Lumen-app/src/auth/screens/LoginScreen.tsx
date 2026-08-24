import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Alert,
  Dimensions,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MotiView, MotiText } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { useAuthStore } from "@/store/AuthStore";
import { AuthService } from "@/services/auth.service";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const SECURE_STORE_CREDENTIALS_KEY = "lumen_biometric_credentials";

// Back Button Component
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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Floating animated orb component
function FloatingOrb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  delay,
  duration,
}: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  delay: number;
  duration: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 1000 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(20, { duration: duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.55,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
          bottom,
        },
        animStyle,
      ]}
    />
  );
}

// Remove PulsingLogo since we are using the new Splash Logo

// Logo styles removed

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [canUseBiometric, setCanUseBiometric] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const emailValue = watch("email");

  useEffect(() => {
    const init = async () => {
      const lastEmail = await AsyncStorage.getItem("lumen_last_email");
      if (lastEmail) {
        setValue("email", lastEmail);
      }
    };
    init();
  }, []);

  useEffect(() => {
    checkBiometricAvailability();
  }, [emailValue]);

  const checkBiometricAvailability = async () => {
    if (!emailValue) {
      setCanUseBiometric(false);
      return;
    }
    try {
      let hasHardware = await LocalAuthentication.hasHardwareAsync();
      let isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (__DEV__) {
        hasHardware = true;
        isEnrolled = true;
      }

      const userBiometricKey = AuthService.getBiometricKey(emailValue);
      const storedCreds = await SecureStore.getItemAsync(userBiometricKey);

      if (hasHardware && isEnrolled && storedCreds) {
        setCanUseBiometric(true);
      } else {
        setCanUseBiometric(false);
      }
    } catch (e) {
      console.warn("Biometric check failed", e);
      setCanUseBiometric(false);
    }
  };

  const promptEnableBiometric = async (
    email: string,
    password: string,
    biometricEnabledOnBackend: boolean
  ) => {
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
      // Check if user has previously declined the biometric prompt for this email
      const declinedKey = `biometric_declined_${email}`;
      const hasDeclined = await AsyncStorage.getItem(declinedKey);

      // Prompt if not enabled on backend OR if credentials are missing locally, AND they haven't declined
      if ((!biometricEnabledOnBackend || !storedCreds) && !hasDeclined) {
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
                    await AuthService.enrollBiometric(email, password);
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
  };

  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    setErrorText(null);
    try {
      const user = await AuthService.login(data.email, data.password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await promptEnableBiometric(data.email, data.password, !!user.biometricEnabled);
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        router.replace("/(admin)/Dashboard" as any);
      } else {
        router.replace("/(citizen)/Dashboard" as any);
      }
    } catch (err: any) {
      setErrorText(err.message || "Invalid email or password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const email = watch("email");
    try {
      const user = await AuthService.loginWithBiometric(email || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        router.replace("/(admin)/Dashboard" as any);
      } else {
        router.replace("/(citizen)/Dashboard" as any);
      }
    } catch (err: any) {
      setErrorText(err.message || "Biometric login failed.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // If the backend rejects the credentials as unauthorized or not enabled (due to db reset/mismatch),
      // clear them locally so the user can log in with password once and cleanly re-enroll.
      if (
        err.message &&
        (err.message.includes("device unauthorized") ||
          err.message.includes("is not enabled") ||
          err.message.includes("User not found"))
      ) {
        if (email) {
          try {
            const userBiometricKey = AuthService.getBiometricKey(email);
            await SecureStore.deleteItemAsync(userBiometricKey);
            await checkBiometricAvailability();
          } catch (e) {
            console.warn("Failed to clear local credentials after failure", e);
          }
        }
      }
    }
  };

  const handleGuestLogin = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useAuthStore.getState().loginAsGuest();
    router.replace("/(citizen)/Dashboard" as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <BackButton />

      {/* Background gradient */}
      <LinearGradient colors={["#060818", "#0D1235", "#060818"]} style={StyleSheet.absoluteFill} />

      {/* Atmospheric orbs */}
      <FloatingOrb color="#38BDF8" size={340} top={-120} left={-140} delay={0} duration={4000} />
      <FloatingOrb
        color="#818CF8"
        size={250}
        bottom={50}
        right={-100}
        delay={300}
        duration={5000}
      />
      <FloatingOrb
        color="#6EE7B7"
        size={180}
        top={height * 0.3}
        right={-60}
        delay={600}
        duration={3500}
      />

      {/* Fine grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header section */}
          <View style={styles.headerSection}>
            {/* Stylized L Icon */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              style={styles.lIconContainer}
            >
              <View style={styles.lVertical} />
              <LinearGradient
                colors={["#208AEF", "#0ED3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lHorizontal}
              />
            </MotiView>

            {/* Text Logo with Stylized E */}
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 800, delay: 200 }}
              style={styles.textLogoContainer}
            >
              <Text style={styles.logoText}>L U M</Text>

              {/* Stylized E */}
              <View style={styles.eContainer}>
                <LinearGradient
                  colors={["#208AEF", "#0ED3FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.eBar, { width: 28 }]}
                />
                <LinearGradient
                  colors={["#208AEF", "#0ED3FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.eBar, { width: 34 }]}
                />
                <LinearGradient
                  colors={["#208AEF", "#0ED3FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.eBar, { width: 28 }]}
                />
              </View>

              <Text style={styles.logoText}>N</Text>
            </MotiView>
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", delay: 450, duration: 500 }}
            >
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account to continue</Text>
            </MotiView>
          </View>

          {/* Glass card */}
          <MotiView
            from={{ opacity: 0, translateY: 40, scale: 0.96 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: "spring", delay: 250, damping: 18, stiffness: 120 }}
          >
            <BlurView intensity={28} tint="dark" style={styles.glassCard}>
              {/* Top accent line */}
              <LinearGradient
                colors={["#38BDF8", "#818CF8", "#6EE7B7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardAccentLine}
              />

              <View style={styles.formContainer}>
                {/* Error box */}
                {errorText && (
                  <MotiView
                    from={{ opacity: 0, translateY: -8, scale: 0.97 }}
                    animate={{ opacity: 1, translateY: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 16 }}
                    style={styles.errorBox}
                  >
                    <View style={styles.errorIcon}>
                      <LumenIcon name="warning" size="sm" color="#F87171" />
                    </View>
                    <Text style={styles.errorText}>{errorText}</Text>
                  </MotiView>
                )}

                {/* Email field */}
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email Address"
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      iconLeft="email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                      size="lg"
                    />
                  )}
                />

                {/* Password field */}
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Password"
                      placeholder="Enter your password"
                      secureTextEntry
                      iconLeft="lock"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                      size="lg"
                    />
                  )}
                />

                {/* Forgot password */}
                <View style={styles.forgotRow}>
                  <Pressable
                    onPress={() => router.push("/(auth)/ForgotPassword" as any)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </Pressable>
                </View>

                {/* Sign In Button */}
                <View style={styles.actionContainer}>
                  <Pressable
                    onPress={handleSubmit(onLogin)}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.gradientBtnWrapper,
                      {
                        opacity: loading ? 0.8 : pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={loading ? ["#4B5563", "#374151"] : ["#38BDF8", "#818CF8"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientBtn}
                    >
                      {loading ? (
                        <MotiView
                          from={{ rotate: "0deg" }}
                          animate={{ rotate: "360deg" }}
                          transition={{ type: "timing", duration: 800, loop: true }}
                        >
                          <LumenIcon name="refresh" size="md" color="#FFFFFF" />
                        </MotiView>
                      ) : (
                        <View style={styles.btnInner}>
                          <Text style={styles.gradientBtnText}>Sign In</Text>
                          <LumenIcon name="forward" size="md" color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Biometric login */}
                {canUseBiometric && (
                  <View>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Pressable
                      onPress={handleBiometricLogin}
                      style={({ pressed }) => [
                        styles.biometricBtn,
                        { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                    >
                      <LinearGradient
                        colors={["rgba(56,189,248,0.12)", "rgba(129,140,248,0.12)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.biometricGradient}
                      >
                        <LumenIcon name="biometric" size="lg" color="#38BDF8" />
                        <Text style={styles.biometricText}>Face ID / Touch ID</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </BlurView>
          </MotiView>

          {/* Footer */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", delay: 800, duration: 500 }}
            style={styles.footer}
          >
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable
              onPress={() => router.push("/(auth)/Register" as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={styles.registerLink}>Create Account</Text>
            </Pressable>
          </MotiView>

          {/* Guest Mode */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", delay: 900, duration: 500 }}
            style={[styles.footer, { marginTop: 16 }]}
          >
            <Pressable
              onPress={handleGuestLogin}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.registerLink, { color: "#94A3B8" }]}>Continue as Guest</Text>
            </Pressable>
          </MotiView>

          {/* Bottom trust badge */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", delay: 1000, duration: 500 }}
            style={styles.trustRow}
          >
            <LumenIcon name="shield" size="xs" color="#4B5563" />
            <Text style={styles.trustText}>256-bit encrypted · Secure login</Text>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060818",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  lIconContainer: {
    width: 60,
    height: 80,
    marginBottom: 8,
    transform: [{ scale: 0.8 }], // Scale down a bit for the login screen
  },
  lVertical: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 22,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
  },
  lHorizontal: {
    position: "absolute",
    left: 11,
    bottom: 0,
    width: 49,
    height: 22,
    borderRadius: 11,
  },
  textLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    transform: [{ scale: 0.8 }], // Scale down a bit for the login screen
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "600",
    letterSpacing: 8,
  },
  eContainer: {
    height: 38,
    justifyContent: "space-between",
    marginHorizontal: 4,
  },
  eBar: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  glassCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,15,40,0.6)",
  },
  cardAccentLine: {
    height: 2,
    width: "100%",
  },
  formContainer: {
    padding: 24,
    gap: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    gap: 10,
  },
  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13.5,
    flex: 1,
    lineHeight: 20,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    color: "#38BDF8",
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  actionContainer: {
    marginTop: 4,
  },
  gradientBtnWrapper: {
    borderRadius: 16,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gradientBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dividerText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  biometricBtn: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.25)",
  },
  biometricGradient: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  biometricText: {
    color: "#7DD3FC",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    color: "#475569",
    fontSize: 15,
  },
  registerLink: {
    color: "#38BDF8",
    fontSize: 15,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 6,
  },
  trustText: {
    color: "#374151",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
