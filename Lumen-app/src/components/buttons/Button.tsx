import { Pressable, Text, View, StyleSheet } from "react-native";
import type { ButtonProps } from "./Button.types";

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#101828",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export function Button(props: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.root,
        pressed ? { opacity: 0.92, transform: [{ translateY: 1 }] } : null,
      ]}
      testID={props.testID}
    >
      <View>{props.children ? <Text style={styles.label}>{props.children}</Text> : null}</View>
    </Pressable>
  );
}
