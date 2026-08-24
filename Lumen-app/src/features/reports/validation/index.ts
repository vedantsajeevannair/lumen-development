import type { CreateReportFormValues, ReportFilterValues } from "../types";

export function isValidCreateReport(values: CreateReportFormValues): boolean {
  return values.title.length > 0 && values.description.length > 0;
}

export function isValidReportFilter(values: ReportFilterValues): boolean {
  return values.status.length > 0 || values.query.length > 0;
}
export const reportsvalidationModule = {
  name: "reportsvalidation",
} as const;
