import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { AI_PREDICTION_STATUS } from './ai.constants';

@Injectable()
export class AiRepository {
  private readonly logger = new Logger(AiRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdatePrediction(dto: CreatePredictionDto) {
    this.logger.log(
      `Upserting AI prediction for complaint: ${dto.complaintId}`,
    );

    return this.prisma.aiPrediction.upsert({
      where: { complaintId: dto.complaintId },
      update: {
        damageClass: dto.damageClass,
        confidenceScore: dto.confidenceScore,
        boundingBoxes: dto.boundingBoxes as any,
        metadata: dto.metadata as any,
        status: dto.status,
      },
      create: {
        complaintId: dto.complaintId,
        damageClass: dto.damageClass,
        confidenceScore: dto.confidenceScore,
        boundingBoxes: dto.boundingBoxes as any,
        metadata: dto.metadata as any,
        status: dto.status,
      },
    });
  }

  async getPredictionByComplaintId(complaintId: string) {
    return this.prisma.aiPrediction.findUnique({
      where: { complaintId },
    });
  }

  async markPredictionAsFailed(complaintId: string, reason: string) {
    return this.prisma.aiPrediction.upsert({
      where: { complaintId },
      update: {
        status: AI_PREDICTION_STATUS.FAILED,
        metadata: { error: reason },
      },
      create: {
        complaintId,
        damageClass: 'UNKNOWN',
        confidenceScore: 0,
        boundingBoxes: [],
        metadata: { error: reason },
        status: AI_PREDICTION_STATUS.FAILED,
      },
    });
  }

  async updateComplaintWithAiResult(complaintId: string, result: any) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) return;

    let priority = complaint.priority;

    if (complaint.latitude && complaint.longitude) {
      const radiusMeters = 30;
      const duplicates = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM complaints
        WHERE id != ${complaint.id}
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND (6371000 * acos(cos(radians(${complaint.latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${complaint.longitude})) + sin(radians(${complaint.latitude})) * sin(radians(latitude)))) <= ${radiusMeters}
        AND category = ${result.damageClass}
      `;

      if (duplicates.length > 2) priority = 'CRITICAL';
      else if (duplicates.length > 0) priority = 'HIGH';
    } else {
      if (result.severity > 4) priority = 'CRITICAL';
      else if (result.severity > 3) priority = 'HIGH';
    }

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        category: result.damageClass,
        confidence: result.confidenceScore,
        severity: result.severity,
        priority,
      },
    });

    this.logger.log('Database updated');
  }
}
