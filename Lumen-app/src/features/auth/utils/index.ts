export function normalizeAuthIdentifier(value: string): string {
  return value.trim().toLowerCase();
}
export const authutilsModule = {
  name: "authutils",
} as const;
