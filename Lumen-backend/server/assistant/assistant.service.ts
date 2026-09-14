import { Injectable, Logger } from '@nestjs/common';
import { ComplaintStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { classify, extract, type Entities, type Intent } from './nlu';
import {
  ALL_CLASSES,
  CATEGORIES,
  classesInCategory,
  type CategoryKey,
} from './taxonomy';
import { EXPLAIN_LABELS, EXPLAIN_TEXT } from './explanations';
import { callLLM, type LlmSource } from './llm';
import { SLA_HOURS } from '../common/derivations';

/**
 * Operations assistant — execution.
 *
 * The parsing half lives in nlu.ts and came across from lumen-platform almost
 * unchanged. This half is a rewrite: the original queried `ref`,
 * `civicCategory`, `severityScore`, `duplicateOfId`, `slaHours`,
 * `priorityScore` and a separate Engineer model, none of which exist here.
 *
 * The guarantee it was built on is kept. Every figure below comes from a query
 * run after the question is parsed, and the rows are returned with the answer
 * so a supervisor can check them. The language model is reached only when the
 * parser fails to classify a question, and even then it is handed a snapshot
 * rather than left to recall.
 */

export type Answer = {
  answer: string;
  intent: Intent;
  confidence: number;
  entities: Entities;
  rows?: {
    ref: string;
    title: string;
    priority: string;
    category: string;
    status: string;
    severity: number;
  }[];
  stats?: { label: string; value: string }[];
  engineers?: { name: string; email: string; role: string }[];
  suggestions?: string[];
  /** Which engine produced it — "database" means the rows below are the proof. */
  source?: 'database' | LlmSource;
};

/** Not RESOLVED, CLOSED or REJECTED. */
const OPEN_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.PENDING,
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
];

/**
 * Landmarks for "near the hospital" questions.
 *
 * Hardcoded, as in the original — there is no landmark table, and inventing
 * one to hold three rows would be worse than a constant that says what it is.
 * Replace these with real coordinates for the city being served.
 */
const LANDMARKS: Record<string, { lat: number; lng: number }> = {
  Hospital: { lat: 12.9719, lng: 77.5937 },
  School: { lat: 12.9352, lng: 77.6245 },
  'Major highway': { lat: 12.957, lng: 77.639 },
};

const HELP_SUGGESTIONS = [
  'How many critical complaints are open?',
  'Show the 5 most severe complaints',
  'Which complaints have breached SLA?',
  'Breakdown by category',
  'How is severity calculated?',
];

const plural = (n: number, one: string, many = one + 's') =>
  `${n} ${n === 1 ? one : many}`;

/** Irregular plurals plural() cannot form by appending "s". */
const CLASSES_WORD = (n: number) => plural(n, 'class', 'classes');

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

type ComplaintRow = {
  trackingId: string;
  title: string;
  priority: string;
  category: string;
  status: string;
  severity: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
};

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Query shaping
  // ---------------------------------------------------------------------------

  /**
   * Turn extracted entities into a Prisma filter.
   *
   * Category is matched against the class names the detector actually emits,
   * case-insensitively: intake writes what the client sent ('Pothole') and the
   * vision service later overwrites it with its own label ('POTHOLE'), so an
   * exact match would miss every analysed complaint.
   */
  private whereFrom(e: Entities): Prisma.ComplaintWhereInput {
    const where: Prisma.ComplaintWhereInput = {};

    if (e.status === 'OPEN' || !e.status) where.status = { in: OPEN_STATUSES };
    else where.status = e.status as ComplaintStatus;

    if (e.priority) where.priority = e.priority as any;

    if (e.category) {
      const classes = classesInCategory(e.category);
      if (classes.length) {
        where.OR = classes.map((c) => ({
          category: { equals: c, mode: 'insensitive' as const },
        }));
      }
    }
    return where;
  }

  private filterPhrase(e: Entities): string {
    const bits: string[] = [];
    if (e.priority) bits.push(e.priority.toLowerCase());
    if (e.category) bits.push(CATEGORIES[e.category].label.toLowerCase());
    const noun = bits.length ? `${bits.join(' ')} complaints` : 'complaints';
    const state =
      e.status && e.status !== 'OPEN'
        ? e.status.toLowerCase().replace('_', ' ')
        : 'open';
    return `${state} ${noun}`;
  }

  private toRows(list: ComplaintRow[]): Answer['rows'] {
    return list.map((c) => ({
      ref: c.trackingId,
      title: c.title,
      priority: c.priority,
      category: c.category,
      status: c.status,
      severity: Math.round((c.severity ?? 0) * 10) / 10,
    }));
  }

  private select() {
    return {
      trackingId: true,
      title: true,
      priority: true,
      category: true,
      status: true,
      severity: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    };
  }

  /**
   * A category the model cannot detect is answered as such rather than with a
   * count of zero, which would read as "we looked and there is none".
   */
  private undetectable(e: Entities): CategoryKey | null {
    return e.category && !CATEGORIES[e.category].detectable ? e.category : null;
  }

  // ---------------------------------------------------------------------------
  // Snapshot for the model fallback
  // ---------------------------------------------------------------------------

  private async snapshot(): Promise<string> {
    const [total, open, byPriority, recent] = await Promise.all([
      this.prisma.complaint.count(),
      this.prisma.complaint.count({ where: { status: { in: OPEN_STATUSES } } }),
      this.prisma.complaint.groupBy({
        by: ['priority'],
        where: { status: { in: OPEN_STATUSES } },
        _count: true,
      }),
      this.prisma.complaint.findMany({
        where: { status: { in: OPEN_STATUSES } },
        orderBy: { severity: 'desc' },
        take: 8,
        select: this.select(),
      }),
    ]);

    const lines = [
      `Total complaints on record: ${total}`,
      `Open complaints: ${open}`,
      `Open by priority: ${byPriority.map((p) => `${p.priority} ${p._count}`).join(', ') || 'none'}`,
      'Most severe open complaints:',
      ...recent.map(
        (c) =>
          `  ${c.trackingId} | ${c.title} | ${c.category} | ${c.priority} | severity ${c.severity ?? 0}/5 | ${c.status}`,
      ),
    ];
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------

  async ask(question: string): Promise<Answer> {
    const entities = extract(question);
    const { intent, confidence } = classify(question, entities);
    const base = { intent, confidence, entities };
    const where = this.whereFrom(entities);

    const blocked = this.undetectable(entities);
    if (blocked && intent !== 'EXPLAIN' && intent !== 'HELP') {
      return {
        ...base,
        source: 'database',
        answer:
          `This deployment does not detect ${CATEGORIES[blocked].label.toLowerCase()}. ` +
          'The model is trained on road damage only — Pothole, Alligator, Transverse and Longitudinal. ' +
          'Nothing in the backlog can be categorised that way.',
        suggestions: HELP_SUGGESTIONS,
      };
    }

    switch (intent) {
      // -------------------------------------------------------------------
      case 'COUNT': {
        const n = await this.prisma.complaint.count({ where });
        return {
          ...base,
          source: 'database',
          answer: `There ${n === 1 ? 'is' : 'are'} ${plural(n, this.filterPhrase(entities).replace(/s$/, ''))}.`
            .replace('complaint.', 'complaints.'),
          stats: [{ label: 'Count', value: String(n) }],
          rows: this.toRows(
            await this.prisma.complaint.findMany({
              where,
              orderBy: { severity: 'desc' },
              take: 10,
              select: this.select(),
            }),
          ),
        };
      }

      // -------------------------------------------------------------------
      case 'LIST': {
        const take = Math.min(entities.limit ?? 10, 50);
        const list = await this.prisma.complaint.findMany({
          where,
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          take,
          select: this.select(),
        });
        return {
          ...base,
          source: 'database',
          answer: list.length
            ? `The ${list.length} most severe ${this.filterPhrase(entities)}, worst first.`
            : `No ${this.filterPhrase(entities)} right now.`,
          rows: this.toRows(list),
        };
      }

      // -------------------------------------------------------------------
      case 'SLA_BREACH': {
        // SLA is derived from priority, not stored, so the breach test has to
        // run in Node over the open set rather than as a WHERE clause.
        const open = await this.prisma.complaint.findMany({
          where: { status: { in: OPEN_STATUSES } },
          select: this.select(),
        });
        const now = Date.now();
        const breached = open.filter((c) => {
          const budget = SLA_HOURS[c.priority] ?? SLA_HOURS.MEDIUM;
          const ageH = (now - new Date(c.createdAt).getTime()) / 3_600_000;
          return ageH > budget;
        });
        breached.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
        return {
          ...base,
          source: 'database',
          answer: breached.length
            ? `${plural(breached.length, 'open complaint')} past the response-time target for their priority band.`
            : 'Nothing has breached its response-time target.',
          stats: [
            { label: 'Breached', value: String(breached.length) },
            { label: 'Open', value: String(open.length) },
          ],
          rows: this.toRows(breached.slice(0, 20)),
        };
      }

      // -------------------------------------------------------------------
      case 'ENGINEER_LOAD': {
        // This schema has no engineer column on Complaint — applying an
        // assignment sets the status and writes a timeline entry naming the
        // person, but nothing joins back. So the roster is reportable and
        // per-engineer load is not, and saying so is better than counting
        // something else and calling it workload.
        const engineers = await this.prisma.user.findMany({
          where: { role: 'ENGINEER', isActive: true, isDeleted: false },
          select: { fullName: true, email: true, role: true },
          orderBy: { fullName: 'asc' },
        });
        const assigned = await this.prisma.complaint.count({
          where: { status: ComplaintStatus.ASSIGNED },
        });
        return {
          ...base,
          source: 'database',
          answer:
            `${plural(engineers.length, 'engineer')} on the roster, and ${plural(assigned, 'complaint')} currently assigned. ` +
            'Which engineer holds which complaint is not stored on the complaint in this schema — ' +
            'assignment is recorded in the timeline, so per-engineer workload cannot be totalled from the database.',
          engineers: engineers.map((e) => ({
            name: e.fullName ?? e.email,
            email: e.email,
            role: e.role,
          })),
          stats: [
            { label: 'Engineers', value: String(engineers.length) },
            { label: 'Assigned', value: String(assigned) },
          ],
        };
      }

      // -------------------------------------------------------------------
      case 'BREAKDOWN': {
        const raw = await this.prisma.complaint.groupBy({
          by: ['category'],
          where: { status: { in: OPEN_STATUSES } },
          _count: true,
        });

        // groupBy is case-sensitive, and this column holds both 'Pothole' and
        // 'POTHOLE' for the same class: intake stores what the client sent and
        // the vision service later overwrites it with its own label. Left as
        // is, one class reported as two. Fold them, preferring the detector's
        // spelling from the taxonomy so the label shown is the canonical one.
        const merged = new Map<string, number>();
        for (const g of raw) {
          const canonical =
            ALL_CLASSES.find(
              (c) => c.toLowerCase() === g.category.toLowerCase(),
            ) ?? g.category;
          merged.set(canonical, (merged.get(canonical) ?? 0) + g._count);
        }
        const groups = [...merged].map(([category, _count]) => ({
          category,
          _count,
        }));
        groups.sort((a, b) => b._count - a._count);
        const total = groups.reduce((t, g) => t + g._count, 0);
        return {
          ...base,
          source: 'database',
          answer: total
            ? `${plural(total, 'open complaint')} across ${CLASSES_WORD(groups.length)}.`
            : 'No open complaints to break down.',
          stats: groups.map((g) => ({
            label: g.category,
            value: `${g._count} (${Math.round((g._count / total) * 100)}%)`,
          })),
        };
      }

      // -------------------------------------------------------------------
      case 'DUPLICATES': {
        // Duplicates are rejected at intake rather than stored and linked, so
        // there is no duplicateOfId to count. What can be reported is the
        // clustering that survives: open complaints of the same class within
        // 30 m of each other, which is what escalates priority.
        const open = await this.prisma.complaint.findMany({
          where: {
            status: { in: OPEN_STATUSES },
            latitude: { not: null },
            longitude: { not: null },
          },
          select: this.select(),
        });
        const clustered = open.filter((c) =>
          open.some(
            (o) =>
              o.trackingId !== c.trackingId &&
              o.category.toLowerCase() === c.category.toLowerCase() &&
              haversineMeters(c.latitude!, c.longitude!, o.latitude!, o.longitude!) <= 30,
          ),
        );
        return {
          ...base,
          source: 'database',
          answer: clustered.length
            ? `${plural(clustered.length, 'open complaint')} sit within 30 m of another report of the same class, which is what raises their priority. ` +
              'Reports closer than 20 m to an existing open one are rejected at intake, so none of these are exact duplicates.'
            : 'No open complaints are clustered within 30 m of another of the same class. ' +
              'Reports within 20 m of an existing open one are rejected at intake, so exact duplicates never enter the backlog.',
          stats: [{ label: 'Clustered', value: String(clustered.length) }],
          rows: this.toRows(clustered.slice(0, 20)),
        };
      }

      // -------------------------------------------------------------------
      case 'LOOKUP': {
        if (!entities.ref) {
          return {
            ...base,
            source: 'database',
            answer: 'Tell me the reference — for example CMP-10245.',
            suggestions: HELP_SUGGESTIONS,
          };
        }
        const c = await this.prisma.complaint.findFirst({
          where: { trackingId: { equals: entities.ref, mode: 'insensitive' } },
          select: {
            ...this.select(),
            description: true,
            aiPrediction: {
              select: { damageClass: true, confidenceScore: true },
            },
            potholes: { select: { volumeM3: true } },
          },
        });
        if (!c) {
          return {
            ...base,
            source: 'database',
            answer: `No complaint with reference ${entities.ref}.`,
          };
        }
        const ageH = Math.round(
          (Date.now() - new Date(c.createdAt).getTime()) / 3_600_000,
        );
        const volume = c.potholes.reduce((t, p) => t + p.volumeM3, 0);
        return {
          ...base,
          source: 'database',
          answer:
            `${c.trackingId} — ${c.title}. ${c.category}, ${c.priority} priority, ${c.status}, ` +
            `severity ${c.severity ?? 0}/5, ${ageH} h old.` +
            (c.potholes.length
              ? ` ${plural(c.potholes.length, 'pothole')} measured, ${volume.toFixed(3)} m³ total.`
              : ' No site measurements recorded.'),
          stats: [
            { label: 'Status', value: c.status },
            { label: 'Priority', value: c.priority },
            { label: 'Severity', value: `${c.severity ?? 0}/5` },
            {
              label: 'Detected',
              value: c.aiPrediction
                ? `${c.aiPrediction.damageClass} (${Math.round(c.aiPrediction.confidenceScore * 100)}%)`
                : 'not analysed',
            },
          ],
          rows: this.toRows([c as ComplaintRow]),
        };
      }

      // -------------------------------------------------------------------
      case 'NEAR': {
        const name = entities.landmark ?? 'Hospital';
        const point = LANDMARKS[name];
        const radius = 500;
        const open = await this.prisma.complaint.findMany({
          where: {
            ...where,
            latitude: { not: null },
            longitude: { not: null },
          },
          select: this.select(),
        });
        const near = open
          .map((c) => ({
            c,
            d: haversineMeters(point.lat, point.lng, c.latitude!, c.longitude!),
          }))
          .filter((x) => x.d <= radius)
          .sort((a, b) => a.d - b.d);
        return {
          ...base,
          source: 'database',
          answer: near.length
            ? `${plural(near.length, 'open complaint')} within ${radius} m of the ${name.toLowerCase()}.`
            : `Nothing open within ${radius} m of the ${name.toLowerCase()}.`,
          stats: [{ label: 'Landmark', value: name }],
          rows: this.toRows(near.map((x) => x.c)),
        };
      }

      // -------------------------------------------------------------------
      case 'OVERVIEW': {
        const [total, open, breachCandidates, byPriority] = await Promise.all([
          this.prisma.complaint.count(),
          this.prisma.complaint.count({ where: { status: { in: OPEN_STATUSES } } }),
          this.prisma.complaint.findMany({
            where: { status: { in: OPEN_STATUSES } },
            select: { priority: true, createdAt: true },
          }),
          this.prisma.complaint.groupBy({
            by: ['priority'],
            where: { status: { in: OPEN_STATUSES } },
            _count: true,
          }),
        ]);
        const now = Date.now();
        const breached = breachCandidates.filter(
          (c) =>
            (now - new Date(c.createdAt).getTime()) / 3_600_000 >
            (SLA_HOURS[c.priority] ?? SLA_HOURS.MEDIUM),
        ).length;
        return {
          ...base,
          source: 'database',
          answer:
            `${plural(open, 'complaint')} open of ${total} on record, ${breached} past their response-time target.`,
          stats: [
            { label: 'Open', value: String(open) },
            { label: 'Total', value: String(total) },
            { label: 'SLA breached', value: String(breached) },
            ...byPriority.map((p) => ({
              label: p.priority,
              value: String(p._count),
            })),
          ],
        };
      }

      // -------------------------------------------------------------------
      case 'WHY': {
        if (!entities.ref) {
          return {
            ...base,
            source: 'database',
            answer:
              'Name the complaint and I will explain its priority — for example "why is CMP-10245 critical?".',
            suggestions: HELP_SUGGESTIONS,
          };
        }
        const c = await this.prisma.complaint.findFirst({
          where: { trackingId: { equals: entities.ref, mode: 'insensitive' } },
          select: this.select(),
        });
        if (!c) {
          return {
            ...base,
            source: 'database',
            answer: `No complaint with reference ${entities.ref}.`,
          };
        }
        let nearby = 0;
        if (c.latitude != null && c.longitude != null) {
          const others = await this.prisma.complaint.findMany({
            where: {
              trackingId: { not: c.trackingId },
              latitude: { not: null },
              longitude: { not: null },
              category: { equals: c.category, mode: 'insensitive' },
            },
            select: { latitude: true, longitude: true },
          });
          nearby = others.filter(
            (o) =>
              haversineMeters(c.latitude!, c.longitude!, o.latitude!, o.longitude!) <=
              30,
          ).length;
        }
        const reason =
          nearby > 2
            ? `${nearby} other reports of the same class within 30 m, which sets CRITICAL`
            : nearby > 0
              ? `${plural(nearby, 'other report')} of the same class within 30 m, which sets HIGH`
              : `no other reports of the same class nearby, so priority came from severity alone`;
        return {
          ...base,
          source: 'database',
          answer: `${c.trackingId} is ${c.priority}: ${reason}. Severity is ${c.severity ?? 0}/5, scored from detector confidence and how many defects were found in the frame.`,
          stats: [
            { label: 'Priority', value: c.priority },
            { label: 'Severity', value: `${c.severity ?? 0}/5` },
            { label: 'Nearby same class', value: String(nearby) },
          ],
          rows: this.toRows([c]),
        };
      }

      // -------------------------------------------------------------------
      case 'BUDGET': {
        // No planner in this deployment. Say so and point at what does exist,
        // rather than letting the model invent an allocation.
        return {
          ...base,
          source: 'database',
          answer: EXPLAIN_TEXT.budget,
          suggestions: [
            'How do material estimates work?',
            'Show the 5 most severe complaints',
          ],
        };
      }

      // -------------------------------------------------------------------
      case 'EXPLAIN': {
        const topic = entities.topic ?? 'priority';
        const canned = EXPLAIN_TEXT[topic] ?? EXPLAIN_TEXT.priority;
        return {
          ...base,
          source: 'database',
          answer: canned,
          stats: [{ label: 'Topic', value: EXPLAIN_LABELS[topic] ?? topic }],
          suggestions: [
            'How is severity calculated?',
            'How does duplicate detection work?',
            'How does assignment work?',
          ],
        };
      }

      // -------------------------------------------------------------------
      case 'HELP':
        return {
          ...base,
          source: 'database',
          answer:
            'I answer questions about the complaint backlog by querying the database directly — every figure comes from a real query, and I show the rows behind it. Try one of these:',
          suggestions: HELP_SUGGESTIONS,
        };

      // -------------------------------------------------------------------
      default: {
        // The parser could not place the question. Hand it to the local model
        // with a snapshot, so the answer is at least grounded in current data.
        const generated = await callLLM(await this.snapshot(), question);
        if (generated) {
          return {
            ...base,
            answer: generated.text,
            source: generated.source,
            suggestions: HELP_SUGGESTIONS,
          };
        }
        return {
          ...base,
          source: 'database',
          answer:
            'I could not match that to anything I know how to query, and the local model is not reachable. Try one of these:',
          suggestions: HELP_SUGGESTIONS,
        };
      }
    }
  }
}
