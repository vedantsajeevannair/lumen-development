export interface UseNotificationsInboxResult {
  readonly loading: boolean;
  readonly unreadCount: number;
}

export function useNotificationsInbox(): UseNotificationsInboxResult {
  return {
    loading: false,
    unreadCount: 0,
  } as const;
}
export const notificationshooksModule = {
  name: "notificationshooks",
} as const;
