import type { CitizenProfileFormValues, CitizenReportFormValues } from "../types";

export function isValidCitizenProfile(values: CitizenProfileFormValues): boolean {
  return values.name.length > 0 && values.email.length > 0;
}

export function isValidCitizenReport(values: CitizenReportFormValues): boolean {
  return values.title.length > 0 && values.description.length > 0;
}
export const citizenvalidationModule = {
  name: "citizenvalidation",
} as const;
