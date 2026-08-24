// ============================================================
// LUMEN — Premium Landing Screen
// ============================================================
import { useTheme } from "@/design-system/ThemeContext";
import { Button } from "@/design-system/components/Button";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "report",
    title: "Smart Reporting",
    description:
      "Report infrastructure issues with AI-powered categorization and real-time tracking.",
    color: "#208AEF",
  },
  {
    icon: "map",
    title: "Live Maps",
    description: "View nearby issues on interactive maps with real-time status updates.",
    color: "#12B76A",
  },
  {
    icon: "timer",
    title: "Fast Resolution",
    description: "Track resolution times with transparent progress updates and notifications.",
    color: "#F79009",
  },
  {
    icon: "shield",
    title: "Secure Platform",
    description: "Enterprise-grade security with role-based access and data protection.",
    color: "#7C3AED",
  },
];

const STATS = [
  { value: "50K+", label: "Reports Resolved" },
  { value: "4.2h", label: "Avg Resolution" },
  { value: "98%", label: "Satisfaction" },
];

export default function LandingScreen() {
  const { colors, isDark } = useTheme();
  const [activeFeature, setActiveFeature] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const featureAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(slideUpAnim, {
            toValue: 0,
            useNativeDriver: true,
            speed: 16,
            bounciness: 8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 16,
            bounciness: 8,
          }),
        ]),
      ]).start();

      // Feature cards stagger
      FEATURES.forEach((_, idx) => {
        setTimeout(
          () => {
            Animated.spring(featureAnim, {
              toValue: 1,
              useNativeDriver: true,
              speed: 14,
              bounciness: 6,
            }).start();
          },
          800 + idx * 150
        );
      });
    };
    animate();

    // Floating orb animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 5000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 5000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const orbTranslateY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const handleGetStarted = () => {
    router.push("/(auth)/Login" as any);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgBase }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bgBase}
      />

      {/* Animated Background Orbs */}
      <Animated.View
        style={[
          s.orb1,
          { backgroundColor: colors.brand + "12", transform: [{ translateY: orbTranslateY }] },
        ]}
      />
      <Animated.View
        style={[
          s.orb2,
          {
            backgroundColor: "#7C3AED10",
            transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }],
          },
        ]}
      />
      <Animated.View
        style={[
          s.orb3,
          { backgroundColor: "#12B76A08", transform: [{ translateY: orbTranslateY }] },
        ]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero Section */}
        <Animated.View style={[s.hero, { opacity: fadeAnim }]}>
          <View style={s.wordmark}>
            <View style={[s.wordmarkDot, { backgroundColor: colors.brand }]} />
            <Text style={[TextStyles.badge, { color: colors.brand, letterSpacing: 4 }]}>LUMEN</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text
              style={[
                TextStyles.heading1,
                { color: colors.textPrimary, textAlign: "center", lineHeight: 50 },
              ]}
            >
              Smarter Cities,{"\n"}Better Lives
            </Text>
          </Animated.View>

          <Animated.Text
            style={[
              TextStyles.body,
              { color: colors.textSecondary, textAlign: "center", opacity: fadeAnim },
            ]}
          >
            Transform civic infrastructure management with AI-powered reporting, real-time tracking,
            and transparent governance.
          </Animated.Text>

          <Animated.View style={[s.ctaContainer, { transform: [{ translateY: slideUpAnim }] }]}>
            <Button
              label="Get Started"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleGetStarted}
              iconRight="forward"
            />
            <Pressable onPress={() => router.push("/(auth)/Login" as any)} style={s.signInLink}>
              <Text style={[TextStyles.body, { color: colors.textSecondary }]}>
                Already have an account?{" "}
                <Text style={{ color: colors.brand, fontWeight: "600" }}>Sign In</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View style={[s.statsSection, { opacity: featureAnim }]}>
          {STATS.map((stat, idx) => (
            <Animated.View
              key={idx}
              style={[
                s.statItem,
                {
                  transform: [
                    {
                      scale: featureAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
                    },
                  ],
                  opacity: featureAnim,
                },
              ]}
            >
              <Text style={[TextStyles.heading2, { color: colors.brand }]}>{stat.value}</Text>
              <Text style={[TextStyles.caption, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Features Section */}
        <Animated.View style={[s.featuresSection, { opacity: featureAnim }]}>
          <Text
            style={[
              TextStyles.heading2,
              { color: colors.textPrimary, textAlign: "center", marginBottom: Spacing[6] },
            ]}
          >
            Why Choose LUMEN?
          </Text>

          {FEATURES.map((feature, idx) => (
            <Animated.View
              key={idx}
              style={[
                s.featureCard,
                {
                  transform: [
                    {
                      translateY: featureAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                  opacity: featureAnim,
                },
              ]}
            >
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={s.glassCard}>
                <LinearGradient
                  colors={[isDark ? "#1a1a2e20" : "#ffffff40", isDark ? "#1a1a2e10" : "#ffffff20"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.featureContent}>
                  <View style={[s.featureIcon, { backgroundColor: feature.color + "20" }]}>
                    <LumenIcon
                      name={feature.icon as any}
                      size="lg"
                      color={feature.color}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[TextStyles.subtitle, { color: colors.textPrimary }]}>
                    {feature.title}
                  </Text>
                  <Text style={[TextStyles.body, { color: colors.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Bottom CTA */}
        <Animated.View style={[s.bottomCta, { opacity: featureAnim }]}>
          <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={s.glassCard}>
            <LinearGradient
              colors={[isDark ? "#1a1a2e30" : "#ffffff50", isDark ? "#1a1a2e15" : "#ffffff25"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.bottomCtaContent}>
              <Text
                style={[TextStyles.heading2, { color: colors.textPrimary, textAlign: "center" }]}
              >
                Ready to make a difference?
              </Text>
              <Text
                style={[
                  TextStyles.body,
                  { color: colors.textSecondary, textAlign: "center", marginTop: Spacing[2] },
                ]}
              >
                Join thousands of citizens building smarter communities today.
              </Text>
              <Button
                label="Create Free Account"
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.push("/(auth)/Register" as any)}
                style={{ marginTop: Spacing[4] }}
              />
            </View>
          </BlurView>
        </Animated.View>

        <View style={{ height: Spacing[8] }} />
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
    paddingBottom: Spacing[8],
  },
  orb1: {
    position: "absolute",
    top: -150,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  orb2: {
    position: "absolute",
    top: "40%",
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orb3: {
    position: "absolute",
    bottom: -100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  hero: {
    alignItems: "center",
    gap: Spacing[4],
    marginBottom: Spacing[10],
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing[4],
  },
  wordmarkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ctaContainer: {
    width: "100%",
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  signInLink: {
    alignItems: "center",
  },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing[10],
    paddingVertical: Spacing[6],
  },
  statItem: {
    alignItems: "center",
    gap: Spacing[1],
  },
  featuresSection: {
    gap: Spacing[4],
    marginBottom: Spacing[8],
  },
  featureCard: {
    marginBottom: Spacing[3],
  },
  glassCard: {
    borderRadius: Radius["3xl"],
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featureContent: {
    padding: Spacing[5],
    gap: Spacing[3],
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomCta: {
    marginBottom: Spacing[6],
  },
  bottomCtaContent: {
    padding: Spacing[6],
    gap: Spacing[3],
  },
});
