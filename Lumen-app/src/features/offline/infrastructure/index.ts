export interface OfflineQueueAdapter {
  getQueue(): Promise<string | null>;
  setQueue(value: string): Promise<void>;
  clearQueue(): Promise<void>;
}

export const offlineQueueAdapter: OfflineQueueAdapter = {
  async getQueue() {
    return null;
  },
  async setQueue() {
    return undefined;
  },
  async clearQueue() {
    return undefined;
  },
};
export const offlineinfrastructureModule = {
  name: "offlineinfrastructure",
} as const;
