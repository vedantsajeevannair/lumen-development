import { StyleSheet, Text } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    color: "#101828",
    fontSize: 16,
    lineHeight: 24,
  },
});

export function Component(props: ComponentProps) {
  return (
    <Text style={styles.root} testID={props.testID}>
      {props.children}
    </Text>
  );
}
