import type { OfflineQueueFormValues } from "../types";

export function isValidOfflineQueue(values: OfflineQueueFormValues): boolean {
  return values.type.length > 0 && values.payload.length > 0;
}
export const offlinevalidationModule = {
  name: "offlinevalidation",
} as const;
