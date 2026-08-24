/**
 * Display helpers for the severity band and SLA state the backend sends.
 *
 * The thresholds are business rules and live server-side in
 * server/common/derivations.ts. Nothing here decides what "SEVERE" means — it
 * only decides how to render it. Keep it that way: if you find yourself
 * comparing a severity number here, it belongs in the backend instead.
 */

export type SeverityBand = "SEVERE" | "SIGNIFICANT" | "MODERATE" | "MINOR" | "NONE";
export type SlaState = "MET" | "ON_TRACK" | "AT_RISK" | "BREACHED";

const BAND_LABEL: Record<string, string> = {
  SEVERE: "Severe",
  SIGNIFICANT: "Significant",
  MODERATE: "Moderate",
  MINOR: "Minor",
  NONE: "Analysis Pending",
};

const BAND_COLOR: Record<string, string> = {
  SEVERE: "#F04438",
  SIGNIFICANT: "#F79009",
  MODERATE: "#208AEF",
  MINOR: "#12B76A",
  NONE: "#6B7280",
};

export const severityLabel = (band?: string | null) =>
  BAND_LABEL[band ?? "NONE"] ?? BAND_LABEL.NONE;

export const severityColor = (band?: string | null) =>
  BAND_COLOR[band ?? "NONE"] ?? BAND_COLOR.NONE;

const SLA_COLOR: Record<string, string> = {
  BREACHED: "#F04438",
  AT_RISK: "#F79009",
  ON_TRACK: "#12B76A",
  MET: "#12B76A",
};

const SLA_LABEL: Record<string, string> = {
  BREACHED: "SLA breached",
  AT_RISK: "SLA at risk",
  ON_TRACK: "On track",
  MET: "Met SLA",
};

export const slaColor = (state?: string | null) =>
  SLA_COLOR[state ?? "ON_TRACK"] ?? SLA_COLOR.ON_TRACK;
export const slaLabel = (state?: string | null) =>
  SLA_LABEL[state ?? "ON_TRACK"] ?? SLA_LABEL.ON_TRACK;
