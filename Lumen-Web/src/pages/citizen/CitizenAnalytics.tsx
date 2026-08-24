import { useState } from "react";
import { BarChart3, Award, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { MultiLineChart, SimpleBarChart, DonutChart } from "../../components/charts";
import { PageHeader, Card, KpiCard, EmptyState, SkeletonKpis, Skeleton } from "../../components/ui";

type Analytics = {
  civicScore: { current: number };
  overview: {
    totalReports: number; resolvedReports: number; pendingReports: number;
    rejectedReports: number; resolutionRate: number; avgResolutionHours: number | null;
  };
  trend: { labels: string[]; datasets: { submitted: number[]; resolved: number[] } };
  statusBreakdown: { status: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  aiInsights: { totalAiProcessed: number; avgConfidence: number | null };
};

const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b", ASSIGNED: "#6366f1", IN_PROGRESS: "#0ea5e9",
  RESOLVED: "#10b981", CLOSED: "#10b981", REJECTED: "#ef4444",
};

export function CitizenAnalytics() {
  const [range, setRange] = useState("30d");
  const { data, loading, error } = useApi<Analytics>(`/v1/citizen/analytics?range=${range}`);

  const header = (
    <PageHeader
      eyebrow="My civic account"
      title="My Impact"
      subtitle="What your reports have changed, and how quickly the city responded."
      action={
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.key} onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === r.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    />
  );

  if (loading) {
    return <>{header}<SkeletonKpis /><div className="mt-6 grid gap-5 lg:grid-cols-3">
      <Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div></>;
  }
  if (error || !data) {
    return <>{header}<EmptyState icon={BarChart3} title="Analytics unavailable" hint={error ?? undefined} /></>;
  }

  const o = data.overview;
  const trendRows = (data.trend?.labels ?? []).map((label, i) => ({
    label,
    submitted: data.trend.datasets?.submitted?.[i] ?? 0,
    resolved: data.trend.datasets?.resolved?.[i] ?? 0,
  }));

  const statusData = (data.statusBreakdown ?? []).map((s) => ({
    name: s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_/g, " "),
    value: s.count,
    color: STATUS_COLOR[s.status] ?? "#3f4ce7",
  }));

  const categoryData = (data.categoryBreakdown ?? []).map((c) => ({ label: c.category, value: c.count }));

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Civic Score" value={data.civicScore?.current ?? 0} sub="Earned from resolved reports" icon={Award} tone="brand" />
        <KpiCard label="Reports Filed" value={o?.totalReports ?? 0} sub="In this period" icon={BarChart3} tone="slate" />
        <KpiCard
          label="Resolved" value={o?.resolvedReports ?? 0}
          sub={`${o?.resolutionRate ?? 0}% resolution rate`} icon={CheckCircle2} tone="green"
          progress={o?.resolutionRate ?? 0}
        />
        <KpiCard
          label="Avg Resolution" value={o?.avgResolutionHours != null ? `${Math.round(o.avgResolutionHours)}h` : "—"}
          sub="From report to fix" icon={Clock} tone={o?.avgResolutionHours && o.avgResolutionHours > 72 ? "amber" : "green"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card title="Submitted vs Resolved" subtitle="Your reporting over time" className="lg:col-span-2">
          {trendRows.length === 0
            ? <EmptyState icon={BarChart3} title="Not enough history yet" hint="File a report and your trend appears here." />
            : <MultiLineChart data={trendRows} series={[
                { key: "submitted", color: "#3f4ce7", name: "Submitted" },
                { key: "resolved", color: "#10b981", name: "Resolved" },
              ]} />}
        </Card>

        <Card title="By Status">
          {statusData.length === 0
            ? <EmptyState icon={BarChart3} title="No reports yet" />
            : <DonutChart data={statusData} />}
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="What you report most" subtitle="Your reports by damage category">
          {categoryData.length === 0
            ? <EmptyState icon={BarChart3} title="No categories yet" />
            : <SimpleBarChart data={categoryData} horizontal />}
        </Card>

        <Card title="AI analysis" subtitle="How the vision model handled your photos">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Photos analysed</p>
              <p className="tnum mt-1 text-2xl font-bold text-slate-900">{data.aiInsights?.totalAiProcessed ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Avg confidence</p>
              <p className="tnum mt-1 text-2xl font-bold text-slate-900">
                {data.aiInsights?.avgConfidence != null ? `${Math.round(data.aiInsights.avgConfidence * 100)}%` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" />
            Every photo you submit is classified and scored automatically — that score sets the priority and the response deadline.
          </p>
        </Card>
      </div>
    </>
  );
}
