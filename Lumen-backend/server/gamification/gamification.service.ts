import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {
    this.seedBadges();
  }

  private async seedBadges() {
    const badgesToSeed = [
      {
        name: 'FIRST_REPORT',
        description: 'Awarded for filing the first complaint',
        iconUrl: 'star',
      },
      {
        name: 'CIVIC_HERO',
        description: 'Awarded for reaching 500 Civic Points',
        iconUrl: 'shield',
      },
      {
        name: 'SHARPSHOOTER',
        description: 'Awarded for taking 10 successful photos for reports',
        iconUrl: 'camera',
      },
    ];

    for (const badge of badgesToSeed) {
      await this.prisma.badge.upsert({
        where: { name: badge.name },
        update: {},
        create: badge,
      });
    }
  }

  async getLeaderboard(limit = 10) {
    return this.prisma.user.findMany({
      where: { role: 'CITIZEN' },
      select: { id: true, fullName: true, civicScore: true },
      orderBy: { civicScore: 'desc' },
      take: limit,
    });
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { civicScore: true, badges: { include: { badge: true } } },
    });

    if (!user) return null;

    return {
      civicScore: user.civicScore,
      level: this.calculateLevel(user.civicScore),
      badges: user.badges.map((b) => b.badge),
    };
  }

  private calculateLevel(score: number): number {
    return Math.floor(score / 100) + 1;
  }

  async awardPoints(userId: string, points: number, reason: string) {
    this.logger.log(
      `Awarding ${points} points to user ${userId} for ${reason}`,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { civicScore: { increment: points } },
    });

    await this.checkAndAwardBadges(userId, user.civicScore);
    return user;
  }

  private async checkAndAwardBadges(userId: string, currentScore: number) {
    if (currentScore >= 500) {
      const heroBadge = await this.prisma.badge.findUnique({
        where: { name: 'CIVIC_HERO' },
      });
      if (heroBadge) {
        await this.prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: heroBadge.id } },
          update: {},
          create: { userId, badgeId: heroBadge.id },
        });
      }
    }
    // More complex badge checks can be added here
  }
}
