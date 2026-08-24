import { Activity, ClipboardList, FileText, Users, Inbox, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useSocket } from "../components/SocketProvider";
import { DonutChart, SimpleBarChart } from "../components/charts";
import { Card, KpiCard, PageHeader, EmptyState, SkeletonKpis, Skeleton, ButtonLink } from "../components/ui";
import { StatusBadge } from "../components/badges";
import { fmtDateTime } from "../lib/format";
import { ROLE_LABELS } from "../lib/rbac";
import { useApi } from "../lib/useApi";

type DashboardData = {
  totalUsers: number;
  totalComplaints: number;
  usersByRole: { _count: { _all: number }; role: string }[];
  complaintsByStatus: { _count: { _all: number }; status: string }[];
  recentAuditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: { fullName: string; email: string };
  }[];
};

type ComplaintSummary = {
  id: string;
  trackingId: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
};

const OPEN_STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "PENDING_REVIEW"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-3 w-80" />
      </div>
      <SkeletonKpis />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-1" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRATOR";
  const { data, loading, error, reload } = useApi<DashboardData | { complaints: ComplaintSummary[] }>(
    isAdmin ? "/dashboard" : "/complaints"
  );
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => reload();
    socket.on("complaint_status_changed", handleUpdate);
    return () => { socket.off("complaint_status_changed", handleUpdate); };
  }, [socket, reload]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState icon={Activity} title="Dashboard unavailable" hint={error ?? "The backend did not return any dashboard data."} />
      </>
    );
  }

  const header = (
    <PageHeader
      eyebrow="LUMEN City Operations"
      title={`${greeting()}, ${user?.name.split(" ")[0] || "there"}`}
      subtitle={`Signed in as ${ROLE_LABELS[user?.role ?? ""] || user?.role || "Staff"} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`}
      action={<ButtonLink to="/app/complaints" variant="secondary" icon={ClipboardList}>View queue</ButtonLink>}
    />
  );

  /* ---------------------------------------------------------------- */
  /* Supervisor / engineer view — built from the complaint list         */
  /* ---------------------------------------------------------------- */
  if (!isAdmin) {
    const complaints = (data as { complaints: ComplaintSummary[] }).complaints ?? [];
    const open = complaints.filter((c) => OPEN_STATUSES.includes(c.status)).length;
    const highPriority = complaints.filter((c) => c.priority === "HIGH" || c.priority === "CRITICAL").length;
    const recent = [...complaints]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 6);

    return (
      <>
        {header}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Complaints" value={complaints.length} sub="Current complaint queue" icon={ClipboardList} tone="brand" />
          <KpiCard
            label="Open Issues" value={open} sub="Pending, assigned or active"
            icon={Activity} tone={open > 0 ? "amber" : "green"}
            progress={complaints.length ? (open / complaints.length) * 100 : 0}
          />
          <KpiCard
            label="High Priority" value={highPriority} sub="High and critical reports"
            icon={Users} tone={highPriority > 0 ? "red" : "green"}
            progress={complaints.length ? (highPriority / complaints.length) * 100 : 0}
          />
          <KpiCard label="Recent Reports" value={recent.length} sub="Newest first, shown below" icon={FileText} tone="slate" />
        </div>

        <Card
          title="Recent Complaints"
          subtitle="Latest reports across your departments"
          className="mt-6"
          action={<Link to="/app/complaints" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">View all <ArrowUpRight size={13} /></Link>}
          flush
        >
          {recent.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState icon={Inbox} title="No complaints yet" hint="New citizen reports will appear here as they arrive." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/app/complaints/${item.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-brand-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-brand-700">{item.trackingId}</span>
                        {" · "}{fmtDateTime(item.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Administrator view                                                */
  /* ---------------------------------------------------------------- */
  const adminData = data as DashboardData;

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "#f59e0b",
    SUBMITTED: "#94a3b8",
    ASSIGNED: "#6366f1",
    IN_PROGRESS: "#0ea5e9",
    PENDING_REVIEW: "#8b5cf6",
    RESOLVED: "#10b981",
    CLOSED: "#10b981",
    REJECTED: "#ef4444",
  };

  const statusData = adminData.complaintsByStatus
    .map((s) => ({
      name: s.status.charAt(0) + s.status.slice(1).toLowerCase().replace(/_/g, " "),
      value: s._count._all,
      color: STATUS_COLOR[s.status] ?? "#3f4ce7",
    }))
    .sort((a, b) => b.value - a.value);

  const roleData = adminData.usersByRole
    .map((r) => ({ label: ROLE_LABELS[r.role] ?? r.role, value: r._count._all }))
    .sort((a, b) => b.value - a.value);

  const open = adminData.complaintsByStatus
    .filter((s) => s.status === "PENDING" || s.status === "ASSIGNED")
    .reduce((acc, s) => acc + s._count._all, 0);

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Complaints" value={adminData.totalComplaints} sub="All time reports" icon={ClipboardList} tone="brand" />
        <KpiCard
          label="Open Issues" value={open} sub="Pending or assigned"
          icon={Activity} tone={open > 0 ? "amber" : "green"}
          progress={adminData.totalComplaints ? (open / adminData.totalComplaints) * 100 : 0}
        />
        <KpiCard label="Total Users" value={adminData.totalUsers} sub="Citizens, staff and admins" icon={Users} tone="slate" />
        <KpiCard label="Audit Events" value={adminData.recentAuditLogs.length} sub="Recent recorded actions" icon={FileText} tone="slate" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card title="Complaints by Status" subtitle="Live distribution across the lifecycle" className="lg:col-span-1">
          {statusData.length === 0
            ? <EmptyState icon={Inbox} title="No complaints yet" />
            : <DonutChart data={statusData} />}
        </Card>
        <Card title="Users by Role" subtitle="Who has access to the platform" className="lg:col-span-2">
          {roleData.length === 0
            ? <EmptyState icon={Users} title="No users found" />
            : <SimpleBarChart data={roleData} horizontal />}
        </Card>
      </div>

      <Card
        title="Recent System Activity"
        subtitle="Every state-changing action, newest first"
        className="mt-6"
        action={<Link to="/app/audit-logs" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">Full audit log <ArrowUpRight size={13} /></Link>}
        flush
      >
        {adminData.recentAuditLogs.length === 0 ? (
          <div className="px-5 py-4"><EmptyState icon={FileText} title="No recent activity" /></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {adminData.recentAuditLogs.map((log) => (
              <li key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 transition hover:bg-slate-50/70">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                  {(log.user?.fullName ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800">
                    <span className="font-semibold">{log.action}</span>
                    <span className="text-slate-400"> on </span>
                    <span className="font-medium">{log.entityType}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {log.user?.fullName} · {fmtDateTime(log.createdAt)}
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
