export interface NotificationItem {
  readonly id: string;
  readonly title: string;
  readonly seen: boolean;
}

export interface NotificationPreference {
  readonly enabled: boolean;
  readonly sound: boolean;
}
export const notificationsdomainModule = {
  name: "notificationsdomain",
} as const;
