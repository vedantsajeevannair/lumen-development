import type { ReactNode } from "react";

export interface ComponentProps {
  readonly children?: ReactNode;
  readonly testID?: string;
}
