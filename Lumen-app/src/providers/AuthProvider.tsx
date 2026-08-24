import type { ReactNode } from "react";

export interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider(props: AuthProviderProps) {
  return <>{props.children}</>;
}
