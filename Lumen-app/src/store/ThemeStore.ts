export interface ThemeStoreState {
  readonly hydrated: boolean;
  readonly mode: "light" | "dark" | "system";
}

export const themeStore: ThemeStoreState = {
  hydrated: false,
  mode: "system",
};
