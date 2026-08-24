import { STATUS_LABELS } from "../lib/rbac";

/* Status — a soft tinted pill with a leading dot, so state reads at a glance
   even in a dense table row. */
const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  SUBMITTED:      { pill: "bg-slate-100 text-slate-700 ring-slate-200",     dot: "bg-slate-400" },
  PENDING:        { pill: "bg-slate-100 text-slate-700 ring-slate-200",     dot: "bg-slate-400" },
  ASSIGNED:       { pill: "bg-indigo-50 text-indigo-700 ring-indigo-200",   dot: "bg-indigo-500" },
  IN_PROGRESS:    { pill: "bg-amber-50 text-amber-800 ring-amber-200",      dot: "bg-amber-500" },
  PENDING_REVIEW: { pill: "bg-violet-50 text-violet-700 ring-violet-200",   dot: "bg-violet-500" },
  RESOLVED:       { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  CLOSED:         { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  REJECTED:       { pill: "bg-red-50 text-red-700 ring-red-200",            dot: "bg-red-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.SUBMITTED;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-sky-50 text-sky-800 ring-sky-200",
  HIGH: "bg-amber-50 text-amber-800 ring-amber-200",
  CRITICAL: "bg-red-50 text-red-700 ring-red-200",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.LOW}`}>
      {priority}
    </span>
  );
}

const BAND_COLOR: Record<string, string> = {
  SEVERE: "bg-red-500",
  SIGNIFICANT: "bg-amber-500",
  MODERATE: "bg-sky-500",
  MINOR: "bg-slate-400",
  NONE: "bg-slate-300",
};

const BAND_TEXT: Record<string, string> = {
  SEVERE: "text-red-600",
  SIGNIFICANT: "text-amber-600",
  MODERATE: "text-sky-600",
  MINOR: "text-slate-500",
  NONE: "text-slate-400",
};

/** Severity meter — the score computed by the CV service (Feature 2). */
/** Renders severity exactly as the backend reports it.
 *  `percent` is the server-computed 0-100 fill; `score` is only displayed. */
export function SeverityMeter({ score, band, percent, compact = false }: {
  score: number | null;
  band: string | null;
  percent?: number | null;
  compact?: boolean;
}) {
  const s = score ?? 0;
  const b = band ?? "NONE";
  const fill = percent ?? 0;
  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-1.5"}>
      <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${compact ? "w-20 shrink-0" : "w-full"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${BAND_COLOR[b] ?? BAND_COLOR.NONE}`}
          style={{ width: `${Math.max(2, Math.min(100, fill))}%` }}
        />
      </div>
      <span className={`tnum whitespace-nowrap text-xs font-bold ${compact ? BAND_TEXT[b] ?? BAND_TEXT.NONE : "text-slate-700"}`}>
        {s.toFixed(1)}
        
        {!compact && b !== "NONE" && (
          <span className={`ml-2 text-[11px] font-semibold uppercase tracking-wide ${BAND_TEXT[b] ?? BAND_TEXT.NONE}`}>{b}</span>
        )}
      </span>
    </div>
  );
}

const VERDICT_STYLES: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INCONCLUSIVE: "bg-amber-50 text-amber-800 ring-amber-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.INCONCLUSIVE}`}>
      {verdict}
    </span>
  );
}

export function ModelModeBadge({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const meta: Record<string, { label: string; cls: string; title: string }> = {
    TRAINED: {
      label: "Trained model",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      title: "Predictions from the YOLO model fine-tuned on RDD2022",
    },
    HEURISTIC: {
      label: "Heuristic CV",
      cls: "bg-sky-50 text-sky-800 ring-sky-200",
      title: "Classical OpenCV detector (dark-blob + edge analysis) — not deep learning; the trained model replaces it after train.py",
    },
    FALLBACK: {
      label: "Fallback model",
      cls: "bg-amber-50 text-amber-800 ring-amber-200",
      title: "Pretrained COCO model — generic objects, not road-damage classes",
    },
  };
  const m = meta[mode] ?? meta.FALLBACK;
  return (
    <span
      title={m.title}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset ${m.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {m.label}
    </span>
  );
}
