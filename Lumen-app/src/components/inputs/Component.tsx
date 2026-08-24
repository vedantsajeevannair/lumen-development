import { StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(208, 213, 221, 0.9)",
    justifyContent: "center",
  },
  label: {
    color: "#667085",
    fontSize: 14,
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      {props.children ? props.children : <Text style={styles.label}>Input</Text>}
    </View>
  );
}
