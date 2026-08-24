import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import type { User } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async assign(dto: AssignDispatchDto, user: User) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: dto.complaintId },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    // SLA hours based on complaint priority
    const slaHoursMap: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 12,
      MEDIUM: 48,
      LOW: 72,
    };
    const slaHours = slaHoursMap[complaint.priority] ?? 48;
    const estimatedResolutionAt = new Date();
    estimatedResolutionAt.setHours(estimatedResolutionAt.getHours() + slaHours);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create dispatch record
      const dispatchRecord = await tx.dispatchRecord.create({
        data: {
          complaintId: dto.complaintId,
          department: dto.department,
          estimatedResolutionAt,
        },
      });

      // Update complaint status
      if (complaint.status === 'PENDING') {
        await tx.complaint.update({
          where: { id: dto.complaintId },
          data: { status: 'ASSIGNED' },
        });
      }

      // Add timeline event
      await tx.complaintTimeline.create({
        data: {
          complaintId: dto.complaintId,
          status: 'ASSIGNED',
          notes: `Assigned to ${dto.department} department. SLA: ${slaHours}h.`,
          performedById: user.id,
        },
      });

      return dispatchRecord;
    });

    // Phase 22: Send push notification to the reporter
    if (complaint.reporterId) {
      // @ts-ignore
      const reporter = await this.prisma.user.findUnique({
        where: { id: complaint.reporterId },
        select: { fcmToken: true },
      });
      // @ts-ignore
      if (reporter?.fcmToken) {
        await this.notificationsService.sendPushNotification({
          // @ts-ignore
          token: reporter.fcmToken,
          title: 'Complaint Assigned',
          body: `Your complaint "${complaint.title}" has been assigned to the ${dto.department} department.`,
          data: { complaintId: dto.complaintId },
        });
      }
    }

    return result;
  }

  async getDispatchDetails(complaintId: string) {
    return this.prisma.dispatchRecord.findMany({
      where: { complaintId },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
