import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { calculatePriority, type PriorityResult } from './priority';
import { haversineMeters } from '../../field-ops/geo';
import { severityPercent } from '../derivations';

/**
 * Priority, scored rather than switched.
 *
 * What this replaces: ai.repository.ts decided priority with what amounted to a
 * switch on one input —
 *
 *   more than two same-class reports within 30 m → CRITICAL
 *   one or two                                   → HIGH
 *   otherwise, severity above 4 → CRITICAL, above 3 → HIGH
 *
 * Clustering therefore outranked everything else. A complaint the detector
 * scored 0 on, with no damage regions found at all, was reported as HIGH
 * because two unrelated reports sat near it — which on this deployment meant
 * near the fallback coordinate they had all been stamped with.
 *
 * The lumen-platform scorer weighs six factors into 0–100 and bands the
 * result, so nearby reports contribute at most 12 points instead of deciding
 * the outcome:
 *
 *   severity × 0.5        up to 50
 *   confidence × 10       up to 10
 *   location risk         up to 18   (landmarks, each by its own radius)
 *   department risk        4 for roads
 *   nearby reports × 3    up to 12
 *   age, per day × 2      up to 10
 *
 * Computed on read, not stored. Age is one of the inputs, so a stored score is
 * stale the moment it is written — a complaint should climb the queue as it
 * waits, which is what the console already tells the user is happening.
 */
@Injectable()
export class PriorityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Same-class open reports within the clustering radius of this one. */
  private countNearby(
    c: { trackingId: string; latitude: number | null; longitude: number | null; category: string },
    all: { trackingId: string; latitude: number | null; longitude: number | null; category: string }[],
    radiusM = 30,
  ): number {
    if (c.latitude == null || c.longitude == null) return 0;
    return all.filter(
      (o) =>
        o.trackingId !== c.trackingId &&
        o.latitude != null &&
        o.longitude != null &&
        o.category.toLowerCase() === c.category.toLowerCase() &&
        haversineMeters(c.latitude!, c.longitude!, o.latitude, o.longitude) <= radiusM,
    ).length;
  }

  /**
   * Score one complaint against the population it belongs to.
   *
   * The population is passed in rather than queried per complaint: scoring a
   * list of N would otherwise be N round trips just to count neighbours.
   */
  score(
    complaint: {
      trackingId: string;
      latitude: number | null;
      longitude: number | null;
      category: string;
      severity: number | null;
      confidence: number | null;
      createdAt: Date;
    },
    population: {
      trackingId: string;
      latitude: number | null;
      longitude: number | null;
      category: string;
    }[],
  ): PriorityResult {
    return calculatePriority({
      // severity is 0–5 in this schema; the scorer expects 0–100.
      severityScore: severityPercent(complaint.severity),
      confidence: complaint.confidence ?? 0,
      categoryLabel: complaint.category,
      // A complaint with no fix earns no location risk, rather than being
      // measured against an invented point.
      lat: complaint.latitude ?? 0,
      lng: complaint.longitude ?? 0,
      nearbyReports: this.countNearby(complaint, population),
      createdAt: complaint.createdAt,
    });
  }

  /** The population neighbour counts are taken against: everything still open. */
  async population() {
    return this.prisma.complaint.findMany({
      where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
      select: {
        trackingId: true,
        latitude: true,
        longitude: true,
        category: true,
      },
    });
  }
}
