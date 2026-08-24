import { useState } from "react";
import {
  BarChart3, ClipboardList, Clock, AlertOctagon, Timer, Activity, Users as UsersIcon,
} from "lucide-react";
import { useApi } from "../../lib/useApi";
import { TrendAreaChart, SimpleBarChart, DonutChart } from "../../components/charts";
import { fmtDateTime } from "../../lib/format";
import { ROLE_LABELS } from "../../lib/rbac";
import { PageHeader, Card, KpiCard, EmptyState, SkeletonKpis, Skeleton } from "../../components/ui";

type Dashboard = {
  totalComplaints: number; totalUsers: number; activeEngineers: number;
  resolvedComplaints: number; pendingComplaints: number; avgResolutionHours: number | null;
  complaintsByStatus: { status: string; count: number }[];
  complaintsByPriority: { priority: string; count: number }[];
};
type TrendPoint = { day: string; count: number };
type Department = {
  department: string; total: number; resolved: number; inProgress: number;
  pending: number; completionRate: number;
};
type Sla = { slaBreached: number; criticalPending: number };
type ActivityItem = {
  id: string; type: string; action: string; actor: string; actorRole: string;
  complaintRef?: string; complaintTitle?: string; notes?: string | null; createdAt: string;
};

const DAY_RANGES = [7, 30, 90];

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b", ASSIGNED: "#6366f1", IN_PROGRESS: "#0ea5e9",
  RESOLVED: "#10b981", CLOSED: "#10b981", REJECTED: "#ef4444",
};

const ROOT = { root: true } as const;

export function StaffAnalytics() {
  const [days, setDays] = useState(30);

  // These controllers live at the backend root, not under /api.
  const { data: dash, loading: l1, error: e1 } = useApi<Dashboard>("/analytics/dashboard", ROOT);
  const { data: trend, loading: l2 } = useApi<TrendPoint[]>(`/analytics/trend?days=${days}`, ROOT);
  const { data: depts, loading: l3 } = useApi<Department[]>("/analytics/departments", ROOT);
  const { data: sla } = useApi<Sla>("/analytics/sla", ROOT);
  const { data: activity } = useApi<ActivityItem[]>("/analytics/recent-activity?limit=12", ROOT);

  const header = (
    <PageHeader
      eyebrow="Governance"
      title="Analytics"
      subtitle="Platform-wide performance: throughput, SLA pressure and departmental delivery."
      action={
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {DAY_RANGES.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === d ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      }
    />
  );

  if (l1) {
    return <>{header}<SkeletonKpis /><Skeleton className="mt-6 h-80 rounded-2xl" /></>;
  }
  if (e1 || !dash) {
    return <>{header}<EmptyState icon={BarChart3} title="Analytics unavailable" hint={e1 ?? undefined} /></>;
  }

  const statusData = (dash.complaintsByStatus ?? []).map((s) => ({
    name: s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_/g, " "),
    value: s.count,
    color: STATUS_COLOR[s.status] ?? "#3f4ce7",
  }));

  const trendRows = (trend ?? []).map((p) => ({
    label: new Date(p.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: p.count,
  }));

  const deptRows = (depts ?? []).map((d) => ({ label: d.department, value: d.total }));

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Complaints" value={dash.totalComplaints ?? 0} sub="All time" icon={ClipboardList} tone="brand" />
        <KpiCard
          label="Resolved" value={dash.resolvedComplaints ?? 0}
          sub={dash.totalComplaints ? `${Math.round((dash.resolvedComplaints / dash.totalComplaints) * 100)}% of all reports` : "—"}
          icon={Activity} tone="green"
          progress={dash.totalComplaints ? (dash.resolvedComplaints / dash.totalComplaints) * 100 : 0}
        />
        <KpiCard
          label="Avg Resolution"
          value={dash.avgResolutionHours != null ? `${dash.avgResolutionHours}h` : "—"}
          sub="Report to closure" icon={Timer}
          tone={dash.avgResolutionHours && dash.avgResolutionHours > 48 ? "amber" : "green"}
        />
        <KpiCard label="Active Engineers" value={dash.activeEngineers ?? 0} sub={`${dash.totalUsers ?? 0} accounts total`} icon={UsersIcon} tone="slate" />
      </div>

      {sla && (sla.slaBreached > 0 || sla.criticalPending > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <KpiCard label="SLA Breached" value={sla.slaBreached} sub="Open beyond the 48h deadline"
                   icon={AlertOctagon} tone={sla.slaBreached > 0 ? "red" : "green"} />
          <KpiCard label="Critical Pending" value={sla.criticalPending} sub="Critical priority, not yet started"
                   icon={Clock} tone={sla.criticalPending > 0 ? "amber" : "green"} />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card title={`Complaints per day`} subtitle={`Last ${days} days`} className="lg:col-span-2">
          {l2 ? <Skeleton className="h-64 rounded-xl" />
            : trendRows.length === 0 ? <EmptyState icon={BarChart3} title="No complaints in this window" />
            : <TrendAreaChart data={trendRows} name="Complaints" />}
        </Card>

        <Card title="By Status" subtitle="Current lifecycle distribution">
          {statusData.length === 0 ? <EmptyState icon={BarChart3} title="No complaints yet" /> : <DonutChart data={statusData} />}
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Departmental load" subtitle="Complaints dispatched per department">
          {l3 ? <Skeleton className="h-64 rounded-xl" />
            : deptRows.length === 0 ? <EmptyState icon={BarChart3} title="No dispatch records yet" />
            : <SimpleBarChart data={deptRows} horizontal />}
        </Card>

        <Card title="Completion rate" subtitle="Share resolved, by department" flush>
          {(depts ?? []).length === 0 ? (
            <div className="p-5"><EmptyState icon={BarChart3} title="No departmental data yet" /></div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(depts ?? []).map((d) => (
                <li key={d.department} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-800">{d.department}</span>
                    <span className="tnum text-xs font-bold text-slate-600">{d.completionRate}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                         style={{ width: `${Math.max(2, Math.min(100, d.completionRate))}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {d.resolved} resolved · {d.inProgress} in progress · {d.pending} pending
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent activity" subtitle="Audit entries and complaint transitions, newest first" className="mt-6" flush>
        {(activity ?? []).length === 0 ? (
          <div className="p-5"><EmptyState icon={Activity} title="No recent activity" /></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(activity ?? []).map((a) => (
              <li key={a.id} className="flex items-start gap-3.5 px-5 py-3.5 transition hover:bg-slate-50/70">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                  a.type === "AUDIT" ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"}`}>
                  {(a.actor ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800">
                    <span className="font-semibold">{a.action}</span>
                    {a.complaintRef && <span className="ml-1.5 font-mono text-xs text-brand-700">{a.complaintRef}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {a.actor} · {ROLE_LABELS[a.actorRole] ?? a.actorRole} · {fmtDateTime(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
