export interface UseReportsResult {
  readonly loading: boolean;
  readonly count: number;
}

export function useReports(): UseReportsResult {
  return {
    loading: false,
    count: 0,
  } as const;
}
export const reportshooksModule = {
  name: "reportshooks",
} as const;
