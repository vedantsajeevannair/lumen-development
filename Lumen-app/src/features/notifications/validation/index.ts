import type { NotificationPreferenceFormValues } from "../types";

export function isValidNotificationPreference(values: NotificationPreferenceFormValues): boolean {
  return typeof values.enabled === "boolean" && typeof values.sound === "boolean";
}
export const notificationsvalidationModule = {
  name: "notificationsvalidation",
} as const;
