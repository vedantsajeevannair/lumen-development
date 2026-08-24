import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MapsService {
  constructor(private prisma: PrismaService) {}

  async getComplaintsGeoJSON(status?: string) {
    const whereClause = status ? { status: status as any } : {};

    const complaints = await this.prisma.complaint.findMany({
      where: {
        ...whereClause,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        trackingId: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        latitude: true,
        longitude: true,
      },
    });

    return {
      type: 'FeatureCollection',
      features: complaints.map((complaint: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [complaint.longitude, complaint.latitude],
        },
        properties: {
          id: complaint.id,
          trackingId: complaint.trackingId,
          title: complaint.title,
          category: complaint.category,
          priority: complaint.priority,
          status: complaint.status,
        },
      })),
    };
  }
}
