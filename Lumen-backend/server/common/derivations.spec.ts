import {
  severityBand,
  severityPercent,
  slaStatus,
  complaintDerivations,
  SLA_HOURS,
} from './derivations';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

describe('severity banding', () => {
  // The AI service emits 0-5 (server/ai/python/postprocess.py caps at 5.0).
  it('bands the 0-5 scale the AI service actually produces', () => {
    expect(severityBand(4.6)).toBe('SEVERE');
    expect(severityBand(3.5)).toBe('SIGNIFICANT');
    expect(severityBand(2.0)).toBe('MODERATE');
    expect(severityBand(0.8)).toBe('MINOR');
  });

  it('reports NONE when the model has not scored the photo yet', () => {
    expect(severityBand(null)).toBe('NONE');
    expect(severityBand(undefined)).toBe('NONE');
  });

  // The band must not contradict the priority set in ai/ai.repository.ts,
  // which uses the same > 4 / > 3 thresholds.
  it('agrees with the priority thresholds used when the complaint is scored', () => {
    expect(severityBand(4.1)).toBe('SEVERE'); // repository -> CRITICAL
    expect(severityBand(3.1)).toBe('SIGNIFICANT'); // repository -> HIGH
  });

  it('normalises to 0-100 so clients need no scale knowledge', () => {
    expect(severityPercent(5)).toBe(100);
    expect(severityPercent(2.5)).toBe(50);
    expect(severityPercent(0)).toBe(0);
    expect(severityPercent(null)).toBe(0);
    expect(severityPercent(99)).toBe(100); // clamped
  });
});

describe('SLA state', () => {
  it('is ON_TRACK early in the budget', () => {
    expect(slaStatus(hoursAgo(1), 'MEDIUM', 'PENDING')).toBe('ON_TRACK');
  });

  it('turns AT_RISK once 75% of the budget is gone', () => {
    expect(
      slaStatus(hoursAgo(SLA_HOURS.MEDIUM * 0.8), 'MEDIUM', 'PENDING'),
    ).toBe('AT_RISK');
  });

  it('is BREACHED past the deadline', () => {
    expect(
      slaStatus(hoursAgo(SLA_HOURS.CRITICAL + 1), 'CRITICAL', 'ASSIGNED'),
    ).toBe('BREACHED');
  });

  it('scales the budget by priority', () => {
    // 6h old: past CRITICAL's 4h budget, still inside HIGH's 12h one.
    expect(slaStatus(hoursAgo(6), 'CRITICAL', 'PENDING')).toBe('BREACHED');
    expect(slaStatus(hoursAgo(6), 'HIGH', 'PENDING')).toBe('ON_TRACK');
  });

  it('MET when closed inside the budget, BREACHED when closed after', () => {
    expect(slaStatus(hoursAgo(2), 'MEDIUM', 'RESOLVED', hoursAgo(1))).toBe(
      'MET',
    );
    expect(slaStatus(hoursAgo(100), 'MEDIUM', 'CLOSED', hoursAgo(1))).toBe(
      'BREACHED',
    );
  });

  it('falls back to the MEDIUM budget for an unknown priority', () => {
    expect(slaStatus(hoursAgo(1), 'NONSENSE', 'PENDING')).toBe('ON_TRACK');
  });
});

describe('complaintDerivations', () => {
  it('returns everything a client needs to render without computing', () => {
    const d = complaintDerivations({
      severity: 4.4,
      priority: 'CRITICAL',
      status: 'PENDING',
      createdAt: hoursAgo(1),
    });
    expect(d).toEqual({
      severityBand: 'SEVERE',
      severityPercent: 88,
      slaStatus: 'ON_TRACK',
      slaHours: 4,
    });
  });
});
