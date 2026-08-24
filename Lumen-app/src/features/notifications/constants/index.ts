export const notificationsConstants = {
  routes: {
    inbox: "notifications",
    detail: "notificationDetail",
  },
  storageKeys: {
    inbox: "notifications.inbox",
    preferences: "notifications.preferences",
  },
} as const;
export const notificationsconstantsModule = {
  name: "notificationsconstants",
} as const;
