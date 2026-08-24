import { Link } from "react-router-dom";
import {
  ScanSearch, Gauge, Copy, ShieldCheck, Route, ArrowRight, CheckCircle2, Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: ScanSearch, title: "Damage Detection", desc: "A citizen's photo is analysed by a computer-vision model that localises and classifies road damage — potholes and crack types — with bounding boxes." },
  { icon: Gauge, title: "Severity Scoring", desc: "Each detection is scored 0–100 from its geometry, automatically setting the complaint's priority and SLA." },
  { icon: Copy, title: "Duplicate Detection", desc: "CNN image embeddings plus geospatial proximity catch two citizens reporting the same defect, and merge them." },
  { icon: ShieldCheck, title: "AI-Verified Closure", desc: "The engineer's after-photo is re-analysed and compared to the before — closure is blocked if the damage remains." },
  { icon: Route, title: "Optimised Assignment", desc: "The Hungarian algorithm assigns every open complaint to the best engineer, minimising total travel and workload." },
];

const STATS: [string, string][] = [
  ["5", "AI-driven pipeline stages"],
  ["4", "road-damage classes detected"],
  ["100%", "state-changing actions audit-logged"],
  ["O(n³)", "optimal assignment algorithm"],
];

const PROOF = [
  "Computer-vision detection on every complaint photo",
  "Severity-driven priority and SLA, no manual guessing",
  "Immutable audit log of every action",
  "Optimised, benchmarked engineer assignment",
];

const STACK: [string, string][] = [
  ["Frontend", "Vite + React SPA (React Router, Tailwind)"],
  ["Backend", "Shared NestJS + Prisma REST API, JWT auth"],
  ["AI Service", "FastAPI + YOLO / OpenCV computer vision"],
];

export function Landing() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 360px at 78% 14%, rgb(85 109 243 / 0.45), transparent 68%)," +
              "radial-gradient(560px 320px at 6% 94%, rgb(6 182 212 / 0.2), transparent 70%)",
          }}
        />
        {/* Soft fade into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white/6" />

        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-6 lg:py-32">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3.5 py-1.5 text-xs font-medium tracking-wide text-brand-100 backdrop-blur">
            <Sparkles size={13} className="text-accent-300" />
            AI-Assisted Civic Infrastructure · Computer Vision + Optimisation
          </p>

          <h1 className="max-w-3xl text-[40px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[54px]">
            Detect road damage from a photo,{" "}
            <span className="bg-gradient-to-r from-accent-300 to-brand-300 bg-clip-text text-transparent">
              fix it accountably
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-brand-100/75">
            LUMEN turns a citizen's photograph into a fully-tracked repair: computer-vision
            damage detection, automatic severity and priority, duplicate consolidation,
            optimised engineer dispatch, and AI-verified closure.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/auth/register"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand-900 shadow-lift transition hover:bg-brand-50"
            >
              Report an Issue
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-6 text-sm font-semibold text-white backdrop-blur transition hover:border-white/35 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-10 sm:grid-cols-4">
            {STATS.map(([n, label]) => (
              <div key={label}>
                <div className="tnum bg-gradient-to-b from-white to-brand-200 bg-clip-text text-[32px] font-bold leading-none tracking-tight text-transparent">
                  {n}
                </div>
                <div className="mt-2 text-sm leading-snug text-brand-200/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pipeline                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">The pipeline</p>
          <h2 className="mt-3 text-[32px] font-bold tracking-[-0.02em] text-slate-900">One intelligent pipeline</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Photo in → detected → scored → de-duplicated → optimally assigned → verified by photo out.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition duration-200 group-hover:bg-brand-700 group-hover:text-white">
                <f.icon size={20} />
              </span>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600">Step {i + 1}</div>
              <h3 className="mt-1.5 font-bold tracking-tight text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Accountability                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Governance</p>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.02em] text-slate-900">
              Accountable by architecture
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Every state-changing action is captured in an immutable audit trail. Closure needs
              a supervisor's approval and passes AI verification first. Role-based access is
              enforced on the server, not just hidden in the UI.
            </p>
            <ul className="mt-7 space-y-3.5">
              {PROOF.map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-card">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Three-tier stack
            </h3>
            <ol className="mt-6 space-y-5">
              {STACK.map(([k, v], i) => (
                <li key={k} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">{k}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-slate-600">{v}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-950 px-8 py-16 text-center text-white">
          <div className="pointer-events-none absolute inset-0 bg-grid" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(500px 260px at 50% 0%, rgb(85 109 243 / 0.4), transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="text-[32px] font-bold tracking-[-0.02em]">Spotted something broken?</h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-brand-100/75">
              Photograph it and we'll do the rest — the model draws the box, scores the severity,
              and routes it to the right engineer. You can track every step.
            </p>
            <Link
              to="/auth/register"
              className="group mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand-900 shadow-lift transition hover:bg-brand-50"
            >
              Report an Issue
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
