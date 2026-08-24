export interface LoadCitizenDashboardQuery {
  readonly citizenId: string;
}

export interface UpdateCitizenProfileCommand {
  readonly citizenId: string;
  readonly name: string;
  readonly email: string;
}

export interface SubmitCitizenReportCommand {
  readonly citizenId: string;
  readonly title: string;
  readonly description: string;
}
export const citizenapplicationModule = {
  name: "citizenapplication",
} as const;
