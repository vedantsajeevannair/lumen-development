import type { ReactNode } from "react";

export interface LocationProviderProps {
  readonly children: ReactNode;
}

export function LocationProvider(props: LocationProviderProps) {
  return <>{props.children}</>;
}
