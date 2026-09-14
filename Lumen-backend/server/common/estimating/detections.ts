/**
 * Adapter between what the CV service stores and what dimensions.ts expects.
 *
 * `suggestDimensions` was written against a detector that emitted
 *   { label, confidence, box: [x1, y1, x2, y2] in PIXELS, area_ratio }
 * while ours stores
 *   { label, class_name, confidence, xmin, ymin, xmax, ymax } normalised to 0–1
 * with the frame size in the prediction's metadata.
 *
 * The conversion is not cosmetic. mergeOverlapping() treats two regions as one
 * pothole when their gap is under 12 — a *pixel* gap. Handing it 0–1
 * coordinates would make 12 larger than the entire frame, collapsing every
 * detection in the photograph into a single enormous hole and ordering
 * material for it. Scaling back to pixels first is what keeps that threshold
 * meaning what it was tuned to mean.
 */

/** The shape dimensions.ts consumes. Kept structural rather than imported so
 *  that file stays a verbatim copy of its original. */
export type Detection = {
  label: string;
  confidence: number;
  box: number[];
  area_ratio: number;
};

/** A box as postprocess.py emits it. */
type StoredBox = {
  label?: string;
  class_name?: string;
  confidence?: number | string;
  xmin?: number | string;
  ymin?: number | string;
  xmax?: number | string;
  ymax?: number | string;
};

// Used when a prediction has no metadata — older rows predate it being stored.
// The absolute values do not matter, only that they are pixel-scaled and in
// roughly a photograph's aspect, so the 12px merge gap stays meaningful.
const FALLBACK_W = 1280;
const FALLBACK_H = 960;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Convert stored bounding boxes into pixel-space detections.
 *
 * Legacy rows stored as a bare [xmin, ymin, width, height] array are skipped
 * rather than guessed at: they carry no label or confidence, and
 * suggestDimensions filters on both, so a converted one could only ever be
 * discarded a step later.
 */
export function toDetections(
  raw: unknown,
  metadata?: unknown,
): Detection[] {
  let boxes = raw;
  if (typeof boxes === 'string') {
    try {
      boxes = JSON.parse(boxes);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(boxes)) return [];

  const meta = (metadata && typeof metadata === 'object' ? metadata : {}) as {
    width?: number;
    height?: number;
  };
  const width = num(meta.width) || FALLBACK_W;
  const height = num(meta.height) || FALLBACK_H;

  const out: Detection[] = [];
  for (const b of boxes as StoredBox[]) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) continue;

    const xmin = num(b.xmin);
    const ymin = num(b.ymin);
    const xmax = num(b.xmax);
    const ymax = num(b.ymax);
    const w = Math.abs(xmax - xmin);
    const h = Math.abs(ymax - ymin);
    if (w <= 0 || h <= 0) continue;

    out.push({
      label: b.class_name || b.label || 'Damage',
      confidence: num(b.confidence),
      box: [xmin * width, ymin * height, xmax * width, ymax * height],
      // Coordinates are already fractions of the frame, so their product is
      // the area fraction directly — no need for the frame's pixel size.
      area_ratio: Math.min(1, w * h),
    });
  }
  return out;
}
