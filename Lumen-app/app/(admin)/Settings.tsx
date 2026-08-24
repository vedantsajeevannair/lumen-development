import { useTheme } from "@/design-system/ThemeContext";
import { Text, View } from "react-native";

export default function SettingsScreen() {
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
      <Text style={{ color: colors.textPrimary }}>Settings Screen</Text>
    </View>
  );
}
