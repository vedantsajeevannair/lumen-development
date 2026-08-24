export interface UsePermissionState {
  readonly granted: boolean;
  readonly requested: boolean;
}

export function usePermission(): UsePermissionState {
  return {
    granted: false,
    requested: false,
  } as const;
}
