export interface ReportsCacheAdapter {
  getReports(): Promise<string | null>;
  setReports(value: string): Promise<void>;
}

export const reportsCacheAdapter: ReportsCacheAdapter = {
  async getReports() {
    return null;
  },
  async setReports() {
    return undefined;
  },
};
export const reportsinfrastructureModule = {
  name: "reportsinfrastructure",
} as const;
