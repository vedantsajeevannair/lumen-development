import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ComplaintStatus, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  estimateMaterials,
  potholePerimeter,
  potholeVolume,
  type RoadType,
} from '../common/estimating/materials';
import {
  ESTIMATE_NOTE,
  suggestDimensions,
} from '../common/estimating/dimensions';
import { toDetections } from '../common/estimating/detections';
import { buildClusters, RADIUS_M, type Clusterable } from './clusters';
import { buildItems, plan } from './planner';
import { severityPercent, SLA_HOURS } from '../common/derivations';

/**
 * Site measurement, material estimation, reopening and notifications.
 *
 * Ported from the lumen-platform Express backend, which is where the web
 * console's Estimate, Budget and Work Orders pages came from. Three things had
 * to change on the way across, and they are the only places this differs from
 * the original:
 *
 *  - Complaints are keyed by `trackingId` here, not `ref`.
 *  - Detections live on a related AiPrediction row as normalised objects,
 *    not as a JSON string column of pixel arrays — see detections.ts.
 *  - There is no PENDING_REVIEW status. A finished repair is RESOLVED or
 *    CLOSED, so reopening accepts either.
 */
/** Not RESOLVED, CLOSED or REJECTED. */
const OPEN_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.PENDING,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
];

/**
 * A 0-100 priority score, from the band.
 *
 * The clustering and planning code both rank on a numeric score, which that
 * schema stored per complaint and recomputed on read. Here priority is only
 * ever a band, so the score is the midpoint of each band's range — enough to
 * order work correctly without inventing precision the data does not carry.
 */
const PRIORITY_SCORE: Record<string, number> = {
  CRITICAL: 85,
  HIGH: 65,
  MEDIUM: 40,
  LOW: 15,
};

@Injectable()
export class FieldOpsService {
  private readonly logger = new Logger(FieldOpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async findByRef(ref: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { OR: [{ trackingId: ref }, { id: ref }] },
    });
    if (!complaint) throw new NotFoundException('Complaint not found.');
    return complaint;
  }

  // ---------------------------------------------------------------------------
  // Site measurements
  // ---------------------------------------------------------------------------

  async recordMeasurements(ref: string, body: any, user: any) {
    const complaint = await this.findByRef(ref);

    const roadType = String(body?.roadType ?? '');
    if (roadType && roadType !== 'BITUMINOUS' && roadType !== 'CONCRETE') {
      throw new BadRequestException(
        'Road type must be BITUMINOUS or CONCRETE.',
      );
    }

    const raw = Array.isArray(body?.potholes) ? body.potholes : [];
    const rows: {
      label: string;
      lengthM: number;
      widthM: number;
      depthM: number;
      source: string;
    }[] = [];

    for (const [i, p] of raw.entries()) {
      const lengthM = Number(p?.lengthM);
      const widthM = Number(p?.widthM);
      const depthM = Number(p?.depthM);

      // A zero or negative dimension is a typo, not a pothole. Reject rather
      // than silently store a measurement that would understate the order.
      if (![lengthM, widthM, depthM].every((v) => Number.isFinite(v) && v > 0)) {
        throw new BadRequestException(
          `Pothole ${i + 1}: length, width and depth must all be greater than zero.`,
        );
      }
      if (lengthM > 50 || widthM > 50 || depthM > 5) {
        throw new BadRequestException(
          `Pothole ${i + 1}: dimensions look wrong — check the units are metres.`,
        );
      }
      rows.push({
        label: String(p?.label ?? `P${i + 1}`).slice(0, 12),
        lengthM,
        widthM,
        depthM,
        source: p?.source === 'ESTIMATED' ? 'ESTIMATED' : 'MEASURED',
      });
    }

    const recordedBy = user?.fullName || user?.email || 'Unknown';
    const total = rows.reduce(
      (t, r) => t + potholeVolume(r.lengthM, r.widthM, r.depthM),
      0,
    );

    // Replace wholesale inside a transaction: the form submits the full current
    // list, so an edit that removes a row must remove it here too — and a
    // delete that succeeded while the insert failed would lose measurements an
    // engineer had already driven out to take.
    await this.prisma.$transaction(async (tx) => {
      await tx.potholeMeasurement.deleteMany({
        where: { complaintId: complaint.id },
      });
      if (rows.length) {
        await tx.potholeMeasurement.createMany({
          data: rows.map((r) => ({
            complaintId: complaint.id,
            label: r.label,
            lengthM: r.lengthM,
            widthM: r.widthM,
            depthM: r.depthM,
            volumeM3: potholeVolume(r.lengthM, r.widthM, r.depthM),
            perimeterM: potholePerimeter(r.lengthM, r.widthM),
            recordedBy,
            source: r.source,
          })),
        });
      }
      if (roadType) {
        await tx.complaint.update({
          where: { id: complaint.id },
          data: { roadType },
        });
      }
      await tx.complaintTimeline.create({
        data: {
          complaintId: complaint.id,
          status: complaint.status,
          performedById: user.id,
          notes:
            `${rows.length} pothole${rows.length === 1 ? '' : 's'} ` +
            `${rows.some((r) => r.source === 'ESTIMATED') ? 'estimated from the photograph' : 'measured on site'}` +
            ` — total volume ${total.toFixed(3)} m³`,
        },
      });
    });

    return {
      ok: true,
      count: rows.length,
      totalVolumeM3: Number(total.toFixed(3)),
    };
  }

  // ---------------------------------------------------------------------------
  // Bill of quantities
  // ---------------------------------------------------------------------------

  async estimate(ref: string, wastageRaw: unknown) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { OR: [{ trackingId: ref }, { id: ref }] },
      include: { potholes: { orderBy: { recordedAt: 'asc' } } },
    });
    if (!complaint) throw new NotFoundException('Complaint not found.');

    if (complaint.potholes.length === 0) {
      throw new BadRequestException(
        'No site measurements recorded yet for this complaint.',
      );
    }

    const roadType = (
      complaint.roadType === 'CONCRETE' ? 'CONCRETE' : 'BITUMINOUS'
    ) as RoadType;
    const wastage = Number(wastageRaw ?? 5);
    const volume = complaint.potholes.reduce((t, p) => t + p.volumeM3, 0);

    return {
      ref: complaint.trackingId,
      title: complaint.title,
      potholes: complaint.potholes,
      estimate: estimateMaterials(
        volume,
        complaint.potholes.length,
        roadType,
        Number.isFinite(wastage) ? wastage : 5,
      ),
    };
  }

  // ---------------------------------------------------------------------------
  // First-pass dimensions from the photograph
  // ---------------------------------------------------------------------------

  async suggestDimensions(ref: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { OR: [{ trackingId: ref }, { id: ref }] },
      include: { aiPrediction: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found.');

    if (!complaint.aiPrediction) {
      throw new BadRequestException(
        'No detection has run on this complaint yet.',
      );
    }

    const detections = toDetections(
      complaint.aiPrediction.boundingBoxes,
      complaint.aiPrediction.metadata,
    );

    // severity is 0–5 here; depthForSeverity bands on 0–100.
    const severityPct = ((complaint.severity ?? 0) / 5) * 100;

    // Pass our own operating threshold rather than letting suggestDimensions
    // apply its default of 0.35. That default was calibrated against a
    // different detector; ours scores lower on the same defect, which is why
    // the CV service runs at 0.25. Left alone, a real pothole detected at
    // 0.349 was discarded here by 0.001 and the page reported "no regions
    // confident enough" for a photograph with a visible hole in it.
    //
    // Read from the environment so this tracks CONFIDENCE_THRESHOLD on the CV
    // service instead of drifting from it as a second hardcoded number.
    const minConfidence = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.25);

    const potholes = suggestDimensions(
      detections,
      severityPct,
      ['Pothole'],
      Number.isFinite(minConfidence) ? minConfidence : 0.25,
    );

    if (potholes.length === 0) {
      throw new BadRequestException(
        'No pothole regions confident enough to estimate from.',
      );
    }
    return { potholes, note: ESTIMATE_NOTE };
  }

  // ---------------------------------------------------------------------------
  // Reopening
  // ---------------------------------------------------------------------------

  /**
   * The resident says the work was not actually done.
   *
   * Returns to PENDING rather than IN_PROGRESS: the original engineer has
   * already reported it finished, so it should be triaged again rather than
   * silently handed back to the same person.
   */
  async reopen(ref: string, reason: string, user: any) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { OR: [{ trackingId: ref }, { id: ref }] },
    });

    // 404 rather than 403 for someone else's complaint: a different status code
    // would confirm the reference exists.
    if (!complaint || complaint.reporterId !== user.id) {
      throw new NotFoundException('Complaint not found.');
    }
    if (
      complaint.status !== ComplaintStatus.RESOLVED &&
      complaint.status !== ComplaintStatus.CLOSED
    ) {
      throw new UnprocessableEntityException(
        'Only a completed report can be reopened.',
      );
    }
    const trimmed = String(reason ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Please say what is still wrong.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaint.id },
        data: {
          status: ComplaintStatus.PENDING,
          reopenedAt: new Date(),
          closedAt: null,
        },
      });
      await tx.complaintTimeline.create({
        data: {
          complaintId: complaint.id,
          status: ComplaintStatus.PENDING,
          performedById: user.id,
          notes: `Reopened by the resident — ${trimmed}`,
        },
      });
      // Tell the people who can act on it. Supervisors and admins rather than
      // a department column, which this schema does not carry on the complaint.
      const staff = await tx.user.findMany({
        where: {
          role: { in: [Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN] },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (staff.length) {
        await tx.notification.createMany({
          data: staff.map((s) => ({
            userId: s.id,
            complaintId: complaint.id,
            type: 'REOPENED',
            message: `${complaint.trackingId} was reopened by the resident: ${trimmed}`,
          })),
        });
      }
    });

    return { ok: true, status: 'PENDING' };
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  async listNotifications(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      include: {
        complaint: {
          select: { trackingId: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return {
      // `ref` rather than `trackingId` in the payload: the console was written
      // against the other backend's naming and reads notification.complaint.ref.
      notifications: items.map((n) => ({
        ...n,
        complaint: n.complaint
          ? {
              ref: n.complaint.trackingId,
              title: n.complaint.title,
              status: n.complaint.status,
            }
          : null,
      })),
      unread: items.filter((n) => !n.readAt).length,
    };
  }

  /** Mark one notification read, or all of them when no id is given. */
  async markNotificationsRead(userId: string, id?: string) {
    await this.prisma.notification.updateMany({
      // Scoped by userId as well as id — without it, posting someone else's
      // notification id would mark their unread items as read.
      where: { userId, ...(id ? { id } : { readAt: null }) },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Work orders — clustering
  // ---------------------------------------------------------------------------

  /**
   * Open complaints grouped into single work orders.
   *
   * The clustering itself is lumen-platform's, unmodified. What changes is the
   * shape fed to it: that schema carried `ref`, `civicCategory`, `zone`,
   * `address`, `severityScore` on 0-100 and a stored `priorityScore`, none of
   * which exist here in that form. Severity is rescaled from 0-5, priority is
   * derived from the band, and zone and address are empty strings rather than
   * invented values.
   */
  async clusters() {
    const open = await this.prisma.complaint.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: {
        id: true,
        trackingId: true,
        title: true,
        latitude: true,
        longitude: true,
        category: true,
        status: true,
        severity: true,
        priority: true,
        createdAt: true,
      },
    });

    const items: Clusterable[] = open
      // Clustering is geometric; a complaint with no fix cannot be placed and
      // would otherwise land at (0, 0) and group with everything else there.
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        ref: c.trackingId,
        title: c.title,
        lat: c.latitude!,
        lng: c.longitude!,
        category: c.category,
        civicCategory: 'ROADS',
        status: c.status,
        severityScore: severityPercent(c.severity),
        priorityScore: PRIORITY_SCORE[c.priority] ?? 40,
        slaHours: SLA_HOURS[c.priority] ?? SLA_HOURS.MEDIUM,
        createdAt: c.createdAt,
        zone: '',
        address: '',
      }));

    const clusters = buildClusters(items);
    return {
      radiusM: RADIUS_M,
      clusters,
      summary: {
        openComplaints: open.length,
        clusters: clusters.length,
        complaintsInClusters: clusters.reduce((n, c) => n + c.members.length, 0),
        // The headline: dispatches avoided by sending one crew per cluster
        // rather than one per complaint.
        visitsSaved: clusters.reduce((n, c) => n + c.visitsSaved, 0),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Estimate across the whole measured backlog
  // ---------------------------------------------------------------------------

  async backlogEstimate(wastageRaw: unknown) {
    const w = Number(wastageRaw ?? 5);
    const wastage = Number.isFinite(w) ? Math.min(50, Math.max(0, w)) : 5;

    const measured = await this.prisma.complaint.findMany({
      where: { status: { in: OPEN_STATUSES }, potholes: { some: {} } },
      select: {
        trackingId: true,
        title: true,
        roadType: true,
        priority: true,
        potholes: { select: { volumeM3: true, perimeterM: true, source: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups: Record<RoadType, { refs: typeof measured; volume: number; count: number }> = {
      BITUMINOUS: { refs: [], volume: 0, count: 0 },
      CONCRETE: { refs: [], volume: 0, count: 0 },
    };
    for (const c of measured) {
      // Unset road type falls to bituminous — the commoner surface, and the
      // estimate is flagged provisional either way.
      const key: RoadType = c.roadType === 'CONCRETE' ? 'CONCRETE' : 'BITUMINOUS';
      groups[key].refs.push(c);
      groups[key].volume += c.potholes.reduce((t, p) => t + p.volumeM3, 0);
      groups[key].count += c.potholes.length;
    }

    return {
      wastagePct: wastage,
      complaintsMeasured: measured.length,
      groups: (Object.keys(groups) as RoadType[])
        .filter((k) => groups[k].count > 0)
        .map((k) => ({
          roadType: k,
          complaints: groups[k].refs.map((c) => ({
            ref: c.trackingId,
            title: c.title,
            zone: '',
            priority: c.priority,
            potholeCount: c.potholes.length,
            volumeM3: Number(
              c.potholes.reduce((t, p) => t + p.volumeM3, 0).toFixed(3),
            ),
            estimated: c.potholes.every((p) => p.source === 'ESTIMATED'),
          })),
          estimate: estimateMaterials(groups[k].volume, groups[k].count, k, wastage),
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // Budget planning
  // ---------------------------------------------------------------------------

  /**
   * Which repairs fit the budget, and in what order the crews should drive.
   *
   * Selection is a 0/1 knapsack maximising risk removed, reported against
   * greedy baselines because the point of the feature is that greedy is not
   * optimal. Routing is Clarke-Wright savings then 2-opt, per crew.
   *
   * Cost comes from the measured bill of quantities where one exists and falls
   * back to the rate card elsewhere. Mixing the two is deliberate: a plan that
   * ignored real measurements because some complaints lack them would be
   * worse, not purer.
   */
  async budgetPlan(budgetRaw: unknown, crewsRaw: unknown, horizonRaw: unknown) {
    const budget = Math.max(0, Number(budgetRaw ?? 500_000));
    const crews = Math.min(10, Math.max(1, Number(crewsRaw ?? 3)));
    const horizonDays = Math.min(30, Math.max(1, Number(horizonRaw ?? 7)));

    const complaints = await this.prisma.complaint.findMany({
      where: { status: { in: OPEN_STATUSES }, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        trackingId: true,
        title: true,
        category: true,
        latitude: true,
        longitude: true,
        severity: true,
        priority: true,
        roadType: true,
        potholes: { select: { volumeM3: true, source: true } },
      },
    });

    const shaped = complaints.map((c) => ({
      id: c.id,
      ref: c.trackingId,
      title: c.title,
      category: c.category,
      civicCategory: 'ROADS',
      lat: c.latitude!,
      lng: c.longitude!,
      severityScore: severityPercent(c.severity),
      priorityScore: PRIORITY_SCORE[c.priority] ?? 40,
      priority: c.priority,
      slaHours: SLA_HOURS[c.priority] ?? SLA_HOURS.MEDIUM,
      roadType: c.roadType,
      potholes: c.potholes,
    }));

    const items = buildItems(shaped as any);

    // Replace the assumed cost with the real one wherever the site has been
    // measured. Same order as `shaped`, so index alignment holds.
    for (const [i, c] of shaped.entries()) {
      if (c.potholes.length === 0) continue;
      const volume = c.potholes.reduce((t, p) => t + p.volumeM3, 0);
      const rt: RoadType = c.roadType === 'CONCRETE' ? 'CONCRETE' : 'BITUMINOUS';
      items[i].cost = Math.round(
        estimateMaterials(volume, c.potholes.length, rt, 5).cost.totalInr,
      );
      // A cost derived from photo-estimated geometry is still an estimate, so
      // only geometry someone actually measured earns the "measured" label.
      items[i].costMeasured = c.potholes.some((p) => p.source === 'MEASURED');
    }

    // Stands in for the works depot the crews start from.
    const depot = { lat: 12.9716, lng: 77.5946 };
    const result = plan(items, { budget, crews, horizonDays, depot });

    return { ...result, measuredCount: items.filter((i) => i.costMeasured).length };
  }
}
