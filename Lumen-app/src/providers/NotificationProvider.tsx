import type { ReactNode } from "react";

export interface NotificationProviderProps {
  readonly children: ReactNode;
}

export function NotificationProvider(props: NotificationProviderProps) {
  return <>{props.children}</>;
}
