import { useTheme } from "@/design-system/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

interface OnboardingSlideProps {
  title: string;
  description: string;
  image: any;
  index: number;
  total: number;
}

export function OnboardingSlide({ title, description, image, index, total }: OnboardingSlideProps) {
  const { colors, fontSize, fontWeight, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <ImageBackground source={image} style={styles.image} resizeMode="cover">
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.pagination}>
            {Array.from({ length: total }).map((_, i) => {
              const dotKey = i;
              return (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? colors.brand : colors.borderDefault,
                      width: i === index ? 24 : 8,
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text
            style={[
              styles.title,
              { color: colors.textInverse, fontSize: fontSize["3xl"], fontWeight: fontWeight.bold },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.description,
              { color: colors.textInverse, fontSize: fontSize.md, fontWeight: fontWeight.regular },
            ]}
          >
            {description}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 24,
    paddingBottom: 80,
  },
  pagination: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    alignSelf: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.95,
  },
});
