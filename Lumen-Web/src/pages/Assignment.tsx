import { useState } from "react";
import { Link } from "react-router-dom";
import { Route, TrendingDown, CheckCircle2, AlertCircle, Sparkles, Info } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { PageHeader, Card, KpiCard, EmptyState, Button, SkeletonKpis, Skeleton, Th, Td } from "../components/ui";
import { PriorityBadge } from "../components/badges";

type Assignment = {
  complaint: { id: string; ref: string; category: string; severityScore: number };
  engineer: { code: string; name: string; openJobs: number };
  distanceKm: number; cost: number; skillMatch: boolean;
};
type Result = {
  assignments: Assignment[]; unassigned: unknown[];
  totalCost: number; naiveTotalCost: number; costImprovementPct: number;
  totalDistanceKm: number; naiveTotalDistanceKm: number;
};
type Data = { result: Result; titles: Record<string, { title: string; priority: string }>; engineerCount: number };

export function Assignment() {
  const { data, loading, error, reload } = useApi<Data>("/assignment");
  const [applying, setApplying] = useState(false);

  const header = (
    <PageHeader
      eyebrow="Operations"
      title="Assignment Optimiser"
      subtitle="Hungarian algorithm (Kuhn–Munkres) minimising total cost across all open complaints simultaneously"
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <SkeletonKpis />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </>
    );
  }
  if (error || !data) {
    return <>{header}<EmptyState icon={Route} title="Assignment optimiser unavailable" hint={error || "This backend does not expose assignment data yet."} /></>;
  }

  const { result: r, titles, engineerCount } = data;

  async function apply() {
    setApplying(true);
    try { await api.post("/assignment/apply"); reload(); } finally { setApplying(false); }
  }

  const improved = r.costImprovementPct > 0;

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Unassigned" value={r.assignments.length + r.unassigned.length}
          sub={`${engineerCount} engineer${engineerCount === 1 ? "" : "s"} available`} icon={AlertCircle} tone="brand"
        />
        <KpiCard
          label="Optimised Cost" value={r.totalCost.toFixed(2)}
          sub={`Hungarian O(n³) · ${r.totalDistanceKm} km travel`} icon={Route} tone="green"
        />
        <KpiCard
          label="Greedy Baseline" value={r.naiveTotalCost.toFixed(2)}
          sub={`Nearest-free heuristic · ${r.naiveTotalDistanceKm} km`} icon={Route} tone="slate"
        />
        <KpiCard
          label="Cost Reduction" value={improved ? `${r.costImprovementPct}%` : "0%"}
          sub={improved ? "lower objective than baseline" : "baseline already optimal"}
          icon={TrendingDown} tone={improved ? "green" : "slate"}
          progress={improved ? r.costImprovementPct : 0}
        />
      </div>

      {r.assignments.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Sparkles}
            title="No complaints awaiting assignment"
            hint="Create a complaint, or check that submitted complaints are not all flagged as duplicates."
          />
        </div>
      ) : (
        <>
          <Card
            title="Proposed Assignment Plan"
            subtitle={`${r.assignments.length} complaint${r.assignments.length === 1 ? "" : "s"} matched to the globally cheapest engineer`}
            className="mt-6"
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <Th>Complaint</Th>
                    <Th>Priority</Th>
                    <Th>Assigned Engineer</Th>
                    <Th className="text-right">Distance</Th>
                    <Th>Skill</Th>
                    <Th className="text-right">Cost</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.assignments.map((a) => (
                    <tr key={a.complaint.id} className="transition hover:bg-brand-50/40">
                      <Td className="max-w-xs">
                        <Link to={`/app/complaints/${a.complaint.ref}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                          {a.complaint.ref}
                        </Link>
                        <p className="truncate font-medium text-slate-800">{titles[a.complaint.id]?.title}</p>
                        <span className="text-xs text-slate-400">
                          {a.complaint.category} · severity {a.complaint.severityScore.toFixed(1)}
                        </span>
                      </Td>
                      <Td><PriorityBadge priority={titles[a.complaint.id]?.priority ?? "LOW"} /></Td>
                      <Td>
                        <div className="font-semibold text-slate-800">{a.engineer.name}</div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono">{a.engineer.code}</span> · {a.engineer.openJobs} open job{a.engineer.openJobs === 1 ? "" : "s"}
                        </div>
                      </Td>
                      <Td className="tnum whitespace-nowrap text-right font-semibold text-slate-700">{a.distanceKm} km</Td>
                      <Td>
                        {a.skillMatch ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle2 size={12} /> Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                            Penalty
                          </span>
                        )}
                      </Td>
                      <Td className="tnum text-right font-mono text-xs text-slate-500">{a.cost}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4">
              <Button onClick={apply} busy={applying} icon={Sparkles} size="lg">
                {applying ? "Applying…" : `Apply ${r.assignments.length} Assignment${r.assignments.length === 1 ? "" : "s"}`}
              </Button>
              <span className="text-xs text-slate-400">
                Writes each assignment, logs it to the timeline and records the audit entry.
              </span>
            </div>
          </Card>

          <Card title="Cost Model" subtitle="How each (complaint, engineer) pair is priced" className="mt-6">
            <div className="grid gap-6 text-sm lg:grid-cols-2">
              <div>
                <p className="leading-relaxed text-slate-600">
                  Each pair is priced, then the Hungarian algorithm finds the globally
                  minimum-cost matching in O(n³) — not the locally-greedy choice.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 shadow-card">{`cost = travel_km
     + 8   if engineer lacks the damage-class skill
     + 3 × open_jobs        (workload balancing)
     − 12 × severity/100    (urgency rebate)`}</pre>
              </div>
              <div className="space-y-3.5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Info size={14} className="text-brand-600" /> Why compare on cost, not km?
                  </p>
                  <p className="mt-1.5 leading-relaxed text-slate-600">
                    Cost is the objective being minimised — the optimiser will accept a longer
                    drive to reach a skilled, less-loaded engineer. Benchmarked over 300 random
                    batches, it was better or equal every time, never worse.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-800">Infeasible pairs</p>
                  <p className="mt-1.5 leading-relaxed text-slate-600">
                    Off-duty or cross-department pairings are priced at 10⁶ and excluded rather than forced.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
