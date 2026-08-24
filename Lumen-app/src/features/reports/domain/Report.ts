export type ReportStatus =
  | "submitted"
  | "verified"
  | "assigned"
  | "engineer_accepted"
  | "travelling"
  | "on_site"
  | "work_started"
  | "paused"
  | "work_completed"
  | "citizen_verification"
  | "closed"
  | "archived";

export type Department =
  | "roads_and_transport"
  | "sanitation"
  | "water_supply"
  | "drainage"
  | "parks_and_recreation"
  | "municipal_maintenance"
  | "urban_planning"
  | "animal_welfare"
  | "electricity_board"
  | "traffic_department"
  | "civil_engineering";

export type ReportPriority = "low" | "medium" | "high" | "critical";

export interface TimelineEvent {
  id: string;
  reportId: string;
  status: ReportStatus;
  description: string;
  timestamp: string; // ISO String
  actorId?: string; // ID of the person who triggered this
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  url: string;
  type: "image" | "video" | "audio" | "pdf";
  sizeBytes: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: Coordinates;
  address?: string;
  landmark?: string;
  ward?: string;
  zone?: string;
  district?: string;
  municipality?: string;
}

export interface Report {
  id: string;
  citizenId: string;
  issueType: string;
  aiSuggestedCategory?: string;
  description: {
    written: string;
    voiceUrl?: string;
  };
  location: LocationData;
  media: Attachment[];
  priority: ReportPriority;
  status: ReportStatus;
  department: Department;
  assignedEngineerId?: string;
  assignedSupervisorId?: string;
  sla: {
    targetHours: number;
    startTime: string; // ISO String
    breachTime: string; // ISO String
    remainingMinutes: number;
  };
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  isOfflineSync?: boolean; // True if saved locally and pending sync
}
