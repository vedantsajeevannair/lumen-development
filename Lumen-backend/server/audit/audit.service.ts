import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    action: string,
    entity: string,
    entityId?: string,
    userId?: string,
    details?: any,
    req?: any,
    status: string = 'SUCCESS',
  ) {
    let ipAddress = null;
    let device = 'Unknown';
    let os = 'Unknown';
    let appVersion = 'Unknown';
    let gpsLocation: any = undefined;

    if (req) {
      ipAddress = req.ip || req.connection?.remoteAddress;
      device = (req.headers['x-device'] as string) || 'Unknown';
      os = (req.headers['x-os'] as string) || 'Unknown';
      appVersion = (req.headers['x-app-version'] as string) || 'Unknown';
      if (req.headers['x-gps-location']) {
        try {
          gpsLocation = JSON.parse(req.headers['x-gps-location'] as string);
        } catch (e) {
          gpsLocation = undefined;
        }
      }
    }

    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        details: details || {},
        ipAddress,
        device,
        os,
        appVersion,
        gpsLocation,
        status,
      },
    });
  }

  async getAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, role: true } },
      },
    });
  }
}
