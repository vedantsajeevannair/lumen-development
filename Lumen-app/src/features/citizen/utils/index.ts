export function normalizeCitizenQuery(value: string): string {
  return value.trim().toLowerCase();
}
export const citizenutilsModule = {
  name: "citizenutils",
} as const;
