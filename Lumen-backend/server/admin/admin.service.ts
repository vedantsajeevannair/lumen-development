import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly gamificationService: GamificationService,
  ) {}

  async getDashboard() {
    const totalUsers = await this.prisma.user.count({
      where: { isDeleted: false },
    });
    const totalComplaints = await this.prisma.complaint.count();

    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      where: { isDeleted: false },
      _count: { _all: true },
    });

    const complaintsByStatus = await this.prisma.complaint.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const recentAuditLogs = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } } },
    });

    return {
      totalUsers,
      totalComplaints,
      usersByRole,
      complaintsByStatus,
      recentAuditLogs,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { isDeleted: false } }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(adminId: string, createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: createUserDto.password, // In real app, hash this!
        fullName: createUserDto.fullName,
        role: createUserDto.role,
      },
    });

    await this.logAudit(adminId, 'CREATE_USER', 'User', user.id);
    return user;
  }

  async updateUser(adminId: string, id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.fullName && { fullName: updateUserDto.fullName }),
        ...(updateUserDto.role && { role: updateUserDto.role }),
        ...(updateUserDto.isActive !== undefined && {
          isActive: updateUserDto.isActive,
        }),
      },
    });

    await this.logAudit(adminId, 'UPDATE_USER', 'User', id, updateUserDto);
    return updated;
  }

  async softDeleteUser(adminId: string, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });

    await this.logAudit(adminId, 'DELETE_USER', 'User', id);
    return { success: true };
  }

  async getAllComplaints(department?: string) {
    return this.prisma.complaint.findMany({
      where: {
        ...(department && {
          dispatchRecords: { some: { department: department as any } },
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { fullName: true, email: true } },
        dispatchRecords: true,
      },
    });
  }

  async updateComplaintStatus(
    adminId: string,
    complaintId: string,
    status: string,
    notes?: string,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { status: status as any },
    });

    const timelineEvent = await this.prisma.complaintTimeline.create({
      data: {
        complaintId,
        status: status as any,
        notes: notes || `Status updated to ${status} by admin`,
        performedById: adminId,
      },
    });

    await this.logAudit(
      adminId,
      'UPDATE_COMPLAINT_STATUS',
      'Complaint',
      complaint.id,
      {
        oldStatus: complaint.status,
        newStatus: status,
      },
    );

    // Broadcast WebSocket updates
    this.notificationsGateway.emitComplaintUpdate(complaintId, updated);

    // Phase 22: Trigger Push Notification for status updates
    // @ts-ignore
    const userWithToken = complaint.reporterId
      ? await this.prisma.user.findUnique({
          where: { id: complaint.reporterId },
          select: { fcmToken: true },
        })
      : null;

    // @ts-ignore
    if (userWithToken?.fcmToken) {
      await this.notificationsService.sendPushNotification({
        // @ts-ignore
        token: userWithToken.fcmToken,
        title: 'Complaint Status Updated',
        body: `Your complaint "${complaint.title}" is now ${status}.`,
        data: { complaintId },
      });
    }

    this.notificationsGateway.emitTimelineAdded(complaintId, timelineEvent);

    // Gamification: Award points if status changed to RESOLVED
    if (
      complaint.status !== 'RESOLVED' &&
      status === 'RESOLVED' &&
      complaint.reporterId
    ) {
      await this.gamificationService.awardPoints(
        complaint.reporterId,
        50,
        `Complaint ${complaintId} resolved`,
      );

      // @ts-ignore
      if (userWithToken?.fcmToken) {
        await this.notificationsService.sendPushNotification({
          // @ts-ignore
          token: userWithToken.fcmToken,
          title: 'Civic Points Earned!',
          body: `You've earned 50 points for your resolved complaint: ${complaint.title}.`,
          data: { complaintId },
        });
      }
    }

    return updated;
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, role: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  private async logAudit(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    details?: any,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details || {},
      },
    });
  }
}
