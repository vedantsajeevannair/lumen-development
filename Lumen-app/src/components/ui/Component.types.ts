import type { ReactNode } from "react";

export interface ComponentProps {
  readonly children?: ReactNode;
  readonly badge?: string;
  readonly description?: string;
  readonly primaryActionLabel?: string;
  readonly secondaryActionLabel?: string;
  readonly onPrimaryAction?: () => void;
  readonly onSecondaryAction?: () => void;
  readonly subtitle?: string;
  readonly title: string;
  readonly testID?: string;
}
