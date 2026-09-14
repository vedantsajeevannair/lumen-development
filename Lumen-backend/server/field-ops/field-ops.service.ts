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
    const potholes = suggestDimensions(detections, severityPct);

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
}
