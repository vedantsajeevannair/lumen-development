export interface OfflineQueueItem {
  readonly id: string;
  readonly type: string;
  readonly payload: string;
}

export interface OfflineSyncStatus {
  readonly syncing: boolean;
  readonly pendingCount: number;
}
export const offlinedomainModule = {
  name: "offlinedomain",
} as const;
