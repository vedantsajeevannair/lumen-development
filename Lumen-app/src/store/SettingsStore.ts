export interface SettingsStoreState {
  readonly hydrated: boolean;
  readonly theme: "light" | "dark" | "system";
}

export const settingsStore: SettingsStoreState = {
  hydrated: false,
  theme: "system",
};
