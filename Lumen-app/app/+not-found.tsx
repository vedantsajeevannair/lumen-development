import { Stack } from "expo-router";
import { Component as PremiumScreen } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <PremiumScreen
        badge="404"
        title="Page not found"
        subtitle="The requested path does not exist."
        description="Please navigate back to the workspace login or dashboard."
        primaryActionLabel="Go to Login"
        secondaryActionLabel="Go back"
      />
    </>
  );
}
