import { Stack } from "expo-router";
import { ThemeProvider } from "@/design-system";

export default function AuthLayout() {
  return (
    <ThemeProvider forcedMode="dark">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </ThemeProvider>
  );
}
