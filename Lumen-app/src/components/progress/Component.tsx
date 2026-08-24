import { StyleSheet, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    height: 10,
    borderRadius: 9999,
    backgroundColor: "rgba(208, 213, 221, 0.8)",
    overflow: "hidden",
  },
  fill: {
    width: "68%",
    height: "100%",
    borderRadius: 9999,
    backgroundColor: "#208AEF",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <View style={styles.fill} />
    </View>
  );
}
