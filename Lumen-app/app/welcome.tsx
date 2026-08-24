import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  StatusBar,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { MotiView, MotiText } from "moti";
import { BlurView } from "expo-blur";
import { useTheme } from "@/design-system/ThemeContext";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import Svg, { Path } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");

const GoogleIcon = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Abstract Background Elements */}
      <MotiView
        from={{ translateY: -50, scale: 0.8 }}
        animate={{ translateY: 0, scale: 1.2 }}
        transition={{ type: "timing", duration: 4000, loop: true, repeatReverse: true }}
        style={[
          s.blob,
          {
            backgroundColor: colors.brand + "40",
            top: "-5%",
            left: "-10%",
            width: W * 0.7,
            height: W * 0.7,
          },
        ]}
      />
      <MotiView
        from={{ translateY: 50, scale: 1 }}
        animate={{ translateY: 0, scale: 1.3 }}
        transition={{ type: "timing", duration: 5000, loop: true, repeatReverse: true }}
        style={[
          s.blob,
          {
            backgroundColor: "#7C3AED30",
            top: "25%",
            right: "-20%",
            width: W * 0.8,
            height: W * 0.8,
          },
        ]}
      />

      {/* Universal Blur Overlay for Android/iOS */}
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />

      <View style={s.content}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800 }}
          style={s.header}
        >
          <View style={s.logoWrapper}>
            <View style={[s.logoDot, { backgroundColor: colors.brand }]} />
            <Text style={[TextStyles.badge, { color: colors.brand, letterSpacing: 4 }]}>LUMEN</Text>
          </View>
          <Text
            style={[
              TextStyles.heading1,
              { color: colors.textPrimary, fontSize: 44, lineHeight: 52, letterSpacing: -1 },
            ]}
          >
            Smarter Cities,{"\n"}Better Lives.
          </Text>
          <Text
            style={[TextStyles.body, { color: colors.textSecondary, fontSize: 16, lineHeight: 24 }]}
          >
            Join the premium platform for civic infrastructure management and community reporting.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800, delay: 200 }}
          style={s.actionsContainer}
        >
          {/* Solid Premium Card instead of BlurView for better contrast */}
          <View
            style={[
              s.actionCard,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}
          >
            <Button
              label="Sign In"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push("/(auth)/Login" as any)}
            />

            <Button
              label="Create Account"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.push("/onboarding" as any)}
            />

            <View style={s.divider}>
              <View style={[s.line, { backgroundColor: colors.borderDefault }]} />
              <Text
                style={[
                  TextStyles.caption,
                  { color: colors.textTertiary, marginHorizontal: Spacing[3], letterSpacing: 1 },
                ]}
              >
                or continue with
              </Text>
              <View style={[s.line, { backgroundColor: colors.borderDefault }]} />
            </View>

            <TouchableOpacity
              style={[s.socialButton, { borderColor: colors.borderDefault }]}
              activeOpacity={0.7}
            >
              <GoogleIcon size={22} />
              <Text
                style={[TextStyles.button, { color: colors.textPrimary, marginLeft: Spacing[3] }]}
              >
                Google
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  content: {
    flex: 1,
    padding: Spacing[6],
    justifyContent: "space-between",
    paddingTop: H * 0.15,
    paddingBottom: Spacing[8],
  },
  header: {
    gap: Spacing[5],
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  actionsContainer: {
    marginTop: "auto",
  },
  actionCard: {
    padding: Spacing[6],
    borderRadius: Radius["3xl"],
    borderWidth: 1,
    gap: Spacing[4],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing[2],
  },
  line: {
    flex: 1,
    height: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[4],
    borderWidth: 1,
    borderRadius: Radius.full,
    backgroundColor: "transparent",
  },
});
