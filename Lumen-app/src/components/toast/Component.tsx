import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#101828",
    shadowColor: "#101828",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <Text style={styles.text}>{props.children ?? "Saved"}</Text>
    </View>
  );
}
