import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E6F4FE",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#208AEF",
    fontWeight: "700",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <Text style={styles.label}>{props.children ?? "L"}</Text>
    </View>
  );
}
