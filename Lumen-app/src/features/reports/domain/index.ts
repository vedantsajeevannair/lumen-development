export interface ReportSummary {
  readonly id: string;
  readonly title: string;
  readonly status: "draft" | "submitted" | "assigned" | "resolved";
}

export interface ReportDetails {
  readonly id: string;
  readonly description: string;
  readonly priority: "low" | "medium" | "high";
}
export const reportsdomainModule = {
  name: "reportsdomain",
} as const;
