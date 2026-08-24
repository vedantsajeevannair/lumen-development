import { ScanSearch, Gauge, Copy, ShieldCheck, Route, Lock, type LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

const F: { icon: LucideIcon; title: string; items: string[] }[] = [
  { icon: ScanSearch, title: "Computer-Vision Detection", items: [
    "YOLO object detection localises and classifies road damage",
    "Four classes: pothole, longitudinal / transverse / alligator crack",
    "Annotated image with bounding boxes returned per complaint",
  ]},
  { icon: Gauge, title: "Severity & Priority", items: [
    "Score 0–100 from damage area, count and confidence",
    "Automatically sets complaint priority and SLA deadline",
  ]},
  { icon: Copy, title: "Duplicate Detection", items: [
    "512-D CNN image embeddings compared by cosine similarity",
    "Constrained by Haversine distance and a 72-hour window",
    "Merges the same defect reported by different citizens",
  ]},
  { icon: ShieldCheck, title: "AI-Verified Closure", items: [
    "Engineer's after-photo re-analysed and compared to the before",
    "Severity reduction + SSIM decide the verdict",
    "Closure blocked automatically if damage remains",
  ]},
  { icon: Route, title: "Assignment Optimiser", items: [
    "Hungarian algorithm, O(n³), across all open complaints",
    "Minimises travel + workload with skill constraints",
    "Benchmarked against a greedy baseline",
  ]},
  { icon: Lock, title: "Security & Audit", items: [
    "Role-based access enforced on the server",
    "Immutable audit log of every state-changing action",
    "Four-eyes closure approval by a supervisor",
  ]},
];

export function Features() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Capabilities</p>
      <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-[-0.025em] text-slate-900">
        Platform Capabilities
      </h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-slate-600">
        Five AI-driven stages plus enterprise security, on a three-tier stack.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {F.map((f) => (
          <article
            key={f.title}
            className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
                <f.icon size={19} />
              </span>
              <h2 className="font-bold tracking-tight text-slate-900">{f.title}</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {f.items.map((i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  {i}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
