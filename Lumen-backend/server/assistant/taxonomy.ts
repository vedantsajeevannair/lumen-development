/**
 * Civic damage taxonomy, as this deployment's detector actually sees it.
 *
 * Adapted rather than copied from the lumen-platform original. That one
 * declared five classes across Roads, Waste and Water, matching the model it
 * was built for. The model here is the RDD2022-trained road-damage detector,
 * whose four classes are all road surface defects — it has never seen a
 * garbage pile or a manhole.
 *
 * The original made the point itself: "declaring a class the detector can
 * never return advertises a capability that does not exist." Carrying its
 * Waste and Water entries across would do exactly that, so they are gone. The
 * CategoryKey union keeps all three names because the assistant's vocabulary
 * recognises the words — a supervisor asking about garbage should be told
 * plainly that nothing detects it, not silently given road figures.
 */

export type CategoryKey = 'ROADS' | 'WASTE' | 'WATER';

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; deptName: string; sla: number; detectable: boolean }
> = {
  ROADS: {
    label: 'Roads',
    deptName: 'Roads & Infrastructure',
    sla: 48,
    detectable: true,
  },
  // Recognised in questions, not produced by the model. `detectable: false` is
  // what lets the assistant say "this deployment does not detect waste" rather
  // than reporting a count of zero as though it had looked.
  WASTE: {
    label: 'Waste',
    deptName: 'Sanitation',
    sla: 24,
    detectable: false,
  },
  WATER: {
    label: 'Water',
    deptName: 'Water Supply',
    sla: 24,
    detectable: false,
  },
};

/**
 * The four classes best.onnx emits, with the weight each carries when ranking
 * severity. A pothole is a hole; a longitudinal crack is the road telling you
 * it is about to become one.
 */
export const CLASSES: Record<string, { category: CategoryKey; weight: number }> =
  {
    Pothole: { category: 'ROADS', weight: 1.0 },
    Alligator: { category: 'ROADS', weight: 0.85 },
    Transverse: { category: 'ROADS', weight: 0.6 },
    Longitudinal: { category: 'ROADS', weight: 0.55 },
  };

export const ALL_CLASSES = Object.keys(CLASSES);
export const ALL_CATEGORIES = Object.keys(CATEGORIES) as CategoryKey[];

/**
 * Complaint.category is a free-text column written from the detector's class
 * name, and its case has changed over the life of the data: intake stores what
 * the client sent ('Pothole') and the AI service overwrites it with its own
 * label ('POTHOLE'). Match case-insensitively or half the rows are invisible.
 */
export function categoryOf(label: string | null | undefined): CategoryKey | null {
  if (!label) return null;
  const hit = ALL_CLASSES.find((c) => c.toLowerCase() === label.toLowerCase());
  return hit ? CLASSES[hit].category : null;
}

/** Class names belonging to a category, for building a SQL filter. */
export function classesInCategory(cat: CategoryKey): string[] {
  return ALL_CLASSES.filter((c) => CLASSES[c].category === cat);
}

export function slaHoursOf(cat: CategoryKey): number {
  return CATEGORIES[cat].sla;
}
