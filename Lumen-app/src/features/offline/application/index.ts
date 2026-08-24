export interface QueueOfflineActionCommand {
  readonly type: string;
  readonly payload: string;
}

export interface FlushOfflineQueueCommand {
  readonly force?: boolean;
}
export const offlineapplicationModule = {
  name: "offlineapplication",
} as const;
