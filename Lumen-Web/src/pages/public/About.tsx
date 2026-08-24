import { ScanSearch, Gauge, Copy, Route, ShieldCheck } from "lucide-react";

const STAGES = [
  { icon: ScanSearch, title: "Damage detection & classification", desc: "YOLO / OpenCV localises the damage and labels its class." },
  { icon: Gauge, title: "Severity scoring", desc: "Detection geometry becomes a 0–100 score that drives priority and SLA." },
  { icon: Copy, title: "Duplicate detection", desc: "Image embeddings plus geolocation merge reports of the same defect." },
  { icon: Route, title: "Optimised engineer assignment", desc: "The Hungarian algorithm matches every open complaint at once." },
  { icon: ShieldCheck, title: "AI-verified repair closure", desc: "Before/after comparison must pass before a case can be closed." },
];

export function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">About</p>
      <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-[-0.025em] text-slate-900">
        About LUMEN
      </h1>

      <div className="mt-7 space-y-5 text-[17px] leading-relaxed text-slate-600">
        <p>
          LUMEN is an AI-assisted civic infrastructure platform. A citizen photographs road
          damage; the platform detects and classifies it with computer vision, scores its
          severity, checks it against existing reports, dispatches the right field engineer, and
          verifies the repair from an after-photo before the case can be closed.
        </p>
        <p>
          It replaces the disconnected spreadsheets and paper registers municipal departments
          use today with one accountable pipeline — where every action is logged and closure
          requires both a supervisor's approval and passing AI verification.
        </p>
      </div>

      <h2 className="mt-16 text-2xl font-bold tracking-[-0.02em] text-slate-900">
        The five pipeline stages
      </h2>

      <ol className="mt-7 space-y-3">
        {STAGES.map((s, i) => (
          <li
            key={s.title}
            className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:shadow-card-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <s.icon size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600">
                  Stage {i + 1}
                </span>
              </div>
              <h3 className="mt-0.5 font-bold tracking-tight text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
