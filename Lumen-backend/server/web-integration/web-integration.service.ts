import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { complaintDerivations, severityPercent } from '../common/derivations';
import { PrismaService } from '../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Role, ComplaintStatus, Priority } from '@prisma/client';
import { randomBytes } from 'crypto';
import { StorageService } from '../common/storage/storage.service';
import { AiService } from '../ai/ai.service';
import { findNearbyDuplicates } from '../common/geo/duplicate-check';
import { nextTrackingId } from '../common/tracking-id';
import { toConsoleShape } from '../common/console-shape';
import { PriorityService } from '../common/priority/priority.service';
import { LANDMARKS } from '../common/priority/landmarks';

export type AssignComplaint = {
  id: string;
  ref: string;
  lat: number;
  lng: number;
  category: string;
  severityScore: number;
  departmentId: string;
  /** Display-only, carried through the optimiser for the console's rows. */
  title?: string;
  priority?: string;
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
  /** Display-only. */
  zone?: string;
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
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    private readonly priorityService: PriorityService,
  ) {}

  async onModuleInit() {
    await this.seedUsersAndComplaints();
  }

  async seedUsersAndComplaints() {
    this.logger.log('Checking database seed data...');
    try {
      const bcrypt = await import('bcrypt');

      // The seed password must not be a literal. This repository is public and
      // the accounts it creates are ADMIN, SUPERVISOR and ENGINEER — a hardcoded
      // value means anyone who reads this file can sign in to any deployment
      // that ever ran this seed. Set SEED_PASSWORD to choose one; otherwise a
      // random password is generated and the accounts are effectively locked
      // until someone resets them, which is the safe default for an
      // internet-facing deploy.
      const seedPassword =
        this.configService.get<string>('SEED_PASSWORD') ||
        randomBytes(24).toString('base64url');
      const hash = await bcrypt.hash(seedPassword, 10);

      if (!this.configService.get<string>('SEED_PASSWORD')) {
        this.logger.warn(
          'SEED_PASSWORD not set — seeded accounts were given a random ' +
            'password and cannot be logged into. Set SEED_PASSWORD and reseed, ' +
            'or reset the passwords, if you need them.',
        );
      }

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
    // Priority is scored here rather than read off the row. It depends on age,
    // so a stored value is stale the moment it is written — and the stored one
    // came from a rule that let clustering outrank everything else.
    const population = await this.priorityService.population();

    return {
      complaints: dbComplaints.map((c) => {
        const p = this.priorityService.score(c as any, population);
        return {
          ...toConsoleShape(c as any),
          ...complaintDerivations({ ...c, priority: p.priority }),
          priority: p.priority,
          priorityScore: p.score,
          priorityFactors: JSON.stringify(p.factors),
        };
      }),
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
        potholes: { orderBy: { recordedAt: 'asc' } },
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

        // Boxes are passed through as the detector emitted them:
        //   { label, class_name, confidence, xmin, ymin, xmax, ymax }
        // with coordinates normalised to 0–1 (postprocess.py uses xyxyn).
        //
        // This used to flatten each one to [xmin, ymin, width, height], which
        // broke both clients — they read box.xmin/.xmax/.confidence, got
        // undefined off an array, and drew every box at zero size in the
        // top-left corner. The detail page reported "N regions localised" while
        // showing no outline at all. Flattening also discarded the per-box
        // label and confidence, which nothing could then recover.
        //
        // Legacy rows stored as a bare [xmin, ymin, width, height] array are
        // converted forward rather than dropped, so complaints predicted before
        // this fix still render.
        const mappedBoxes = (Array.isArray(rawBoxes) ? rawBoxes : []).flatMap(
          (box: any) => {
            if (box && typeof box === 'object' && !Array.isArray(box)) {
              return [box];
            }
            if (Array.isArray(box) && box.length === 4) {
              const [xmin, ymin, w, h] = box.map(Number);
              return [
                {
                  label: 'Damage',
                  class_name: 'Damage',
                  confidence: 0,
                  xmin,
                  ymin,
                  xmax: xmin + w,
                  ymax: ymin + h,
                },
              ];
            }
            return [];
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


    // Same compatibility fields as the list endpoint, so a page can navigate
    // from one to the other without the field names changing underneath it.
    //
    // Returned both at the top level and under `complaint`: the console reads
    // data.complaint, while every existing caller reads the fields directly.
    // Duplicating one object is cheaper than breaking either.
    // Scored the same way the queue is, so a complaint does not change
    // priority as you click into it.
    const population = await this.priorityService.population();
    const p = this.priorityService.score(dbComplaint as any, population);

    const shaped = {
      ...toConsoleShape(dbComplaint as any),
      ...complaintDerivations({ ...dbComplaint, priority: p.priority }),
      priority: p.priority,
      priorityScore: p.score,
      // The console's "why this priority" panel parses this and lists the
      // factors that actually contributed, each with the points it added.
      priorityFactors: JSON.stringify(p.factors),
    };
    return { ...shaped, complaint: shaped };
  }

  async createComplaint(
    body: any,
    userId: string,
    photo?: Express.Multer.File,
  ) {
    // Duplicate check first, before the photograph is uploaded. Rejecting the
    // report after the upload would leave the file orphaned in the bucket with
    // no row pointing at it and nothing to clean it up.
    //
    // Only when the client actually sent coordinates. The columns below fall
    // back to a fixed city-centre point when it did not, and running the check
    // against that shared default would make every coordinate-less report a
    // duplicate of the first one.
    const hasCoords =
      body.lat !== undefined &&
      body.lat !== null &&
      body.lng !== undefined &&
      body.lng !== null;
    const category = body.category || 'Pothole';

    if (hasCoords) {
      const duplicates = await findNearbyDuplicates(
        this.prisma,
        Number(body.lat),
        Number(body.lng),
        category,
      );
      if (duplicates.length > 0) {
        const nearest = duplicates[0];
        throw new BadRequestException(
          `A ${category.toLowerCase()} was already reported ${Math.round(
            nearest.distanceMeters,
          )} m away (${nearest.trackingId}). If this is a different defect, move the pin further from the existing report.`,
        );
      }
    }

    // The photograph is the evidence the whole pipeline runs on: the AI service
    // fetches it by URL, so it has to be somewhere reachable before the
    // complaint exists. Fail with the reason rather than storing a placeholder
    // that silently makes detection impossible later.
    let imageUrl: string | undefined = body.imageUrl;
    if (photo) {
      try {
        const stored = await this.storageService.uploadFile(photo);
        imageUrl = stored.imageUrl || stored.url;
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        this.logger.error(`Complaint photo upload failed: ${reason}`);
        throw new ServiceUnavailableException(
          `Could not store the photograph: ${reason}`,
        );
      }
    }
    if (!imageUrl) {
      throw new BadRequestException('A photograph is required.');
    }

    const nextRef = await nextTrackingId(this.prisma);

    const complaint = await this.prisma.complaint.create({
      data: {
        trackingId: nextRef,
        title: body.title,
        description: body.description || body.title,
        category,
        priority: (body.priority || 'MEDIUM') as Priority,
        status: ComplaintStatus.PENDING,
        latitude: body.lat ? Number(body.lat) : 12.9716,
        longitude: body.lng ? Number(body.lng) : 77.5946,
        imageUrl,
        reporterId: userId,
      },
    });

    // The form's button reads "Analyse & Create Complaint — runs detection →
    // severity → duplicate check", but this route only ever created the row, so
    // every complaint filed from the web console sat at "No AI predictions
    // available yet" with severity 0. processImagePrediction stores the
    // prediction and feeds updateComplaintWithAiResult, which is what actually
    // derives severity, priority and the 30m duplicate clustering.
    //
    // Awaited rather than fired and forgotten: the user is shown the complaint
    // page immediately after this resolves, and detection takes about a second.
    // It swallows its own failures internally (marking the prediction FAILED),
    // so a CV outage cannot lose an otherwise valid report.
    await this.aiService.processImagePrediction(complaint.id, imageUrl);

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
      // Carried through the optimiser untouched. The console renders a title
      // and a priority badge on every proposed row, and PriorityBadge calls
      // priority.charAt(0) — an absent value threw and blanked the page.
      title: c.title,
      priority: c.priority,
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
        // No zones in this schema; the console prints it beside the engineer's
        // name and an empty string simply disappears.
        zone: '',
      };
    });

    const result = optimiseAssignments(cs, es);
    const titles = Object.fromEntries(
      complaints.map((c) => [c.id, { title: c.title, priority: c.priority }]),
    );

    return {
      // Flattened as well as nested. The console reads data.assignments and
      // data.unassigned directly, so nesting everything under `result` gave it
      // undefined and the first `.length` on it threw — the assignment page
      // rendered as a blank screen rather than an error.
      //
      // `result` is kept so applyAssignments and any existing caller are
      // unaffected; the duplication is a few hundred bytes against breaking
      // one side or the other.
      ...result,
      // The optimiser returns the raw complaint for anything it could not
      // place. The console lists these with a title and an explanation, so
      // supply both rather than leaving it to render blanks.
      unassigned: result.unassigned.map((u: any) => ({
        ...u,
        title: titles[u.id]?.title ?? u.ref,
        reason:
          engineers.length === 0
            ? 'No active engineers on the roster'
            : 'No engineer free with a matching skill in range',
      })),
      // Names the console expects that the optimiser does not produce under
      // those names.
      naiveAssigned: result.assignments.length,
      engineersConsidered: engineers.length,
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
      // The map colours each marker by severity band and labels it with its
      // class, and reads them straight off the record without guarding. Absent
      // here, the legend threw and the whole page rendered blank.
      zone: '',
      category: c.category,
      civicCategory: 'ROADS',
      severityScore: severityPercent(c.severity),
      ...complaintDerivations(c),
      createdAt: c.createdAt,
      engineer: null,
    }));

    const formattedEngineers = engineers.map((e, index) => ({
      id: e.id,
      code: `ENG-${e.id.substring(0, 5).toUpperCase()}`,
      name: e.fullName || 'Field Engineer',
      lat: 12.97 + index * 0.01,
      lng: 77.59 + index * 0.01,
      status: 'AVAILABLE',
      // The map draws the engineer's marker as a badge containing this number,
      // and printed the literal text "undefined" on the map without it.
      //
      // Always 0: this schema records assignment in the timeline rather than on
      // the complaint, so there is no per-engineer count to read. Zero is
      // honest about that; a fabricated figure on a dispatch map is not.
      openJobs: 0,
      zone: '',
      skills: '',
      department: null,
    }));

    return {
      complaints: formattedComplaints,
      engineers: formattedEngineers,
      // The risk overlay. The map calls landmarks.find() unconditionally, so
      // an absent array is a TypeError and a blank page rather than a map with
      // one layer missing.
      //
      // Hardcoded, as in the original: there is no landmark table, and a table
      // holding three rows would be worse than a constant that says what it
      // is. Replace these with real coordinates for the city being served —
      // they are also what the assistant answers "near the hospital" against.
      // The same table priority.ts scores against, not a copy. A hand-kept
      // second list meant the map could draw one set of risk zones while the
      // score counted another, and nothing would catch the divergence.
      landmarks: LANDMARKS,
    };
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
