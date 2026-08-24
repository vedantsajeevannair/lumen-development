export interface NotificationsStoreState {
  readonly hydrated: boolean;
  readonly unreadCount: number;
  readonly syncing: boolean;
}

export const notificationsStore: NotificationsStoreState = {
  hydrated: false,
  unreadCount: 0,
  syncing: false,
};
export const notificationsstoreModule = {
  name: "notificationsstore",
} as const;
