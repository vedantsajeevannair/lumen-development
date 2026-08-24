import type { CitizenPreference, CitizenProfile, CitizenReportSummary } from "../domain";
import type {
  LoadCitizenDashboardQuery,
  SubmitCitizenReportCommand,
  UpdateCitizenProfileCommand,
} from "../application";

export interface CitizenApiService {
  loadDashboard(query: LoadCitizenDashboardQuery): Promise<{
    profile: CitizenProfile;
    reports: CitizenReportSummary[];
    preference: CitizenPreference;
  }>;
  updateProfile(command: UpdateCitizenProfileCommand): Promise<CitizenProfile>;
  submitReport(command: SubmitCitizenReportCommand): Promise<CitizenReportSummary>;
}

export const citizenApiService: CitizenApiService = {
  async loadDashboard() {
    return {
      profile: { id: "", name: "", email: "" },
      reports: [],
      preference: { notificationsEnabled: false, darkModePreferred: false },
    };
  },
  async updateProfile(command) {
    return { id: command.citizenId, name: command.name, email: command.email };
  },
  async submitReport(command) {
    return { id: command.citizenId, title: command.title, status: "open" };
  },
};
export const citizenservicesModule = {
  name: "citizenservices",
} as const;
