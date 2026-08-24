export interface CreateReportFormValues {
  readonly title: string;
  readonly description: string;
}

export interface ReportFilterValues {
  readonly status: string;
  readonly query: string;
}
export const reportstypesModule = {
  name: "reportstypes",
} as const;
