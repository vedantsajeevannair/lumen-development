export interface UseThemeState {
  readonly theme: "light" | "dark" | "system";
}

export function useTheme(): UseThemeState {
  return {
    theme: "system",
  } as const;
}
