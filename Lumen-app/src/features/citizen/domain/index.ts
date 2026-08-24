export interface CitizenProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface CitizenReportSummary {
  readonly id: string;
  readonly title: string;
  readonly status: "open" | "in_progress" | "resolved";
}

export interface CitizenPreference {
  readonly notificationsEnabled: boolean;
  readonly darkModePreferred: boolean;
}
export const citizendomainModule = {
  name: "citizendomain",
} as const;
