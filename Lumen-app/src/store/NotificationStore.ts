export interface NotificationStoreState {
  readonly hydrated: boolean;
  readonly unreadCount: number;
}

export const notificationStore: NotificationStoreState = {
  hydrated: false,
  unreadCount: 0,
};
