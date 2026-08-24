import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { ComponentProps } from "./Component.types";

const styles = StyleSheet.create({
  root: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function Component(props: ComponentProps) {
  return (
    <View style={styles.root} testID={props.testID}>
      <ActivityIndicator color="#208AEF" size="small" />
    </View>
  );
}
