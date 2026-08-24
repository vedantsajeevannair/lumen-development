export interface ReportsStoreState {
  readonly hydrated: boolean;
  readonly listLoaded: boolean;
  readonly selectedReportId: string | null;
}

export const reportsStore: ReportsStoreState = {
  hydrated: false,
  listLoaded: false,
  selectedReportId: null,
};
export const reportsstoreModule = {
  name: "reportsstore",
} as const;
