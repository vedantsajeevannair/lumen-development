import type { FlushOfflineQueueCommand, QueueOfflineActionCommand } from "../application";
import type { OfflineQueueItem } from "../domain";

export interface OfflineApiService {
  queueAction(command: QueueOfflineActionCommand): Promise<OfflineQueueItem>;
  flushQueue(command: FlushOfflineQueueCommand): Promise<number>;
}

export const offlineApiService: OfflineApiService = {
  async queueAction(command) {
    return {
      id: "",
      type: command.type,
      payload: command.payload,
    };
  },
  async flushQueue() {
    return 0;
  },
};
export const offlineservicesModule = {
  name: "offlineservices",
} as const;
