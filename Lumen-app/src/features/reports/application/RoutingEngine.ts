import { Department, ReportPriority } from "../domain/Report";

export interface CategoryMapping {
  issueType: string;
  department: Department;
  defaultPriority: ReportPriority;
  slaHours: number;
}

export const ROUTING_RULES: CategoryMapping[] = [
  {
    issueType: "Road Damage",
    department: "roads_and_transport",
    defaultPriority: "high",
    slaHours: 48,
  },
  {
    issueType: "Streetlight",
    department: "electricity_board",
    defaultPriority: "medium",
    slaHours: 24,
  },
  { issueType: "Garbage", department: "sanitation", defaultPriority: "medium", slaHours: 12 },
  { issueType: "Water Leakage", department: "water_supply", defaultPriority: "high", slaHours: 6 },
  { issueType: "Drainage", department: "drainage", defaultPriority: "high", slaHours: 24 },
  {
    issueType: "Tree Fall",
    department: "parks_and_recreation",
    defaultPriority: "medium",
    slaHours: 24,
  },
  {
    issueType: "Public Property",
    department: "municipal_maintenance",
    defaultPriority: "low",
    slaHours: 72,
  },
  {
    issueType: "Illegal Construction",
    department: "urban_planning",
    defaultPriority: "medium",
    slaHours: 168,
  }, // 1 week
  {
    issueType: "Animal Issue",
    department: "animal_welfare",
    defaultPriority: "medium",
    slaHours: 12,
  },
  {
    issueType: "Electric Hazard",
    department: "electricity_board",
    defaultPriority: "critical",
    slaHours: 2,
  },
  {
    issueType: "Traffic Signal",
    department: "traffic_department",
    defaultPriority: "critical",
    slaHours: 4,
  },
  {
    issueType: "Bridge Damage",
    department: "civil_engineering",
    defaultPriority: "critical",
    slaHours: 12,
  },
];

export class RoutingEngine {
  /**
   * Identifies the correct department and SLA based on the issue type string.
   */
  static determineRouting(issueType: string): CategoryMapping {
    const rule = ROUTING_RULES.find((r) => r.issueType.toLowerCase() === issueType.toLowerCase());

    // Fallback to Municipal Maintenance if category is unknown
    return (
      rule || {
        issueType,
        department: "municipal_maintenance",
        defaultPriority: "medium",
        slaHours: 48,
      }
    );
  }

  /**
   * Generates SLA timestamps based on the current time and target hours.
   */
  static calculateSLA(targetHours: number) {
    const now = new Date();
    const breachTime = new Date(now.getTime() + targetHours * 60 * 60 * 1000);

    return {
      targetHours,
      startTime: now.toISOString(),
      breachTime: breachTime.toISOString(),
      remainingMinutes: targetHours * 60,
    };
  }

  /**
   * Analyzes an image description/caption to suggest an issue type (Mock implementation for now)
   */
  static async mockAiCategorySuggestion(imageDescription: string): Promise<CategoryMapping> {
    const lowerDesc = imageDescription.toLowerCase();
    let bestMatch = ROUTING_RULES[0]; // Default to Road

    if (lowerDesc.includes("water") || lowerDesc.includes("pipe") || lowerDesc.includes("leak")) {
      bestMatch = ROUTING_RULES.find((r) => r.issueType === "Water Leakage")!;
    } else if (
      lowerDesc.includes("trash") ||
      lowerDesc.includes("garbage") ||
      lowerDesc.includes("waste")
    ) {
      bestMatch = ROUTING_RULES.find((r) => r.issueType === "Garbage")!;
    } else if (
      lowerDesc.includes("light") ||
      lowerDesc.includes("pole") ||
      lowerDesc.includes("dark")
    ) {
      bestMatch = ROUTING_RULES.find((r) => r.issueType === "Streetlight")!;
    } else if (
      lowerDesc.includes("wire") ||
      lowerDesc.includes("electric") ||
      lowerDesc.includes("spark")
    ) {
      bestMatch = ROUTING_RULES.find((r) => r.issueType === "Electric Hazard")!;
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return bestMatch;
  }
}
