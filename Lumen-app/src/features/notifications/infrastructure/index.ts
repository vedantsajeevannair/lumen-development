export interface NotificationsCacheAdapter {
  getInbox(): Promise<string | null>;
  setInbox(value: string): Promise<void>;
}

export const notificationsCacheAdapter: NotificationsCacheAdapter = {
  async getInbox() {
    return null;
  },
  async setInbox() {
    return undefined;
  },
};
export const notificationsinfrastructureModule = {
  name: "notificationsinfrastructure",
} as const;
