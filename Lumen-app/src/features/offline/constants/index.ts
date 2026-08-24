export const offlineConstants = {
  routes: {
    queue: "offlineQueue",
    status: "offlineStatus",
  },
  storageKeys: {
    queue: "offline.queue",
    lastSync: "offline.lastSync",
  },
} as const;
export const offlineconstantsModule = {
  name: "offlineconstants",
} as const;
