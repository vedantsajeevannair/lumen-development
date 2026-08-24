import { Component as PremiumScreen } from "@/components/ui";

export default function OfflineScreen() {
  return (
    <PremiumScreen
      badge="Offline Queue"
      description="Track pending work with a dependable offline surface that keeps progress visible and recoverable."
      primaryActionLabel="Sync now"
      secondaryActionLabel="Review queue"
      subtitle="Designed to make disconnected states feel controlled and transparent."
      title="Offline mode"
    />
  );
}
