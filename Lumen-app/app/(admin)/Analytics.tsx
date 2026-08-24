import { useTheme } from "@/design-system/ThemeContext";
import { Text, View } from "react-native";

export default function AnalyticsScreen() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgBase,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ color: colors.textPrimary }}>Analytics Screen</Text>
    </View>
  );
}
