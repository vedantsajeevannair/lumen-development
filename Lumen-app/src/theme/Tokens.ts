import { DarkThemeColors, LightThemeColors } from "./Colors";
import { Radius } from "./Radius";
import { Spacing } from "./Spacing";
import { Typography } from "./Typography";

export const ThemeTokens = {
  colors: {
    light: LightThemeColors,
    dark: DarkThemeColors,
  },
  radius: Radius,
  spacing: Spacing,
  typography: Typography,
} as const;
