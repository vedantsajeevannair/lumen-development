import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, CheckCircle2, Clock, ArrowUpRight, Inbox, PlusCircle } from "lucide-react";
import { useAuth } from "../../auth";
import { useApi } from "../../lib/useApi";
import { useSocket } from "../../components/SocketProvider";
import { fmtDateTime } from "../../lib/format";
import { Card, KpiCard, PageHeader, EmptyState, SkeletonKpis, Skeleton, ButtonLink } from "../../components/ui";
import { StatusBadge, PriorityBadge } from "../../components/badges";

type Complaint = {
  id: string; trackingId: string; title: string; category: string;
  status: string; priority: string; createdAt: string; imageUrl?: string;
};

type Dashboard = {
  total: number;
  resolved: number;
  pending: number;
  statusBreakdown?: { status: string; _count?: { _all: number } }[];
  complaints?: Complaint[];
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function CitizenDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<Dashboard>("/v1/citizen/dashboard");
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => reload();
    socket.on("complaint_status_changed", onUpdate);
    return () => { socket.off("complaint_status_changed", onUpdate); };
  }, [socket, reload]);

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="space-y-3"><Skeleton className="h-7 w-64" /><Skeleton className="h-3 w-80" /></div>
        <SkeletonKpis count={3} />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const header = (
    <PageHeader
      eyebrow="My civic account"
      title={`${greeting()}, ${user?.name?.split(" ")[0] || "there"}`}
      subtitle="Your reports to the municipal corporation, and where each one stands."
      action={<ButtonLink to="/app/me/report" icon={PlusCircle}>Report an Issue</ButtonLink>}
    />
  );

  if (error || !data) {
    return <>{header}<EmptyState icon={Inbox} title="Overview unavailable" hint={error ?? undefined} /></>;
  }

  const total = data.total ?? 0;
  const resolved = data.resolved ?? 0;
  const pending = data.pending ?? 0;
  const recent = (data.complaints ?? []).slice(0, 6);

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Reports Filed" value={total} sub="All time" icon={ClipboardList} tone="brand" />
        <KpiCard
          label="Resolved" value={resolved} sub={total ? `${Math.round((resolved / total) * 100)}% of your reports` : "None yet"}
          icon={CheckCircle2} tone="green" progress={total ? (resolved / total) * 100 : 0}
        />
        <KpiCard
          label="In Progress" value={pending} sub="Awaiting municipal action"
          icon={Clock} tone={pending > 0 ? "amber" : "slate"}
        />
      </div>

      <Card
        title="Your Recent Reports"
        subtitle="Newest first"
        className="mt-6"
        action={<Link to="/app/me/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">View all <ArrowUpRight size={13} /></Link>}
        flush
      >
        {recent.length === 0 ? (
          <div className="px-5 py-4">
            <EmptyState
              icon={Inbox}
              title="You haven't reported anything yet"
              hint="Spotted a pothole, an overflowing bin or a broken streetlight? Report it and track the fix."
              action={<ButtonLink to="/app/me/report" icon={PlusCircle}>Report an Issue</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((c) => (
              <li key={c.id}>
                <Link to={`/app/me/reports/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-brand-50/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{c.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      <span className="font-mono font-semibold text-brand-700">{c.trackingId}</span>
                      {" · "}{c.category}{" · "}{fmtDateTime(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
