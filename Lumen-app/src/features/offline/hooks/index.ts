export interface UseOfflineQueueResult {
  readonly hydrated: boolean;
  readonly pendingCount: number;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  return {
    hydrated: false,
    pendingCount: 0,
  } as const;
}
export const offlinehooksModule = {
  name: "offlinehooks",
} as const;
