import React, { useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, StatusBar, Pressable } from "react-native";
import { router } from "expo-router";
import { MotiView, AnimatePresence } from "moti";
import { useTheme } from "@/design-system/ThemeContext";
import { Radius, Spacing, TextStyles } from "@/design-system/tokens";
import { Button } from "@/design-system/components/Button";
import { LumenIcon, type LumenIconName } from "@/design-system/icons/LumenIcon";
import * as Haptics from "expo-haptics";

const { width: W, height: H } = Dimensions.get("window");

interface SlideData {
  id: string;
  title: string;
  description: string;
  icon: LumenIconName;
  color: string;
}

const SLIDES: SlideData[] = [
  {
    id: "1",
    title: "Welcome to LUMEN",
    description: "The premium civic infrastructure platform connecting citizens and engineers.",
    icon: "spark",
    color: "#208AEF",
  },
  {
    id: "2",
    title: "Report Issues Instantly",
    description: "Submit detailed reports with photos, location, and AI-categorization in seconds.",
    icon: "report",
    color: "#F04438",
  },
  {
    id: "3",
    title: "Live Tracking",
    description: "Watch your reports progress from submission to resolution in real-time.",
    icon: "timer",
    color: "#F79009",
  },
  {
    id: "4",
    title: "AI Assistance",
    description: "Our AI helps categorize issues and provides instant troubleshooting support.",
    icon: "robot",
    color: "#7C3AED",
  },
  {
    id: "5",
    title: "Smart Notifications",
    description:
      "Get real-time updates when nearby issues are fixed or your reports change status.",
    icon: "notifications",
    color: "#12B76A",
  },
];

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push("/(auth)/Register" as any);
    }
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(auth)/Register" as any);
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={[s.container, { backgroundColor: colors.bgBase }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header / Skip */}
      <View style={s.header}>
        <View style={s.progressRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === currentIndex ? colors.brand : colors.borderDefault },
                i === currentIndex && s.dotActive,
              ]}
            />
          ))}
        </View>
        <Pressable onPress={skip} hitSlop={12}>
          <Text style={[TextStyles.label, { color: colors.textTertiary }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <View style={s.content}>
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={currentSlide.id}
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -20 }}
            transition={{ type: "timing", duration: 300 }}
            style={s.slide}
          >
            {/* Visual Element (Icon/Illustration) */}
            <View style={[s.iconWrapper, { backgroundColor: currentSlide.color + "15" }]}>
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 150 }}
              >
                <LumenIcon name={currentSlide.icon} size="xl" color={currentSlide.color} />
              </MotiView>

              {/* Background Glow */}
              <MotiView
                from={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.2, opacity: 0 }}
                transition={{ type: "timing", duration: 2000, loop: true }}
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: currentSlide.color, borderRadius: 100, zIndex: -1 },
                ]}
              />
            </View>

            {/* Text Content */}
            <View style={s.textContainer}>
              <Text
                style={[TextStyles.heading1, { color: colors.textPrimary, textAlign: "center" }]}
              >
                {currentSlide.title}
              </Text>
              <Text
                style={[
                  TextStyles.body,
                  { color: colors.textSecondary, textAlign: "center", marginTop: Spacing[4] },
                ]}
              >
                {currentSlide.description}
              </Text>
            </View>
          </MotiView>
        </AnimatePresence>
      </View>

      {/* Footer / Actions */}
      <View style={s.footer}>
        <Button
          label={currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
          variant="primary"
          size="lg"
          fullWidth
          onPress={nextSlide}
          iconRight={currentIndex === SLIDES.length - 1 ? "forward" : undefined}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[6],
    paddingTop: 60,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
  },
  slide: {
    alignItems: "center",
  },
  iconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[10],
  },
  textContainer: {
    alignItems: "center",
  },
  footer: {
    padding: Spacing[6],
    paddingBottom: Spacing[10],
  },
});
