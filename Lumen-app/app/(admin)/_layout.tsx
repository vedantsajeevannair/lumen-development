import { Tabs, useSegments, router } from "expo-router";
import { useTheme } from "@/design-system/ThemeContext";
import { LumenIcon } from "@/design-system/icons/LumenIcon";
import { Platform, BackHandler, Alert } from "react-native";
import { useEffect } from "react";

export default function AdminLayout() {
  const { colors, isDark } = useTheme();
  const segments = useSegments() as string[];
  const currentPath = segments[1] || "Dashboard";

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // If we are at the root of the admin tab, prevent going back to Auth screens.
      if (currentPath === "Dashboard") {
        Alert.alert("Exit App", "Are you sure you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }

      // If they are on a different root tab/screen, go back to Dashboard
      router.push("/(admin)/Dashboard" as any);
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      if (backHandler && typeof backHandler.remove === "function") {
        backHandler.remove();
      } else {
        (BackHandler as any).removeEventListener("hardwareBackPress", onBackPress);
      }
    };
  }, [currentPath]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
          borderTopColor: colors.borderDefault,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 12,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: "Inter-Medium",
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <LumenIcon name="home" size="md" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="Complaints"
        options={{
          title: "Complaints",
          tabBarIcon: ({ color }) => <LumenIcon name="report" size="md" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="Map"
        options={{
          title: "GIS Map",
          tabBarIcon: ({ color }) => <LumenIcon name="map" size="md" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="AiCenter"
        options={{
          title: "AI Center",
          tabBarIcon: ({ color }) => <LumenIcon name="alert" size="md" color={color as string} />,
        }}
      />
    </Tabs>
  );
}
