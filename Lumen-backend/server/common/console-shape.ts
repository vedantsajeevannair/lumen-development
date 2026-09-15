import { complaintDerivations, severityPercent } from './derivations';

/**
 * Compatibility fields for the operations console.
 *
 * The console was built against a backend whose complaint had `ref`,
 * `severityScore` on a 0-100 scale, a `department` object and a `zone`. This
 * schema has `trackingId`, `severity` on 0-5, a Department enum reached
 * through DispatchRecord, and no zone at all.
 *
 * Adapting the payload in one place rather than the field access in every page
 * is deliberate. The alternative was editing roughly forty call sites across
 * twelve screens, where each miss is a blank page at runtime rather than a
 * compile error — the console renders `c.department.name` directly, so an
 * absent object throws and React unmounts the whole tree.
 *
 * These are additive. Every existing field keeps its name and meaning, so the
 * mobile app and anything else reading this endpoint are unaffected.
 */

/** Midpoint of each priority band, on the 0-100 scale the console renders. */
const PRIORITY_SCORE: Record<string, number> = {
  CRITICAL: 85,
  HIGH: 65,
  MEDIUM: 40,
  LOW: 15,
};

type Shapeable = {
  trackingId: string;
  severity?: number | null;
  category?: string;
  dispatchRecords?: { department: string }[];
  [k: string]: any;
};

/** Department the complaint was dispatched to, if it has been. */
function departmentOf(c: Shapeable): { name: string } | null {
  const latest = c.dispatchRecords?.[c.dispatchRecords.length - 1];
  return latest ? { name: latest.department } : null;
}

/**
 * Stored boxes, in the shape the console's overlay expects.
 *
 * It draws from `box: [x1, y1, x2, y2]` in *pixels* plus `area_ratio`, and
 * reads the whole thing out of a JSON *string* column. We store an array of
 * objects with 0-1 coordinates and keep the frame size in the prediction's
 * metadata, so this converts both the geometry and the container.
 */
function toConsoleDetections(pred: any): string | null {
  if (!pred?.boundingBoxes) return null;
  let boxes = pred.boundingBoxes;
  if (typeof boxes === 'string') {
    try {
      boxes = JSON.parse(boxes);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(boxes)) return null;

  const meta = (pred.metadata ?? {}) as { width?: number; height?: number };
  const width = Number(meta.width) || 1280;
  const height = Number(meta.height) || 960;

  const out = boxes
    .filter((b: any) => b && typeof b === 'object' && !Array.isArray(b))
    .map((b: any) => {
      const xmin = Number(b.xmin) || 0;
      const ymin = Number(b.ymin) || 0;
      const xmax = Number(b.xmax) || 0;
      const ymax = Number(b.ymax) || 0;
      return {
        label: b.class_name || b.label || 'Damage',
        confidence: Number(b.confidence) || 0,
        box: [xmin * width, ymin * height, xmax * width, ymax * height],
        area_ratio: Math.min(1, Math.abs(xmax - xmin) * Math.abs(ymax - ymin)),
        polygon: null,
        // The frame the pixel coordinates above are measured against. The
        // console draws its overlay as percentages, and recovering the frame
        // size from area_ratio and the box aspect is arithmetic that goes
        // wrong quietly on a degenerate box. Sending it is two numbers.
        frameWidth: width,
        frameHeight: height,
      };
    });
  return JSON.stringify(out);
}

export function toConsoleShape<T extends Shapeable>(c: T) {
  return {
    ...c,
    // severityBand, severityPercent, slaHours and slaStatus. The list endpoint
    // already spread these; the detail endpoint did not, so the complaint page
    // rendered "Resolution SLA   h" with the number missing entirely and had no
    // band to colour its severity meter by.
    ...complaintDerivations(c as any),
    /** The console's name for trackingId. */
    ref: c.trackingId,
    /**
     * Severity on 0-100, which is the scale the console's meters and colour
     * bands are calibrated against. `severity` keeps its 0-5 value for every
     * existing caller.
     */
    severityScore: severityPercent(c.severity),
    /**
     * Never null. The console reads `c.department.name` without guarding, so
     * an undispatched complaint would crash the list; "Unassigned" is both
     * true and renderable.
     */
    department: departmentOf(c) ?? { name: 'Unassigned' },
    /**
     * No zones in this schema. Empty rather than invented — the console
     * renders it beside the department and an empty string simply disappears.
     */
    zone: c.zone ?? '',
    /**
     * Assignment is recorded in the timeline, not on the complaint, so there
     * is nobody to name here. The console already guards this one with `?.`
     * and falls back to "Unassigned".
     */
    engineer: c.engineer ?? null,
    /**
     * Duplicates are rejected at intake rather than stored and linked, so a
     * complaint is never a duplicate *of* something in this database.
     */
    duplicateOf: c.duplicateOf ?? null,

    // --- detail-page fields ---------------------------------------------
    lat: c.latitude ?? null,
    lng: c.longitude ?? null,
    address: c.address ?? '',
    /**
     * One image per complaint here, where the console expects a gallery. It
     * filters on kind === "CITIZEN", so the kind has to be set or the reported
     * photograph does not render at all.
     *
     * `annotated` is null: nothing on this side renders boxes onto the image
     * and stores a second file. The console falls back to drawing them live
     * from `detections`, which is the better arrangement anyway — the overlay
     * stays correct if the threshold changes.
     */
    images: c.imageUrl
      ? [
          {
            id: `${c.id}-original`,
            kind: 'CITIZEN',
            path: c.imageUrl,
            annotated: null,
            severity: c.severity ?? null,
          },
        ]
      : [],
    detections: toConsoleDetections(c.aiPrediction),
    aiModelMode: c.aiPrediction ? 'TRAINED' : null,
    aiConfidence: c.aiPrediction?.confidenceScore ?? c.confidence ?? null,
    civicCategory: 'ROADS',
    autoRouted: false,
    /**
     * Scored from the priority band, not from severity.
     *
     * The console prints this number directly beneath the priority badge,
     * labelled "severity + location, age, reports". Deriving it from severity
     * alone put "0 / 100" under a badge reading High on any complaint whose
     * priority came from clustering rather than from the photograph — the two
     * fields contradicted each other on screen.
     *
     * Priority here is only ever a band, so this is the midpoint of the band's
     * range: enough for the console's meter to fill sensibly, and consistent
     * with the badge beside it.
     */
    priorityScore: PRIORITY_SCORE[c.priority ?? 'MEDIUM'] ?? 40,
    /**
     * The console parses this as JSON to explain a priority. Give it the real
     * inputs rather than null, so the explanation is grounded.
     */
    priorityFactors: JSON.stringify({
      severity: c.severity ?? 0,
      confidence: c.confidence ?? 0,
    }),
    duplicateOfId: null,
    dupSimilarity: null,
    dupDistanceM: null,
    dupScore: null,
    dupDescriptionSimilarity: null,
    /** ComplaintTimeline rows, renamed to the event shape the console renders. */
    events: (c.timeline ?? []).map((t: any) => ({
      id: t.id,
      type: 'STATUS_CHANGE',
      message: t.notes ?? t.status,
      actor: t.performedBy?.fullName ?? 'System',
      createdAt: t.createdAt,
    })),
    potholes: c.potholes ?? [],
  };
}
