import type { CreateReportCommand, LoadReportDetailsQuery, LoadReportsQuery } from "../application";
import type { ReportDetails, ReportSummary } from "../domain";

export interface ReportsApiService {
  loadReports(query: LoadReportsQuery): Promise<ReportSummary[]>;
  loadReportDetails(query: LoadReportDetailsQuery): Promise<ReportDetails>;
  createReport(command: CreateReportCommand): Promise<ReportSummary>;
}

export const reportsApiService: ReportsApiService = {
  async loadReports() {
    return [];
  },
  async loadReportDetails(query) {
    return {
      id: query.reportId,
      description: "",
      priority: "low",
    };
  },
  async createReport(command) {
    return {
      id: "",
      title: command.title,
      status: "draft",
    };
  },
};
export const reportsservicesModule = {
  name: "reportsservices",
} as const;
