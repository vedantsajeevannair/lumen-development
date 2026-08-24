export interface UseCitizenDashboardResult {
  readonly loading: boolean;
  readonly refreshedAt: string | null;
}

export function useCitizenDashboard(): UseCitizenDashboardResult {
  return {
    loading: false,
    refreshedAt: null,
  } as const;
}

export interface UseCitizenProfileResult {
  readonly editing: boolean;
}

export function useCitizenProfile(): UseCitizenProfileResult {
  return {
    editing: false,
  } as const;
}
export const citizenhooksModule = {
  name: "citizenhooks",
} as const;
