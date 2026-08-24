import { Component as PremiumScreen } from "@/components/ui";

export default function NotificationScreen() {
  return (
    <PremiumScreen
      badge="Inbox"
      description="Review important civic updates in a calm, premium notification layout with strong hierarchy."
      primaryActionLabel="Mark all read"
      secondaryActionLabel="Settings"
      subtitle="Smooth, readable, and built for quick triage."
      title="Notifications"
    />
  );
}
