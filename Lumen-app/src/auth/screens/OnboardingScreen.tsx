import { useTheme } from "@/design-system/ThemeContext";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { OnboardingSlide } from "../presentation/components/OnboardingSlide";

const SLIDES = [
  {
    title: "Report Issues Instantly",
    description:
      "Snap a photo and report infrastructure problems in seconds. Your voice matters in building better communities.",
    image: require("@/assets/images/onboarding1.png"),
  },
  {
    title: "Track Progress in Real-Time",
    description:
      "Monitor the status of your reports and see how your community improves with every resolved issue.",
    image: require("@/assets/images/onboarding2.png"),
  },
  {
    title: "Connect with Your City",
    description:
      "Join thousands of citizens working together to create safer, cleaner, and more efficient neighborhoods.",
    image: require("@/assets/images/onboarding3.png"),
  },
];

export default function OnboardingScreen() {
  const { colors, fontSize, fontWeight, spacing, radius } = useTheme();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * 375, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/(auth)/Login");
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/Login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / 375);
          setCurrentIndex(index);
        }}
      >
        {SLIDES.map((slide, index) => {
          const slideKey = index;
          return <OnboardingSlide {...slide} index={index} total={SLIDES.length} />;
        })}
      </Animated.ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bgSurface, borderTopColor: colors.borderDefault },
        ]}
      >
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text
            style={[
              styles.skipText,
              { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: colors.brand, borderRadius: radius.full }]}
          accessibilityRole="button"
          accessibilityLabel={currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
        >
          <Text
            style={[
              styles.nextText,
              { color: colors.textInverse, fontSize: fontSize.md, fontWeight: fontWeight.bold },
            ]}
          >
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <ArrowRight size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  nextText: {
    fontSize: 16,
  },
});
