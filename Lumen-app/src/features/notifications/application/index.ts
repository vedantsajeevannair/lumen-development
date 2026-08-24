export interface LoadNotificationsQuery {
  readonly userId: string;
}

export interface MarkNotificationReadCommand {
  readonly notificationId: string;
}
export const notificationsapplicationModule = {
  name: "notificationsapplication",
} as const;
