import type { ReactNode } from "react";

export interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider(props: ThemeProviderProps) {
  return <>{props.children}</>;
}
