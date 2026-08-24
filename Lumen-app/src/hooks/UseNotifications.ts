export interface UseNotificationsState {
  readonly enabled: boolean;
  readonly permissionRequested: boolean;
}

export function useNotifications(): UseNotificationsState {
  return {
    enabled: false,
    permissionRequested: false,
  } as const;
}
