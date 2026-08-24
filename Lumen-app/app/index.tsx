import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, Text, StatusBar } from "react-native";
import { router } from "expo-router";
import { MotiView, MotiText } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "@/store/AuthStore";

const { width: W, height: H } = Dimensions.get("window");

export default function SplashScreen() {
  useEffect(() => {
    // Force lock the session on fresh startup
    useAuthStore.getState().setUnlocked(false);

    // Navigate to welcome screen or dashboard after 2 seconds
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { user } = useAuthStore.getState();
      if (user) {
        // Force them to authenticate again via Biometrics or Credentials
        router.replace("/(auth)/Login" as any);
      } else {
        router.replace("/welcome" as any);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Deep Blue Background */}
      <LinearGradient
        colors={["#020B1A", "#06132D", "#020B1A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle Glows for Map feel */}
      <MotiView
        from={{ opacity: 0.3, scale: 0.8 }}
        animate={{ opacity: 0.5, scale: 1.2 }}
        transition={{ type: "timing", duration: 4000, loop: true, repeatReverse: true }}
        style={[s.glow, { top: "50%", left: "10%", backgroundColor: "#208AEF40" }]}
      />
      <MotiView
        from={{ opacity: 0.2, scale: 1 }}
        animate={{ opacity: 0.4, scale: 1.3 }}
        transition={{ type: "timing", duration: 5000, loop: true, repeatReverse: true }}
        style={[s.glow, { bottom: "20%", right: "10%", backgroundColor: "#208AEF30" }]}
      />

      <View style={s.content}>
        {/* Top Spacer */}
        <View style={{ flex: 1 }} />

        {/* Logo Section */}
        <View style={s.logoSection}>
          {/* Stylized L Icon */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 800 }}
            style={s.lIconContainer}
          >
            <View style={s.lVertical} />
            <LinearGradient
              colors={["#208AEF", "#0ED3FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.lHorizontal}
            />
          </MotiView>

          {/* Text Logo with Stylized E */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 800, delay: 200 }}
            style={s.textLogoContainer}
          >
            <Text style={s.logoText}>L U M</Text>

            {/* Stylized E */}
            <View style={s.eContainer}>
              <LinearGradient
                colors={["#208AEF", "#0ED3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.eBar, { width: 28 }]}
              />
              <LinearGradient
                colors={["#208AEF", "#0ED3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.eBar, { width: 34 }]}
              />
              <LinearGradient
                colors={["#208AEF", "#0ED3FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.eBar, { width: 28 }]}
              />
            </View>

            <Text style={s.logoText}>N</Text>
          </MotiView>

          <MotiText
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 800, delay: 400 }}
            style={s.subtitle}
          >
            CIVIC INFRASTRUCTURE PLATFORM
          </MotiText>
        </View>

        {/* Roles Row */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 800, delay: 600 }}
          style={s.rolesRow}
        >
          <RoleItem icon="profile" label="CITIZENS" />
          <View style={s.divider} />
          <RoleItem icon="engineer" label="ENGINEERS" />
          <View style={s.divider} />
          <RoleItem icon="building" label="ADMINISTRATORS" />
        </MotiView>

        {/* Map Network Area (Abstract) */}
        <View style={s.networkArea}>
          <NetworkPin icon="alert" top="20%" left="15%" delay={800} />
          <NetworkPin icon="water" top="45%" left="30%" delay={1000} />
          <NetworkPin icon="route" top="70%" left="60%" delay={1200} />
          <NetworkPin icon="garbage" top="60%" right="15%" delay={1400} />
          <NetworkPin icon="streetLight" top="30%" right="25%" delay={1600} />
        </View>

        {/* Bottom Loading Area */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 500, delay: 800 }}
          style={s.loadingArea}
        >
          <View style={s.loadingTrack}>
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ type: "timing", duration: 1500, delay: 500 }}
              style={s.loadingFill}
            />
          </View>
          <Text style={s.footerText}>BUILDING SMARTER COMMUNITIES</Text>
        </MotiView>
      </View>
    </View>
  );
}

function RoleItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={s.roleItem}>
      <View style={s.roleIconWrapper}>
        <LumenIcon name={icon} size={14} color="#0ED3FF" />
      </View>
      <Text style={s.roleText}>{label}</Text>
    </View>
  );
}

function NetworkPin({ icon, top, left, right, delay }: any) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", delay }}
      style={[s.networkPinWrapper, { top, left, right }]}
    >
      {/* Pulse effect */}
      <MotiView
        from={{ opacity: 0.8, scale: 1 }}
        animate={{ opacity: 0, scale: 2 }}
        transition={{ type: "timing", duration: 2000, loop: true }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 20, borderWidth: 1, borderColor: "#0ED3FF" },
        ]}
      />
      <View style={s.networkPin}>
        <LumenIcon name={icon} size={16} color="#FFFFFF" />
      </View>
      <LinearGradient colors={["#0ED3FF80", "transparent"]} style={s.pinLine} />
    </MotiView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020B1A",
  },
  glow: {
    position: "absolute",
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    filter: "blur(60px)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingBottom: Spacing[10],
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing[10],
  },
  lIconContainer: {
    width: 60,
    height: 80,
    marginBottom: Spacing[4],
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
    marginBottom: Spacing[4],
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
  subtitle: {
    color: "#A0B3D6",
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "500",
  },
  rolesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[4],
    marginBottom: Spacing[6],
    zIndex: 10,
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0ED3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#1A325A",
  },
  networkArea: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  networkPinWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  networkPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#0ED3FF",
    backgroundColor: "#020B1A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pinLine: {
    width: 2,
    height: 40,
    marginTop: -2,
    zIndex: 1,
  },
  loadingArea: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: Spacing[10],
    marginTop: "auto",
  },
  loadingTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#1A325A",
    borderRadius: 2,
    marginBottom: Spacing[6],
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    backgroundColor: "#0ED3FF",
    borderRadius: 2,
    shadowColor: "#0ED3FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  footerText: {
    color: "#A0B3D6",
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
  },
});
