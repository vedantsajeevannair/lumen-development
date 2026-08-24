import { useTheme } from "@/design-system/ThemeContext";
import { Text, View } from "react-native";

export default function UsersScreen() {
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
      <Text style={{ color: colors.textPrimary }}>Users Screen</Text>
    </View>
  );
}
