import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { PasswordStrengthMeter } from "@/design-system/components/PasswordStrengthMeter";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { AuthService } from "@/services/auth.service";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    phoneNumber: z.string().min(10, "Please enter a valid phone number"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// Floating orb component
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

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-18, { duration: duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(18, { duration: duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.5,
    transform: [{ translateY: translateY.value }],
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

// Step indicator
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <MotiView
          key={i}
          animate={{
            width: i === currentStep ? 28 : 8,
            backgroundColor: i <= currentStep ? "#818CF8" : "rgba(255,255,255,0.15)",
          }}
          transition={{ type: "spring", damping: 16 }}
          style={stepStyles.dot}
        />
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

// Animated logo for register
function RegisterLogo() {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    rotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={logoStyle}>
      <LinearGradient
        colors={["#A78BFA", "#818CF8", "#6EE7B7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={registerLogoStyles.gradient}
      >
        <LumenIcon name="profile" size="xl" color="#FFFFFF" />
      </LinearGradient>
    </Animated.View>
  );
}

const registerLogoStyles = StyleSheet.create({
  gradient: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Simple feature text
function FeatureText({ label }: { label: string }) {
  return (
    <View style={pillStyles.feature}>
      <LumenIcon name="checkCircle" size="xs" color="#38BDF8" />
      <Text style={pillStyles.text}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
});

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", phoneNumber: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");

  const onRegister = async (data: RegisterFormData) => {
    setLoading(true);
    setErrorText(null);
    try {
      await AuthService.generateOtp({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        password: data.password,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/(auth)/VerifyOtp" as any, params: { email: data.email } });
    } catch (err: any) {
      setErrorText(err.message || "Registration failed. Try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0F19" }}>
      <StatusBar barStyle="light-content" />

      <BackButton />

      {/* Background gradient */}
      <LinearGradient colors={["#060818", "#0F0A2E", "#060818"]} style={StyleSheet.absoluteFill} />

      {/* Atmospheric orbs */}
      <FloatingOrb color="#A78BFA" size={320} top={-130} right={-130} delay={0} duration={4500} />
      <FloatingOrb color="#818CF8" size={200} bottom={100} left={-80} delay={300} duration={5000} />
      <FloatingOrb
        color="#6EE7B7"
        size={150}
        top={height * 0.5}
        right={-50}
        delay={500}
        duration={3800}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800, easing: Easing.out(Easing.quad) }}
            style={styles.headerSection}
          >
            <RegisterLogo />

            <MotiText
              from={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "timing",
                duration: 800,
                delay: 150,
                easing: Easing.out(Easing.quad),
              }}
              style={styles.brand}
            >
              JOIN LUMEN
            </MotiText>

            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 800,
                delay: 250,
                easing: Easing.out(Easing.quad),
              }}
            >
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>Report issues · Track progress · Build your city</Text>
            </MotiView>

            {/* Feature checkmarks */}
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 800,
                delay: 350,
                easing: Easing.out(Easing.quad),
              }}
              style={styles.pillsRow}
            >
              <FeatureText label="Secure" />
              <FeatureText label="AI-Powered" />
              <FeatureText label="Location-based" />
            </MotiView>
          </MotiView>

          {/* Form Card */}
          <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{
              type: "timing",
              duration: 800,
              delay: 200,
              easing: Easing.out(Easing.quad),
            }}
          >
            <BlurView intensity={28} tint="dark" style={styles.glassCard}>
              {/* Top accent line with purple theme */}
              <LinearGradient
                colors={["#A78BFA", "#818CF8", "#6EE7B7"]}
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
                {/* Full Name */}
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="Enter your full name"
                      autoCapitalize="words"
                      autoComplete="name"
                      iconLeft="profile"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.fullName?.message}
                      isValid={!errors.fullName && value.length >= 2}
                      size="lg"
                    />
                  )}
                />

                {/* Phone Number */}
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Phone Number"
                      placeholder="Enter your phone number"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      iconLeft="phone"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.phoneNumber?.message}
                      isValid={!errors.phoneNumber && value.length >= 10}
                      size="lg"
                    />
                  )}
                />

                {/* Email */}
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
                      isValid={!errors.email && value.includes("@") && value.includes(".")}
                      size="lg"
                    />
                  )}
                />

                {/* Password */}
                <View>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Password"
                        placeholder="Create a strong password"
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
                  {/* Password strength meter */}
                  {passwordValue.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <PasswordStrengthMeter password={passwordValue} />
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Confirm Password"
                      placeholder="Re-enter your password"
                      secureTextEntry
                      iconLeft="lock"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.confirmPassword?.message}
                      isValid={
                        !errors.confirmPassword && value.length >= 6 && value === passwordValue
                      }
                      size="lg"
                    />
                  )}
                />

                {/* Terms note */}
                <View style={styles.termsRow}>
                  <LumenIcon name="info" size="xs" color="#475569" />
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our{" "}
                    <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </View>

                {/* Register CTA */}
                <View>
                  <Pressable
                    onPress={handleSubmit(onRegister)}
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
                      colors={loading ? ["#4B5563", "#374151"] : ["#A78BFA", "#818CF8"]}
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
                          <Text style={styles.gradientBtnText}>Create Account</Text>
                          <LumenIcon name="forward" size="md" color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </MotiView>

          {/* Footer */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", delay: 950, duration: 500 }}
            style={styles.footer}
          >
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/Login" as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </MotiView>

          {/* Trust row */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", delay: 1100, duration: 500 }}
            style={styles.trustRow}
          >
            <LumenIcon name="shield" size="xs" color="#374151" />
            <Text style={styles.trustText}>Your data is encrypted end-to-end</Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  brand: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 7,
    color: "#A78BFA",
    marginTop: 14,
    marginBottom: 16,
    opacity: 0.9,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 16,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  glassCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,8,35,0.65)",
  },
  cardAccentLine: {
    height: 2,
    width: "100%",
  },
  formContainer: {
    padding: 24,
    gap: 16,
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
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 2,
    marginTop: -4,
  },
  termsText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: "#818CF8",
    fontWeight: "600",
  },
  gradientBtnWrapper: {
    borderRadius: 16,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 4,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    color: "#475569",
    fontSize: 15,
  },
  loginLink: {
    color: "#A78BFA",
    fontSize: 15,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 6,
  },
  trustText: {
    color: "#374151",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
