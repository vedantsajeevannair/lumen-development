import type { ReactNode } from "react";

export interface ToastProps {
  readonly children?: ReactNode;
  readonly testID?: string;
}
