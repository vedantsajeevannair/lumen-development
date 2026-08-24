export interface ReportStoreState {
  readonly hydrated: boolean;
  readonly pendingCount: number;
}

export const reportStore: ReportStoreState = {
  hydrated: false,
  pendingCount: 0,
};
