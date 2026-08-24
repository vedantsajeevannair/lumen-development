export interface LoadReportsQuery {
  readonly citizenId?: string;
}

export interface LoadReportDetailsQuery {
  readonly reportId: string;
}

export interface CreateReportCommand {
  readonly title: string;
  readonly description: string;
}
export const reportsapplicationModule = {
  name: "reportsapplication",
} as const;
