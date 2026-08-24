import type { LoadNotificationsQuery, MarkNotificationReadCommand } from "../application";
import type { NotificationItem } from "../domain";

export interface NotificationsApiService {
  loadNotifications(query: LoadNotificationsQuery): Promise<NotificationItem[]>;
  markAsRead(command: MarkNotificationReadCommand): Promise<void>;
}

export const notificationsApiService: NotificationsApiService = {
  async loadNotifications() {
    return [];
  },
  async markAsRead() {
    return undefined;
  },
};
export const notificationsservicesModule = {
  name: "notificationsservices",
} as const;
