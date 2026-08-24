import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(217, 45, 32, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(217, 45, 32, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#B42318",
    fontSize: 16,
    fontWeight: "700",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <Text style={styles.text}>{props.children ?? "Something went wrong"}</Text>
    </View>
  );
}
