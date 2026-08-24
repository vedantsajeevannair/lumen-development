import { useEffect, useRef } from "react";
import { Animated, Pressable, StatusBar, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";
import { componentStyles as styles } from "./Component.styles";

export function Component(props: ComponentProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, translateY]);

  return (
    <View style={styles.root} testID={props.testID}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
      <View style={styles.backdropTop} />
      <View style={styles.backdropBottom} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.hero}>
          {props.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{props.badge}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{props.title}</Text>
          {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{props.title}</Text>
          {props.description ? <Text style={styles.cardBody}>{props.description}</Text> : null}
          {props.children}
          {props.primaryActionLabel || props.secondaryActionLabel ? (
            <View style={styles.actions}>
              {props.primaryActionLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={props.primaryActionLabel}
                  onPress={props.onPrimaryAction}
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
                  ]}
                >
                  <Text style={styles.actionPrimaryLabel}>{props.primaryActionLabel}</Text>
                </Pressable>
              ) : null}
              {props.secondaryActionLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={props.secondaryActionLabel}
                  onPress={props.onSecondaryAction}
                  style={({ pressed }) => [
                    styles.actionSecondary,
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Text style={styles.actionSecondaryLabel}>{props.secondaryActionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
