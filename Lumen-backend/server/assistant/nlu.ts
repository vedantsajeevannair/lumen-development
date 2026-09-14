/**
 * Operations assistant — natural-language understanding.
 *
 * The normalise → extract → classify half of the lumen-platform assistant
 * (lib/assistant.ts lines 1-334), kept as close to verbatim as the move
 * allowed. It is pure text processing with no database access, so it ports
 * without rework; only the status vocabulary changed, because this schema's
 * ComplaintStatus is not the one it was written against.
 *
 * The execution half is NOT here. It queried tables and columns this schema
 * does not have (duplicateOfId, civicCategory, slaHours, priorityScore, a
 * separate Engineer model), so it is rewritten in assistant.service.ts rather
 * than adapted line by line.
 *
 * Worth preserving from the original: this is a grounded query engine, not a
 * language model. Every figure is produced by a query executed after the
 * question is parsed, and the rows come back with the answer so the user can
 * check them. A model only answers when the parser cannot.
 */
import type { CategoryKey } from './taxonomy';

// ---------------------------------------------------------------------------
// Text normalisation and fuzzy matching
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "at", "to", "for",
  "me", "my", "we", "our", "you", "please", "show", "give", "tell", "can", "could",
  "would", "do", "does", "did", "and", "or", "with", "from", "that", "this", "there",
  "it", "be", "have", "has", "had", "i", "am", "any", "all",
  // Currency units — they sit next to numbers and must never be read as
  // domain vocabulary. Amounts are parsed by regex, not by token matching.
  "lakh", "lakhs", "lac", "lacs", "crore", "crores", "rs", "rupees", "inr",
]);

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return normalise(text).split(" ").filter((t) => t && !STOPWORDS.has(t));
}

/**
 * Damerau–Levenshtein (optimal string alignment) distance.
 *
 * Plain Levenshtein is not selective enough here. It scores "hgih" -> "high"
 * and "lakh" -> "leak" both at 2, but only the first is a typo — the second is
 * a different word, and treating it as a match made "5 lakh" filter the query
 * to Water complaints. Counting a transposition as one operation separates
 * them: "hgih" -> "high" is 1, "lakh" -> "leak" stays 2.
 */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Match a token against a vocabulary, tolerating minor misspellings.
 * The tolerance scales with word length — one edit in a short word changes it
 * into a genuinely different word far more often than one edit in a long one.
 */
function fuzzyFind(token: string, vocab: string[]): string | null {
  for (const v of vocab) if (v === token) return v;
  if (token.length < 4) return null;
  // Two edits only for genuinely long words. At seven letters it was enough to
  // turn "weather" into "water", which filed a question about the sky under
  // the Water category and stopped it ever reaching the fallback. One edit
  // still absorbs the real typos ("potohle", "garbge", "drainge").
  const limit = token.length <= 7 ? 1 : 2;
  let best: string | null = null;
  let bestD = limit + 1;
  for (const v of vocab) {
    const d = editDistance(token, v);
    if (d < bestD) { bestD = d; best = v; }
  }
  return bestD <= limit ? best : null;
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES: Record<string, string> = {
  open: "OPEN",
  submitted: "PENDING", new: "PENDING", unassigned: "PENDING", pending: "PENDING",
  review: "PENDING",
  assigned: "ASSIGNED",
  progress: "IN_PROGRESS", ongoing: "IN_PROGRESS",
  resolved: "RESOLVED", done: "RESOLVED", finished: "RESOLVED", fixed: "RESOLVED",
  closed: "CLOSED",
  rejected: "REJECTED", dismissed: "REJECTED",
};
const CATEGORY_WORDS: Record<string, CategoryKey> = {
  road: "ROADS", roads: "ROADS", pothole: "ROADS", potholes: "ROADS", crack: "ROADS",
  waste: "WASTE", garbage: "WASTE", trash: "WASTE", sanitation: "WASTE", bin: "WASTE",
  water: "WATER", manhole: "WATER", drainage: "WATER",
};
const LANDMARK_WORDS: Record<string, string> = {
  hospital: "Hospital", clinic: "Hospital", school: "School", college: "School",
  highway: "Major highway", road: "Major highway",
};

export type Entities = {
  priority?: string;
  status?: string;
  category?: CategoryKey;
  landmark?: string;
  ref?: string;
  limit?: number;
  budget?: number;
  days?: number;
  topic?: string;
};

/** First explainable topic named in the text, if any. */
function topicOf(norm: string): string | null {
  for (const t of norm.split(" ")) {
    const hit = TOPIC_WORDS[t] ?? (t.length >= 4 ? TOPIC_WORDS[fuzzyFind(t, Object.keys(TOPIC_WORDS)) ?? ""] : undefined);
    if (hit) return hit;
  }
  return null;
}

export function extract(text: string): Entities {
  const e: Entities = {};
  const norm = normalise(text);
  const toks = tokens(text);

  const ref = text.toUpperCase().match(/CMP-?\s?(\d{4,6})/);
  if (ref) e.ref = `CMP-${ref[1]}`;

  for (const t of toks) {
    if (!e.priority) {
      const p = fuzzyFind(t, PRIORITIES);
      if (p) { e.priority = p.toUpperCase(); continue; }
    }
    if (!e.status) {
      const s = fuzzyFind(t, Object.keys(STATUSES));
      if (s) { e.status = STATUSES[s]; continue; }
    }
    if (!e.category) {
      const c = fuzzyFind(t, Object.keys(CATEGORY_WORDS));
      if (c) { e.category = CATEGORY_WORDS[c]; continue; }
    }
    if (!e.landmark) {
      const l = LANDMARK_WORDS[t];
      // "road" is a category word too; only treat it as a landmark alongside "near".
      if (l && (t !== "road" || /near|around|close/.test(norm))) e.landmark = l;
    }
  }

  // Allows "top 5", "show the 5 most severe", "list 10", "5 complaints".
  const top =
    norm.match(/(?:top|first|last|show|list|give)\s+(?:me\s+)?(?:the\s+)?(\d{1,3})/) ??
    norm.match(/\b(\d{1,3})\s+(?:most\s+\w+\s+)?complaints?\b/);
  if (top) e.limit = Math.min(50, Math.max(1, parseInt(top[1], 10)));

  // Budget: "5 lakh", "500000", "2.5L", "50k"
  const lakh = norm.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  const kay = norm.match(/(\d+(?:\.\d+)?)\s*k\b/);
  const crore = norm.match(/(\d+(?:\.\d+)?)\s*crore/);
  const plain = norm.match(/(?:rs\.?|budget of|with)\s*(\d{4,9})/);
  if (crore) e.budget = Math.round(parseFloat(crore[1]) * 10_000_000);
  else if (lakh) e.budget = Math.round(parseFloat(lakh[1]) * 100_000);
  else if (kay) e.budget = Math.round(parseFloat(kay[1]) * 1_000);
  else if (plain) e.budget = parseInt(plain[1], 10);

  const days = norm.match(/(\d{1,3})\s*(?:day|days)/);
  if (days) e.days = Math.min(365, parseInt(days[1], 10));
  if (/\bweek\b/.test(norm)) e.days = e.days ?? 7;
  if (/\bmonth\b/.test(norm)) e.days = e.days ?? 30;
  if (/\btoday\b/.test(norm)) e.days = e.days ?? 1;

  const topic = topicOf(norm);
  if (topic) e.topic = topic;

  return e;
}

// ---------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------

export type Intent =
  | "COUNT" | "LIST" | "SLA_BREACH" | "ENGINEER_LOAD" | "BREAKDOWN"
  | "DUPLICATES" | "LOOKUP" | "BUDGET" | "NEAR" | "OVERVIEW"
  | "WHY" | "EXPLAIN" | "HELP" | "UNKNOWN";

/**
 * Topics the assistant can explain about its own workings. Keyed by the words
 * a user would actually type.
 */
const TOPIC_WORDS: Record<string, string> = {
  priority: "priority", priorities: "priority", urgent: "priority", ranking: "priority",
  severity: "severity", score: "severity", scoring: "severity",
  duplicate: "duplicate", duplicates: "duplicate", deduplication: "duplicate",
  sla: "sla", deadline: "sla", target: "sla",
  routing: "routing", routed: "routing", department: "routing", departments: "routing",
  assignment: "assignment", assigned: "assignment", assigning: "assignment", assign: "assignment", optimiser: "assignment", dispatch: "assignment", hungarian: "assignment",
  budget: "budget", knapsack: "budget", planner: "budget", funding: "budget",
  detection: "detection", detect: "detection", model: "detection", yolo: "detection", ai: "detection",
  material: "material", materials: "material", estimate: "material", boq: "material",
  cement: "material", bitumen: "material", quantities: "material", measurement: "material", measurements: "material",
};

/** Weighted cue phrases per intent. Multi-word cues score higher than single
 *  words, so "how many" beats an incidental "many". */
const CUES: Record<Exclude<Intent, "UNKNOWN">, [string, number][]> = {
  COUNT:         [["how many", 5], ["count", 4], ["number of", 4], ["total", 2]],
  LIST:          [["list", 4], ["show", 3], ["which complaints", 5], ["top", 3], ["worst", 4], ["most severe", 5], ["give", 2]],
  SLA_BREACH:    [["sla", 5], ["breach", 5], ["overdue", 5], ["late", 4], ["deadline", 4], ["missed", 3]],
  ENGINEER_LOAD: [["engineer", 4], ["engineers", 4], ["workload", 5], ["who has", 4], ["who is", 3], ["busiest", 5], ["staff", 3], ["crew", 3], ["assigned to", 3], ["team", 3]],
  BREAKDOWN:     [["breakdown", 5], ["by category", 5], ["by department", 5], ["distribution", 4], ["split", 3], ["per category", 5]],
  DUPLICATES:    [["duplicate", 5], ["duplicates", 5], ["repeated", 4], ["same complaint", 4]],
  LOOKUP:        [["status of", 5], ["tell me about", 4], ["details", 3], ["what happened", 4], ["where is", 4], ["where has", 4], ["track", 4], ["my complaint", 3], ["update on", 4]],
  WHY:           [["why", 4], ["still pending", 5], ["still open", 5], ["still not", 5], ["not fixed", 5], ["taking so long", 5], ["delay", 4], ["delayed", 4], ["hold up", 4], ["waiting", 3]],
  EXPLAIN:       [["how is", 3], ["how does", 3], ["how do you", 4], ["how are", 3], ["explain", 5], ["calculated", 4], ["computed", 4], ["formula", 5], ["what is", 2], ["work out", 3], ["decide", 3]],
  BUDGET:        [["budget", 5], ["afford", 5], ["fix with", 5], ["spend", 4], ["cost", 3], ["plan", 3], ["lakh", 4], ["crore", 4]],
  NEAR:          [["near", 4], ["around", 3], ["close to", 4], ["nearby", 4], ["within", 3]],
  OVERVIEW:      [["overview", 5], ["summary", 5], ["how are we", 5], ["how is the city", 5], ["status report", 5], ["dashboard", 3], ["doing", 3]],
  HELP:          [["help", 5], ["what can you", 5], ["how do i use", 5], ["capabilities", 4], ["examples", 3]],
};

/**
 * Cue matchers, compiled once.
 *
 * Two failures to avoid, pulling in opposite directions:
 *   - Bare substring matching made "calculated" contain the SLA cue "late", so
 *     "how is priority calculated" returned the overdue list. Hence the leading
 *     \b — a cue must start at a word boundary, and "calculated" has none
 *     before its "late".
 *   - A bare trailing \b then broke the reverse case: "breach" stopped matching
 *     "breached" and "duplicate" stopped matching "duplicates". Hence the small
 *     closed set of inflectional suffixes, which admits those without admitting
 *     unrelated words ("sla" still does not match "slab").
 */
const CUE_RE: [Intent, RegExp, number][] = (Object.entries(CUES) as [Intent, [string, number][]][])
  .flatMap(([intent, cues]) =>
    cues.map(([cue, weight]) =>
      [
        intent,
        new RegExp(`\\b${cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es|ed|d|ing)?\\b`),
        weight,
      ] as [Intent, RegExp, number],
    ),
  );

export function classify(text: string, e: Entities): { intent: Intent; confidence: number } {
  const norm = normalise(text);
  const scores = new Map<Intent, number>();

  for (const [intent, re, weight] of CUE_RE) {
    if (re.test(norm)) scores.set(intent, (scores.get(intent) ?? 0) + weight);
  }

  // An explain-style question only counts as EXPLAIN if it names something
  // the assistant can actually explain; otherwise "what is the worst one"
  // would be treated as a request for documentation.
  const topic = topicOf(norm);
  if (topic && scores.has("EXPLAIN")) scores.set("EXPLAIN", scores.get("EXPLAIN")! + 6);
  else scores.delete("EXPLAIN");

  // "Why is CMP-10250 pending" is a WHY question about one complaint, not a
  // plain record lookup — WHY needs to outrank the reference bonus below.
  if (scores.has("WHY") && e.ref) scores.set("WHY", scores.get("WHY")! + 5);

  // Entity presence is evidence for particular intents.
  if (e.ref) scores.set("LOOKUP", (scores.get("LOOKUP") ?? 0) + 6);
  if (e.budget) scores.set("BUDGET", (scores.get("BUDGET") ?? 0) + 5);
  if (e.landmark) scores.set("NEAR", (scores.get("NEAR") ?? 0) + 4);

  // "how many ... near the school" is a count, not a list — COUNT outranks NEAR
  // when both fire, but NEAR still contributes its filter downstream.
  if (scores.has("COUNT") && scores.has("NEAR")) scores.set("COUNT", scores.get("COUNT")! + 2);

  // "How many duplicates are there" reads as a COUNT, but the DUPLICATES
  // handler already answers with a count and explains the linking rule, so it
  // is the better response to the same question.
  if (scores.has("DUPLICATES") && scores.has("COUNT")) scores.set("DUPLICATES", scores.get("DUPLICATES")! + 3);

  // People do not call it a "complaint". They ask after their request, issue,
  // case, ticket or report — and often without any reference number, because
  // they do not have it to hand. Any first-person mention of a case is a
  // lookup; the handler then asks for the reference rather than shrugging.
  if (/\b(my|our|the)\s+(complaint|request|issue|case|ticket|report|job|grievance|application)\b/.test(norm)) {
    scores.set("LOOKUP", (scores.get("LOOKUP") ?? 0) + 6);
  }

  // A question that names people is about people, whatever else it contains.
  // "Who is the worst engineer" scores for LIST too, because "worst" is how
  // one asks for the bottom of a complaint ranking — and LIST used to win the
  // tie and answer with complaints. Naming staff is the stronger signal.
  if (scores.has("ENGINEER_LOAD") && /\b(engineers?|staff|crew|team)\b/.test(norm)) {
    scores.set("ENGINEER_LOAD", scores.get("ENGINEER_LOAD")! + 5);
  }

  // "How do you assign engineers" is a question about the method, not about
  // who is busy. When the phrasing plainly asks for an explanation and a known
  // topic is named, EXPLAIN outranks whatever else the nouns matched.
  if (e.topic && /\b(how (do|does|is|are)|explain|what is the (formula|method|algorithm)|why do)\b/.test(norm)) {
    scores.set("EXPLAIN", (scores.get("EXPLAIN") ?? 0) + 7);
  }

  if (scores.size === 0) {
    // A bare filter with no verb ("critical water complaints") is a list request.
    if (e.priority || e.status || e.category) return { intent: "LIST", confidence: 0.5 };
    return { intent: "UNKNOWN", confidence: 0 };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [intent, top] = ranked[0];
  const second = ranked[1]?.[1] ?? 0;
  // Confidence reflects both absolute score and margin over the runner-up.
  const confidence = Math.min(1, (top / 10) * 0.6 + ((top - second) / Math.max(1, top)) * 0.4);
  return { intent, confidence: Math.round(confidence * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

