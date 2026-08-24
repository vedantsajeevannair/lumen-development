import type { ReactNode } from "react";

export interface QueryProviderProps {
  readonly children: ReactNode;
}

export function QueryProvider(props: QueryProviderProps) {
  return <>{props.children}</>;
}
