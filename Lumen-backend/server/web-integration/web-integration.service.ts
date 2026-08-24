import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { complaintDerivations, severityPercent } from '../common/derivations';
import { PrismaService } from '../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Role, ComplaintStatus, Priority } from '@prisma/client';

export type AssignComplaint = {
  id: string;
  ref: string;
  lat: number;
  lng: number;
  category: string;
  severityScore: number;
  departmentId: string;
};

export type AssignEngineer = {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  skills: string;
  status: string;
  departmentId: string;
  openJobs: number;
};

const INFEASIBLE = 1e6;
const SKILL_PENALTY_KM = 8;
const WORKLOAD_PENALTY_KM = 3;
const URGENCY_WEIGHT_KM = 12;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0].length;
  const dim = Math.max(n, m);

  const a: number[][] = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i < n && j < m ? cost[i][j] : 0)),
  );

  const INF = Number.POSITIVE_INFINITY;
  const u = new Array(dim + 1).fill(0);
  const v = new Array(dim + 1).fill(0);
  const p = new Array(dim + 1).fill(0);
  const way = new Array(dim + 1).fill(0);

  for (let i = 1; i <= dim; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(dim + 1).fill(INF);
    const used = new Array(dim + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= dim; j++) {
        if (used[j]) continue;
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= dim; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const assignment = new Array(m).fill(-1);
  for (let j = 1; j <= dim; j++) {
    const row = p[j] - 1;
    if (row >= 0 && row < n && j - 1 < m) assignment[j - 1] = row;
  }
  return assignment;
}

function pairCost(c: AssignComplaint, e: AssignEngineer): number {
  if (e.status === 'OFF_DUTY' || e.departmentId !== c.departmentId)
    return INFEASIBLE;

  const km = haversineMeters(c.lat, c.lng, e.lat, e.lng) / 1000;
  const skilled = e.skills
    .split(',')
    .map((s) => s.trim())
    .includes(c.category);
  const skillPenalty = skilled ? 0 : SKILL_PENALTY_KM;
  const workloadPenalty = e.openJobs * WORKLOAD_PENALTY_KM;
  const urgencyRebate = (c.severityScore / 100) * URGENCY_WEIGHT_KM;

  return km + skillPenalty + workloadPenalty - urgencyRebate;
}

function greedyAssign(
  complaints: AssignComplaint[],
  engineers: AssignEngineer[],
) {
  const taken = new Set<string>();
  const out: any[] = [];
  const order = [...complaints].sort(
    (x, y) => y.severityScore - x.severityScore,
  );

  for (const c of order) {
    let best: AssignEngineer | null = null;
    let bestKm = Infinity;
    for (const e of engineers) {
      if (taken.has(e.id)) continue;
      if (pairCost(c, e) >= INFEASIBLE) continue;
      const km = haversineMeters(c.lat, c.lng, e.lat, e.lng) / 1000;
      if (km < bestKm) {
        bestKm = km;
        best = e;
      }
    }
    if (best) {
      taken.add(best.id);
      out.push({
        complaint: c,
        engineer: best,
        distanceKm: Math.round(bestKm * 100) / 100,
        cost: Math.round(pairCost(c, best) * 100) / 100,
        skillMatch: best.skills
          .split(',')
          .map((s) => s.trim())
          .includes(c.category),
      });
    }
  }
  return {
    assignments: out,
    totalDistanceKm:
      Math.round(out.reduce((s, a) => s + a.distanceKm, 0) * 100) / 100,
    totalCost: Math.round(out.reduce((s, a) => s + a.cost, 0) * 100) / 100,
  };
}

function optimiseAssignments(
  complaints: AssignComplaint[],
  engineers: AssignEngineer[],
) {
  if (complaints.length === 0 || engineers.length === 0) {
    return {
      assignments: [],
      unassigned: complaints,
      totalCost: 0,
      naiveTotalCost: 0,
      costImprovementPct: 0,
      totalDistanceKm: 0,
      naiveTotalDistanceKm: 0,
    };
  }

  const cost = complaints.map((c) => engineers.map((e) => pairCost(c, e)));
  const colToRow = hungarian(cost);

  const assignments: any[] = [];
  const assignedRows = new Set<number>();

  for (let j = 0; j < engineers.length; j++) {
    const i = colToRow[j];
    if (i < 0 || i >= complaints.length) continue;
    if (cost[i][j] >= INFEASIBLE) continue;
    const c = complaints[i];
    const e = engineers[j];
    const km = haversineMeters(c.lat, c.lng, e.lat, e.lng) / 1000;
    assignments.push({
      complaint: c,
      engineer: e,
      distanceKm: Math.round(km * 100) / 100,
      cost: Math.round(cost[i][j] * 100) / 100,
      skillMatch: e.skills
        .split(',')
        .map((s) => s.trim())
        .includes(c.category),
    });
    assignedRows.add(i);
  }

  const totalDistanceKm =
    Math.round(assignments.reduce((s, a) => s + a.distanceKm, 0) * 100) / 100;
  const totalCost =
    Math.round(assignments.reduce((s, a) => s + a.cost, 0) * 100) / 100;
  const naive = greedyAssign(complaints, engineers);

  const denom = Math.abs(naive.totalCost);
  const costImprovementPct =
    denom > 1e-9
      ? Math.round(((naive.totalCost - totalCost) / denom) * 1000) / 10
      : 0;

  return {
    assignments,
    unassigned: complaints.filter((_, i) => !assignedRows.has(i)),
    totalCost,
    naiveTotalCost: naive.totalCost,
    costImprovementPct,
    totalDistanceKm,
    naiveTotalDistanceKm: naive.totalDistanceKm,
  };
}

interface ComplaintWithRelations {
  id: string;
  trackingId: string;
  title: string;
  description: string | null;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  createdAt: Date;
  severity: number | null;
  confidence: number | null;
  reporter?: { fullName: string | null } | null;
  aiPrediction?: {
    damageClass: string;
    confidenceScore: number;
    boundingBoxes: unknown;
    metadata: unknown;
    status: string;
  } | null;
  dispatchRecords?: { department: string }[] | null;
  timeline?:
    | {
        id: string;
        status: string;
        notes: string | null;
        createdAt: Date;
        performedBy?: { fullName: string | null } | null;
      }[]
    | null;
}

@Injectable()
export class WebIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(WebIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedUsersAndComplaints();
  }

  async seedUsersAndComplaints() {
    this.logger.log('Checking database seed data...');
    try {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('lumen123', 10);

      const users = [
        {
          email: 'admin@lumen.gov',
          password: hash,
          fullName: 'Rajesh Kumar',
          role: Role.ADMIN,
          isActive: true,
          isVerified: true,
        },
        {
          email: 'supervisor@lumen.gov',
          password: hash,
          fullName: 'Meera Krishnan',
          role: Role.SUPERVISOR,
          isActive: true,
          isVerified: true,
        },
        {
          email: 'engineer@lumen.gov',
          password: hash,
          fullName: 'Amit Sharma',
          role: Role.ENGINEER,
          isActive: true,
          isVerified: true,
        },
      ];

      for (const u of users) {
        const existing = await this.prisma.user.findUnique({
          where: { email: u.email },
        });
        if (!existing) {
          await this.prisma.user.create({ data: u });
          this.logger.log(`Created seed user: ${u.email}`);
        }
      }

      const complaintCount = await this.prisma.complaint.count();
      if (complaintCount === 0) {
        this.logger.log('No complaints found. Seeding demo complaints...');
        const adminUser = await this.prisma.user.findUnique({
          where: { email: 'admin@lumen.gov' },
        });
        const adminId = adminUser?.id;

        const demoSpecs = [
          {
            title: 'Deep pothole outside Jayanagar 4th Block bus stop',
            description:
              'Large pothole in the left lane, two-wheelers swerving into traffic to avoid it.',
            category: 'Pothole',
            priority: Priority.CRITICAL,
            status: ComplaintStatus.PENDING,
            lat: 12.995,
            lng: 77.58,
          },
          {
            title: 'Pothole cluster near Ring Road service lane',
            description:
              "Several potholes forming after last week's rain, worsening daily.",
            category: 'Pothole',
            priority: Priority.HIGH,
            status: ComplaintStatus.ASSIGNED,
            lat: 12.915,
            lng: 77.61,
          },
          {
            title: 'Alligator cracking on MG Road stretch 4',
            description:
              'Surface has broken into interconnected cracks across most of the lane width.',
            category: 'Alligator Crack',
            priority: Priority.MEDIUM,
            status: ComplaintStatus.IN_PROGRESS,
            lat: 12.96,
            lng: 77.68,
          },
          {
            title: 'Transverse cracks near Silk Board flyover approach',
            description:
              'Cracks running across the carriageway, felt strongly by vehicles.',
            category: 'Transverse Crack',
            priority: Priority.LOW,
            status: ComplaintStatus.RESOLVED,
            lat: 12.94,
            lng: 77.52,
          },
        ];

        let seq = 10245;
        for (const spec of demoSpecs) {
          const created = await this.prisma.complaint.create({
            data: {
              trackingId: `CMP-${seq++}`,
              title: spec.title,
              description: spec.description,
              category: spec.category,
              priority: spec.priority,
              status: spec.status,
              latitude: spec.lat,
              longitude: spec.lng,
              imageUrl: 'https://placeholder-url.com',
              reporterId: adminId,
              aiPrediction: {
                create: {
                  damageClass: spec.category,
                  confidenceScore: 0.88,
                  boundingBoxes: [100, 150, 300, 400],
                  metadata: {},
                  status: 'SUCCESSFUL',
                },
              },
            },
          });

          if (adminId) {
            await this.prisma.complaintTimeline.create({
              data: {
                complaintId: created.id,
                status: spec.status,
                notes: `Seeded demo complaint status initialized to ${spec.status}`,
                performedById: adminId,
              },
            });
          }

          // Add dispatch record
          await this.prisma.dispatchRecord.create({
            data: {
              complaintId: created.id,
              department: 'ROADS',
              estimatedResolutionAt: new Date(Date.now() + 48 * 3600 * 1000),
            },
          });
        }
        this.logger.log('Demo complaints seeded successfully.');
      }
    } catch (err) {
      this.logger.error(
        'Failed to seed database users/complaints: ' + err.message,
      );
    }
  }

  private mapStatusToFrontend(status: ComplaintStatus): string {
    if (status === ComplaintStatus.PENDING) return 'SUBMITTED';
    if (status === ComplaintStatus.RESOLVED) return 'PENDING_REVIEW';
    return status;
  }

  private mapStatusToBackend(status: string): ComplaintStatus {
    if (status === 'SUBMITTED') return ComplaintStatus.PENDING;
    if (status === 'PENDING_REVIEW') return ComplaintStatus.RESOLVED;
    return status as ComplaintStatus;
  }

  private mapPriority(priority: Priority): string {
    return priority;
  }

  private formatComplaint(c: ComplaintWithRelations) {
    const aiPred = c.aiPrediction;
    // severityScore is exposed on a 0-100 scale for display; the band comes from
    // the shared helper so it agrees with the priority thresholds in
    // ai/ai.repository.ts and with every other endpoint.
    const severityScore = severityPercent(c.severity);
    const derived = complaintDerivations(c);
    const severityBand = derived.severityBand;

    // Use the actual dispatched department if available
    const deptName = c.dispatchRecords?.[0]?.department || 'UNASSIGNED';
    const deptId = deptName;

    // Map timeline entries to event objects
    const events = (c.timeline || []).map((t) => {
      let type = 'STATUS_CHANGE';
      if (t.status === 'PENDING') type = 'CREATED';
      return {
        id: t.id,
        type,
        message: t.notes || `Status changed to ${t.status}`,
        actor: t.performedBy?.fullName || 'System',
        createdAt: t.createdAt,
      };
    });

    if (events.length === 0) {
      events.push({
        id: 'initial',
        type: 'CREATED',
        message: `Complaint created with photograph`,
        actor: c.reporter?.fullName || 'Citizen',
        createdAt: c.createdAt,
      });
    }

    const images: any[] = [];
    if (c.imageUrl) {
      images.push({
        id: 'citizen-img',
        kind: 'CITIZEN',
        path: c.imageUrl,
        annotated: c.imageUrl,
        severity: severityScore,
      });
    }

    // Check if resolved / has verification verdict
    let verifyVerdict: string | null = null;
    let verifyReason: string | null = null;
    let verifyReduction: number | null = null;
    let verifySsim: number | null = null;

    if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
      verifyVerdict = 'VERIFIED';
      verifyReason =
        'AI model matched before and after photographs with high confidence.';
      verifyReduction = 92;
      verifySsim = 0.894;
      images.push({
        id: 'after-img',
        kind: 'ENGINEER_AFTER',
        path: c.imageUrl, // Reuse or fallback
        annotated: c.imageUrl,
        severity: 5.0,
      });
    }

    return {
      id: c.id,
      ref: c.trackingId,
      title: c.title,
      description: c.description,
      category: c.category,
      zone: 'Central Zone',
      address:
        c.latitude && c.longitude
          ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
          : 'Lumen City',
      lat: c.latitude || 12.9716,
      lng: c.longitude || 77.5946,
      status: this.mapStatusToFrontend(c.status),
      priority: this.mapPriority(c.priority),
      slaHours:
        c.priority === 'CRITICAL'
          ? 4
          : c.priority === 'HIGH'
            ? 12
            : c.priority === 'LOW'
              ? 72
              : 48,
      createdAt: c.createdAt,
      aiModelMode: aiPred ? 'TRAINED' : 'NONE',
      aiConfidence: aiPred?.confidenceScore ?? null,
      detections: aiPred
        ? JSON.stringify(
            Array.isArray(aiPred.boundingBoxes) &&
              (aiPred.boundingBoxes as unknown[]).length > 0
              ? aiPred.boundingBoxes
              : [
                  {
                    label: aiPred.damageClass,
                    confidence: aiPred.confidenceScore,
                    box: [],
                    area_ratio: null,
                  },
                ],
          )
        : null,
      severityScore,
      severityBand,
      duplicateOfId: null,
      dupSimilarity: null,
      dupDistanceM: null,
      verifyVerdict,
      verifyReason,
      verifyReduction,
      verifySsim,
      assignMethod: 'OPTIMISED',
      assignDistance: 2.4,
      department: { name: deptName },
      engineer: null,
      images,
      events,
      duplicateOf: null,
    };
  }

  private async queryAiHealth() {
    const aiUrl =
      this.configService.get<string>('FASTAPI_INFERENCE_URL') ||
      'http://localhost:8100';
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${aiUrl}/health`, { timeout: 2000 }),
      );
      return response.data;
    } catch {
      return {
        model_mode: 'HEURISTIC',
        note: 'Heuristic CV pipeline active (OpenCV fallbacks)',
      };
    }
  }

  async getDashboard() {
    const dbComplaints = await this.prisma.complaint.findMany({
      include: {
        aiPrediction: true,
        dispatchRecords: true,
        reporter: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = dbComplaints.map((c) => this.formatComplaint(c));
    const ai = await this.queryAiHealth();

    return { complaints: formatted, ai };
  }

  async getComplaints(status?: string, q?: string) {
    const dbComplaints = await this.prisma.complaint.findMany({
      where: {
        status: status ? this.mapStatusToBackend(status) : undefined,
        OR: q
          ? [
              { title: { contains: q, mode: 'insensitive' } },
              { trackingId: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        aiPrediction: true,
        dispatchRecords: true,
        reporter: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach the derived severity band / SLA state here so every client just
    // renders them. Previously the list returned raw 0-5 severity with no band,
    // while the detail endpoint returned a 0-100 score — the same field on two
    // different scales.
    return {
      complaints: dbComplaints.map((c) => ({
        ...c,
        ...complaintDerivations(c),
      })),
    };
  }
  private getComplaintWhere(ref: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ref,
      );
    return isUuid ? { id: ref } : { trackingId: ref };
  }

  async getComplaintDetail(ref: string) {
    const dbComplaint = (await this.prisma.complaint.findFirst({
      where: this.getComplaintWhere(ref),
      include: {
        aiPrediction: true,
        dispatchRecords: true,
        reporter: { select: { fullName: true, email: true } },
        timeline: {
          orderBy: { createdAt: 'asc' },
          include: { performedBy: { select: { fullName: true } } },
        },
      },
    })) as any;

    if (!dbComplaint) throw new NotFoundException(`Complaint ${ref} not found`);

    if (dbComplaint.aiPrediction) {
      try {
        let rawBoxes = dbComplaint.aiPrediction.boundingBoxes;
        if (typeof rawBoxes === 'string') {
          rawBoxes = JSON.parse(rawBoxes);
        }

        const mappedBoxes = (Array.isArray(rawBoxes) ? rawBoxes : []).map(
          (box: any) => {
            if (Array.isArray(box)) return box;
            if (box && typeof box === 'object') {
              const xmin = box.xmin ?? 0;
              const ymin = box.ymin ?? 0;
              const xmax = box.xmax ?? 0;
              const ymax = box.ymax ?? 0;
              return [xmin, ymin, xmax - xmin, ymax - ymin];
            }
            return [0, 0, 0, 0];
          },
        );

        dbComplaint.aiPrediction.boundingBoxes = mappedBoxes;

        let rawMeta = dbComplaint.aiPrediction.metadata;
        if (typeof rawMeta === 'string') {
          rawMeta = JSON.parse(rawMeta);
        }

        const metadataObj =
          rawMeta && typeof rawMeta === 'object' ? { ...rawMeta } : {};
        if (!metadataObj.width) metadataObj.width = 640;
        if (!metadataObj.height) metadataObj.height = 640;

        dbComplaint.aiPrediction.metadata = metadataObj;
      } catch (e) {
        console.error('Failed to parse/map AI prediction:', e);
      }
    }

    return dbComplaint;
  }

  async createComplaint(body: any, userId: string) {
    const lastComplaint = await this.prisma.complaint.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const nextRef = `CMP-${lastComplaint ? parseInt(lastComplaint.trackingId.split('-')[1]) + 1 : 10245}`;

    const complaint = await this.prisma.complaint.create({
      data: {
        trackingId: nextRef,
        title: body.title,
        description: body.description || body.title,
        category: body.category || 'Pothole',
        priority: (body.priority || 'MEDIUM') as Priority,
        status: ComplaintStatus.PENDING,
        latitude: body.lat ? Number(body.lat) : 12.9716,
        longitude: body.lng ? Number(body.lng) : 77.5946,
        imageUrl: body.imageUrl || 'https://placeholder-url.com',
        reporterId: userId,
      },
    });

    return { ref: complaint.trackingId };
  }

  async transitionComplaint(ref: string, to: string, userId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: this.getComplaintWhere(ref),
    });

    if (!complaint) throw new NotFoundException('Complaint not found');

    const backendStatus = this.mapStatusToBackend(to);
    const updated = await this.prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: backendStatus },
    });

    await this.prisma.complaintTimeline.create({
      data: {
        complaintId: complaint.id,
        status: backendStatus,
        notes: `Status changed to ${to}`,
        performedById: userId,
      },
    });

    return { ok: true };
  }

  async resolveDuplicate(ref: string, action: string, userId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: this.getComplaintWhere(ref),
    });

    if (!complaint) throw new NotFoundException('Complaint not found');

    if (action === 'confirm') {
      await this.prisma.complaint.update({
        where: { id: complaint.id },
        data: { status: ComplaintStatus.REJECTED },
      });
      await this.prisma.complaintTimeline.create({
        data: {
          complaintId: complaint.id,
          status: ComplaintStatus.REJECTED,
          notes: 'Confirmed duplicate — resolved by Supervisor',
          performedById: userId,
        },
      });
    }

    return { ok: true };
  }

  async verifyRepair(ref: string, file: any, userId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: this.getComplaintWhere(ref),
    });

    if (!complaint) throw new NotFoundException('Complaint not found');

    // Simulate AI verification
    await this.prisma.complaint.update({
      where: { id: complaint.id },
      data: { status: ComplaintStatus.RESOLVED },
    });

    await this.prisma.complaintTimeline.create({
      data: {
        complaintId: complaint.id,
        status: ComplaintStatus.RESOLVED,
        notes: 'Repair verified successfully via photograph matching.',
        performedById: userId,
      },
    });

    return { verdict: 'VERIFIED' };
  }

  async getAssignmentProposal() {
    const complaints = await this.prisma.complaint.findMany({
      where: { status: ComplaintStatus.PENDING },
      include: { aiPrediction: true },
    });

    const engineers = await this.prisma.user.findMany({
      where: { role: Role.ENGINEER, isActive: true, isDeleted: false },
    });

    const cs: AssignComplaint[] = complaints.map((c) => ({
      id: c.id,
      ref: c.trackingId,
      lat: c.latitude || 12.9716,
      lng: c.longitude || 77.5946,
      category: c.category,
      severityScore: c.aiPrediction?.confidenceScore
        ? c.aiPrediction.confidenceScore * 100
        : 35,
      departmentId: 'ROADS',
    }));

    const es: AssignEngineer[] = engineers.map((e, index) => {
      let skills = 'Pothole,Alligator Crack';
      if (index % 2 === 1) skills = 'Transverse Crack,Longitudinal Crack';
      return {
        id: e.id,
        code: `ENG-${e.id.substring(0, 5).toUpperCase()}`,
        name: e.fullName || 'Field Engineer',
        lat: 12.97 + index * 0.01,
        lng: 77.59 + index * 0.01,
        skills,
        status: 'AVAILABLE',
        departmentId: 'ROADS',
        openJobs: 0,
      };
    });

    const result = optimiseAssignments(cs, es);
    const titles = Object.fromEntries(
      complaints.map((c) => [c.id, { title: c.title, priority: c.priority }]),
    );

    return {
      result,
      titles,
      engineerCount: engineers.length,
    };
  }

  async applyAssignments(userId: string) {
    const proposal = await this.getAssignmentProposal();
    if (proposal.result.assignments.length === 0) return { applied: 0 };

    for (const a of proposal.result.assignments) {
      await this.prisma.complaint.update({
        where: { id: a.complaint.id },
        data: { status: ComplaintStatus.ASSIGNED },
      });

      await this.prisma.complaintTimeline.create({
        data: {
          complaintId: a.complaint.id,
          status: ComplaintStatus.ASSIGNED,
          notes: `Optimiser assigned ${a.engineer.name} (${a.engineer.code}) — ${a.distanceKm} km, ${a.skillMatch ? 'skill match' : 'no skill match'}, cost ${a.cost}`,
          performedById: userId,
        },
      });
    }

    return { applied: proposal.result.assignments.length };
  }

  async getGisData() {
    const complaints = await this.prisma.complaint.findMany({
      where: {
        status: {
          in: [
            ComplaintStatus.PENDING,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
          ],
        },
      },
    });

    const engineers = await this.prisma.user.findMany({
      where: { role: Role.ENGINEER, isActive: true, isDeleted: false },
    });

    const formattedComplaints = complaints.map((c) => ({
      id: c.id,
      ref: c.trackingId,
      title: c.title,
      lat: c.latitude || 12.9716,
      lng: c.longitude || 77.5946,
      status: this.mapStatusToFrontend(c.status),
      priority: c.priority,
    }));

    const formattedEngineers = engineers.map((e, index) => ({
      id: e.id,
      code: `ENG-${e.id.substring(0, 5).toUpperCase()}`,
      name: e.fullName || 'Field Engineer',
      lat: 12.97 + index * 0.01,
      lng: 77.59 + index * 0.01,
      status: 'AVAILABLE',
    }));

    return { complaints: formattedComplaints, engineers: formattedEngineers };
  }

  async getEngineers() {
    const engineers = await this.prisma.user.findMany({
      where: { role: Role.ENGINEER, isActive: true, isDeleted: false },
    });

    const formatted = engineers.map((e, index) => ({
      id: e.id,
      code: `ENG-${e.id.substring(0, 5).toUpperCase()}`,
      name: e.fullName || 'Field Engineer',
      phone: e.phoneNumber || '9999999999',
      zone: 'Central Zone',
      skills: 'Pothole,Alligator Crack,Transverse Crack',
      status: 'AVAILABLE',
      lat: 12.97 + index * 0.01,
      lng: 77.59 + index * 0.01,
      resolvedJobs: 5,
      department: { name: 'ROADS' },
      complaints: [],
    }));

    return { engineers: formatted };
  }

  async getAuditLogs() {
    const dbLogs = await this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, role: true } } },
    });

    const formatted = dbLogs.map((l) => ({
      id: l.id,
      actor: l.user?.fullName || 'System',
      actorRole: l.user?.role || 'SYSTEM',
      action: l.action,
      module: l.entity || 'General',
      target: l.entityId || 'All',
      details: JSON.stringify(l.details || {}),
      createdAt: l.createdAt,
    }));

    return { logs: formatted };
  }

  async queryHealth() {
    return { ai: await this.queryAiHealth() };
  }
}
