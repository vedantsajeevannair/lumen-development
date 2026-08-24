/**
 * Derived complaint values — severity banding and SLA state.
 *
 * These are business rules, so they belong here and only here. They were
 * previously re-implemented in the web app, in three places in the mobile app,
 * and (on the wrong scale) in web-integration. Clients now render what the API
 * sends instead of recomputing it.
 */

/** The AI service scores severity on 0–5 (see server/ai/python/postprocess.py:
 *  `severity = min(5.0, avg_confidence * 3 + boxes * 0.5)`). */
export const SEVERITY_SCALE_MAX = 5;

export type SeverityBand =
  | 'SEVERE'
  | 'SIGNIFICANT'
  | 'MODERATE'
  | 'MINOR'
  | 'NONE';

/** Thresholds match the priority derivation in ai/ai.repository.ts, so a
 *  CRITICAL complaint is always shown as SEVERE. */
export function severityBand(severity: number | null | undefined): SeverityBand {
  if (severity === null || severity === undefined) return 'NONE';
  if (severity > 4) return 'SEVERE';
  if (severity > 3) return 'SIGNIFICANT';
  if (severity > 1.5) return 'MODERATE';
  return 'MINOR';
}

/** Severity as a 0–100 percentage, so clients can size a bar without needing
 *  to know the underlying scale. */
export function severityPercent(severity: number | null | undefined): number {
  if (severity === null || severity === undefined) return 0;
  const pct = (severity / SEVERITY_SCALE_MAX) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

/** Response-time budget per priority, in hours. */
export const SLA_HOURS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 12,
  MEDIUM: 48,
  LOW: 72,
};

export type SlaStatus = 'MET' | 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

/** AT_RISK once 75% of the budget is gone — matches the amber threshold the
 *  mobile app used before this moved server-side. */
export function slaStatus(
  createdAt: Date | string,
  priority: string | null | undefined,
  status: string | null | undefined,
  closedAt?: Date | string | null,
): SlaStatus {
  const budget = SLA_HOURS[priority ?? 'MEDIUM'] ?? SLA_HOURS.MEDIUM;
  const start = new Date(createdAt).getTime();
  const deadline = start + budget * 3600_000;

  if (status === 'RESOLVED' || status === 'CLOSED') {
    const ref = closedAt ? new Date(closedAt).getTime() : Date.now();
    return ref <= deadline ? 'MET' : 'BREACHED';
  }

  const now = Date.now();
  if (now >= deadline) return 'BREACHED';
  if (now >= start + budget * 0.75 * 3600_000) return 'AT_RISK';
  return 'ON_TRACK';
}

/** Everything a client needs to render a complaint's severity and SLA. */
export function complaintDerivations(c: {
  severity?: number | null;
  priority?: string | null;
  status?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}) {
  const closed = c.status === 'RESOLVED' || c.status === 'CLOSED';
  return {
    severityBand: severityBand(c.severity),
    severityPercent: severityPercent(c.severity),
    slaStatus: slaStatus(
      c.createdAt,
      c.priority,
      c.status,
      closed ? c.updatedAt : null,
    ),
    slaHours: SLA_HOURS[c.priority ?? 'MEDIUM'] ?? SLA_HOURS.MEDIUM,
  };
}
