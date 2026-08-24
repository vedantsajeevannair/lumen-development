export interface CitizenAnalyticsResponse {
  civicScore: {
    current: number;
  };
  overview: {
    totalReports: number;
    resolvedReports: number;
    pendingReports: number;
    rejectedReports: number;
    resolutionRate: number;
    avgResolutionHours: number | null;
  };
  trend: {
    labels: string[];
    datasets: {
      submitted: number[];
      resolved: number[];
    };
  };
  statusBreakdown: {
    status: string;
    count: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
  }[];
  priorityBreakdown: {
    priority: string;
    count: number;
  }[];
  aiInsights: {
    totalAiProcessed: number;
    avgConfidence: number | null;
  };
}
