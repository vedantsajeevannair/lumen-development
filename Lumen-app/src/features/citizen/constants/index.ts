export const citizenConstants = {
  routes: {
    dashboard: "dashboard",
    reports: "reports",
    profile: "profile",
    notifications: "notifications",
    settings: "settings",
    help: "help",
  },
  storageKeys: {
    profile: "citizen.profile",
    preferences: "citizen.preferences",
  },
} as const;
export const citizenconstantsModule = {
  name: "citizenconstants",
} as const;
