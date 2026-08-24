import { Wrench, HardHat, MapPin, CheckCircle2, Briefcase } from "lucide-react";
import { useApi } from "../lib/useApi";
import { PageHeader, EmptyState, SkeletonCards } from "../components/ui";

type E = {
  id: string; code: string; name: string; status: string; skills: string;
  lat: number; lng: number; resolvedJobs: number;
  department: { name: string }; complaints: { id: string }[];
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  ON_TASK:   { label: "On Task",   cls: "bg-amber-50 text-amber-800 ring-amber-200",       dot: "bg-amber-500" },
  OFF_DUTY:  { label: "Off Duty",  cls: "bg-slate-100 text-slate-500 ring-slate-200",      dot: "bg-slate-400" },
};

export function Engineers() {
  const { data, loading, error } = useApi<{ engineers: E[] }>("/engineers");

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Field" title="Field Engineers" subtitle="Skills and live positions feed the assignment optimiser" />
        <SkeletonCards />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <PageHeader eyebrow="Field" title="Field Engineers" />
        <EmptyState icon={HardHat} title="Engineers view unavailable" hint={error || "This backend does not expose engineer data yet."} />
      </>
    );
  }

  const engineers = data.engineers ?? [];
  const available = engineers.filter((e) => e.status === "AVAILABLE").length;

  return (
    <>
      <PageHeader
        eyebrow="Field"
        title="Field Engineers"
        subtitle={`${engineers.length} engineer${engineers.length === 1 ? "" : "s"} on the roster · ${available} available now — skills and live positions feed the assignment optimiser`}
      />

      {engineers.length === 0 ? (
        <EmptyState icon={HardHat} title="No engineers on the roster" hint="Provision a field engineer to start dispatching work." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {engineers.map((e) => {
            const meta = STATUS_META[e.status] ?? STATUS_META.OFF_DUTY;
            return (
              <article
                key={e.id}
                className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
                      {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold tracking-tight text-slate-900">{e.name}</h2>
                      <p className="truncate text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-600">{e.code}</span> · {e.department?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${meta.cls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </header>

                <div className="mt-4 flex-1">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    <Wrench size={11} /> Damage classes handled
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.skills.split(",").filter(Boolean).map((s) => (
                      <span key={s} className="rounded-lg bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-900">
                      <Briefcase size={12} className="text-slate-400" />
                      <span className="tnum text-lg font-bold leading-none">{e.complaints.length}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-900">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="tnum text-lg font-bold leading-none">{e.resolvedJobs}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      <span className="tnum font-mono text-[10px] font-bold leading-tight text-slate-700">
                        {e.lat?.toFixed(3)}<br />{e.lng?.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">Position</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
