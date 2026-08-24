import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Priority } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalComplaints,
      totalUsers,
      complaintsByStatus,
      complaintsByPriority,
      complaintsByCategory,
      resolvedComplaints,
      avgResolutionMs,
    ] = await Promise.all([
      this.prisma.complaint.count(),
      this.prisma.user.count({ where: { isDeleted: false, isActive: true } }),
      this.prisma.complaint.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
        take: 8,
      }),
      this.prisma.complaint.count({ where: { status: 'RESOLVED' } }),
      this.prisma.$queryRaw<{ avg_ms: bigint }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (ct_resolved."createdAt" - c."createdAt")) * 1000)::bigint AS avg_ms
        FROM complaints c
        JOIN complaint_timelines ct_resolved
          ON ct_resolved."complaintId" = c.id
          AND ct_resolved.status = 'RESOLVED'
        WHERE c.status IN ('RESOLVED', 'CLOSED')
      `,
    ]);

    const activeEngineers = await this.prisma.user.count({
      where: { role: 'ENGINEER', isActive: true, isDeleted: false },
    });

    const pendingCount =
      complaintsByStatus.find((s) => s.status === 'PENDING')?._count._all ?? 0;
    const avgResolutionHours = avgResolutionMs?.[0]?.avg_ms
      ? Number(avgResolutionMs[0].avg_ms) / 3600000
      : null;

    return {
      totalComplaints,
      totalUsers,
      activeEngineers,
      resolvedComplaints,
      pendingComplaints: pendingCount,
      avgResolutionHours: avgResolutionHours
        ? Math.round(avgResolutionHours * 10) / 10
        : null,
      complaintsByStatus: complaintsByStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      complaintsByPriority: complaintsByPriority.map((p) => ({
        priority: p.priority,
        count: p._count._all,
      })),
      complaintsByCategory: complaintsByCategory.map((c) => ({
        category: c.category,
        count: c._count._all,
      })),
    };
  }

  async getComplaintTrend(days = 7) {
    // Returns daily complaint counts for the last N days
    const results = await this.prisma.$queryRaw<
      { day: Date; count: bigint }[]
    >`
      SELECT
        date_trunc('day', "createdAt") AS day,
        COUNT(*)::bigint AS count
      FROM complaints
      WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;

    return results.map((r) => ({
      day: r.day,
      count: Number(r.count),
    }));
  }

  async getDepartmentPerformance() {
    // Aggregate dispatch records to compute per-department resolution stats
    const departments = ['WATER', 'ROADS', 'ELECTRICITY', 'SANITATION', 'PARKS', 'POLICE', 'FIRE'];

    const results = await Promise.all(
      departments.map(async (dept) => {
        const [total, resolved, inProgress] = await Promise.all([
          this.prisma.dispatchRecord.count({ where: { department: dept as any } }),
          this.prisma.dispatchRecord.count({
            where: {
              department: dept as any,
              complaint: { status: { in: ['RESOLVED', 'CLOSED'] } },
            },
          }),
          this.prisma.dispatchRecord.count({
            where: {
              department: dept as any,
              complaint: { status: 'IN_PROGRESS' },
            },
          }),
        ]);

        const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return {
          department: dept,
          total,
          resolved,
          inProgress,
          pending: total - resolved - inProgress,
          completionRate,
        };
      }),
    );

    return results.filter((r) => r.total > 0);
  }

  async getRecentActivity(limit = 20) {
    const [auditLogs, timelineEvents] = await Promise.all([
      this.prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, role: true } },
        },
      }),
      this.prisma.complaintTimeline.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { fullName: true, role: true } },
          complaint: { select: { trackingId: true, title: true } },
        },
      }),
    ]);

    const auditEntries = auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      type: 'AUDIT',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      actor: log.user?.fullName || 'System',
      actorRole: log.user?.role || 'SYSTEM',
      status: log.status,
      createdAt: log.createdAt,
    }));

    const timelineEntries = timelineEvents.map((tl) => ({
      id: `timeline-${tl.id}`,
      type: 'COMPLAINT_UPDATE',
      action: `Status changed to ${tl.status}`,
      entity: 'COMPLAINT',
      entityId: tl.complaintId,
      complaintRef: tl.complaint?.trackingId,
      complaintTitle: tl.complaint?.title,
      actor: tl.performedBy?.fullName || 'System',
      actorRole: tl.performedBy?.role || 'SYSTEM',
      notes: tl.notes,
      status: tl.status,
      createdAt: tl.createdAt,
    }));

    // Merge and sort by createdAt desc
    const merged = [...auditEntries, ...timelineEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return merged.slice(0, limit);
  }

  async getSlaMetrics() {
    // Complaints breaching 48h SLA (still PENDING/ASSIGNED after 48hrs)
    const slaBreached = await this.prisma.complaint.count({
      where: {
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: {
          lt: new Date(Date.now() - 48 * 3600 * 1000),
        },
      },
    });

    const criticalPending = await this.prisma.complaint.count({
      where: {
        status: { in: ['PENDING', 'ASSIGNED'] },
        priority: Priority.CRITICAL,
      },
    });

    return { slaBreached, criticalPending };
  }
}
