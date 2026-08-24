import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "700",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <Text style={styles.text}>{props.children ?? "Nothing here yet"}</Text>
    </View>
  );
}
