import { useEffect, useState } from "react";

export interface UseOfflineQueueState {
  readonly pendingItems: number;
  readonly syncing: boolean;
  readonly enqueue: (item: unknown) => void;
  readonly clearQueue: () => void;
}

export function useOfflineQueue(): UseOfflineQueueState {
  const [pendingItems, setPendingItems] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    setPendingItems(0);
  }, []);

  const enqueue = (item: unknown) => {
    void item;
    setPendingItems((prev) => prev + 1);
  };

  const clearQueue = () => {
    setSyncing(true);
    setTimeout(() => {
      setPendingItems(0);
      setSyncing(false);
    }, 1000);
  };

  return {
    pendingItems,
    syncing,
    enqueue,
    clearQueue,
  } as const;
}
