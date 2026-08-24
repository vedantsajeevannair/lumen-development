import { Injectable, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import { Complaint, User } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private db: Database.Database;

  constructor() {
    try {
      const dbPath = 'D:/Lumen-Web/LUMEN-website/backend/database/lumen.db';
       this.db = new Database(dbPath, { fileMustExist: false });
      this.logger.log(`Connected to Web Dashboard SQLite database at ${dbPath}`);
    } catch (error) {
      this.logger.error('Failed to connect to Web Dashboard SQLite database', error);
    }
  }

  syncComplaintToWebDashboard(complaint: Complaint) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO Complaint (
          id, trackingId, title, description, category, severity, confidence, priority, status,
          latitude, longitude, imageUrl, videoUrl, reporterId, createdAt, updatedAt
        ) VALUES (
          @id, @trackingId, @title, @description, @category, @severity, @confidence, @priority, @status,
          @latitude, @longitude, @imageUrl, @videoUrl, @reporterId, @createdAt, @updatedAt
        ) ON CONFLICT(id) DO UPDATE SET
          category = excluded.category,
          severity = excluded.severity,
          confidence = excluded.confidence,
          priority = excluded.priority,
          status = excluded.status,
          updatedAt = excluded.updatedAt
      `);

      stmt.run({
        id: complaint.id,
        trackingId: complaint.trackingId,
        title: complaint.title,
        description: complaint.description || null,
        category: complaint.category,
        severity: complaint.severity != null ? Math.round(complaint.severity * 20) : null,
        confidence: complaint.confidence != null ? complaint.confidence : null,
        priority: complaint.priority.toString(),
        status: complaint.status.toString(),
        latitude: complaint.latitude || null,
        longitude: complaint.longitude || null,
        imageUrl: complaint.imageUrl || null,
        videoUrl: complaint.videoUrl || null,
        reporterId: null, // Avoid foreign key constraint failure (Dashboard users are admins/employees)
        createdAt: complaint.createdAt.toISOString(),
        updatedAt: complaint.updatedAt.toISOString(),
      });
      // Also sync AI Prediction if it exists
      if (complaint['aiPrediction']) {
        const aiStmt = this.db.prepare(`
          INSERT INTO AiPrediction (
            id, complaintId, damageClass, confidenceScore, boundingBoxes, metadata, createdAt
          ) VALUES (
            @id, @complaintId, @damageClass, @confidenceScore, @boundingBoxes, @metadata, @createdAt
          ) ON CONFLICT(id) DO UPDATE SET
            damageClass = excluded.damageClass,
            confidenceScore = excluded.confidenceScore,
            boundingBoxes = excluded.boundingBoxes,
            metadata = excluded.metadata
        `);
        aiStmt.run({
          id: complaint['aiPrediction'].id,
          complaintId: complaint.id,
          damageClass: complaint['aiPrediction'].damageClass,
          confidenceScore: complaint['aiPrediction'].confidenceScore,
          boundingBoxes: typeof complaint['aiPrediction'].boundingBoxes === 'string' 
            ? complaint['aiPrediction'].boundingBoxes 
            : JSON.stringify(complaint['aiPrediction'].boundingBoxes),
          metadata: complaint['aiPrediction'].metadata ? JSON.stringify(complaint['aiPrediction'].metadata) : null,
          createdAt: new Date().toISOString()
        });
      }

      this.logger.log(`Successfully synced complaint ${complaint.trackingId} to Web Dashboard database`);
    } catch (error) {
      this.logger.error(`Failed to sync complaint ${complaint.trackingId} to Web Dashboard`, error);
    }
  }
}
