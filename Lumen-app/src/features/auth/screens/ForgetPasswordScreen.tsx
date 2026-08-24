import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTheme } from "@/design-system/ThemeContext";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import * as Haptics from "expo-haptics";

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgetPasswordScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onRequestReset = async (data: { email: string }) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Route to OTP screen with email params
      router.push({ pathname: "/Otp" as any, params: { email: data.email } });
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
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
            <LumenIcon name="lock" size="xl" color={colors.brand} />
          </View>
          <Text style={[TextStyles.heading2, { color: colors.textPrimary }]}>Forgot Password?</Text>
          <Text style={[TextStyles.body, { color: colors.textSecondary }]}>
            No worries, we'll send you reset instructions.
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
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email address"
                    placeholder="Enter the email associated with your account"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={value}
                    onChangeText={onChange}
                    error={errors.email?.message as string}
                    iconLeft="email"
                  />
                )}
              />

              <Button
                label={loading ? "Sending..." : "Reset Password"}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit(onRequestReset)}
              />
            </View>
          </BlurView>
        </MotiView>

        <Button
          label="Back to Sign In"
          variant="ghost"
          size="md"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(auth)/Login" as any);
            }
          }}
          iconLeft="arrowLeft"
          style={s.backBtn}
        />
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
  backBtn: { marginTop: Spacing[4] },
});
