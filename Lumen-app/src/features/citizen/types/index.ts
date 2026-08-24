export interface CitizenProfileFormValues {
  readonly name: string;
  readonly email: string;
}

export interface CitizenReportFormValues {
  readonly title: string;
  readonly description: string;
}
export const citizentypesModule = {
  name: "citizentypes",
} as const;
