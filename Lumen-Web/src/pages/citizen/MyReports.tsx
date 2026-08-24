import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, PlusCircle, Search, X } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { useSocket } from "../../components/SocketProvider";
import { STATUS_LABELS } from "../../lib/rbac";
import { ageOf } from "../../lib/format";
import { PageHeader, EmptyState, ButtonLink, SkeletonTable, TableWrap, Th, Td, fieldClass } from "../../components/ui";
import { StatusBadge, PriorityBadge } from "../../components/badges";

type Complaint = {
  id: string; trackingId: string; title: string; category: string;
  status: string; priority: string; createdAt: string; severity: number | null;
};

export function MyReports() {
  const { data, loading, error, reload } = useApi<Complaint[] | { complaints: Complaint[] }>("/v1/citizen/complaints");
  const { socket } = useSocket();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => reload();
    socket.on("complaint_status_changed", onUpdate);
    return () => { socket.off("complaint_status_changed", onUpdate); };
  }, [socket, reload]);

  // The endpoint returns the rows directly; tolerate a wrapped shape too.
  const all: Complaint[] = Array.isArray(data) ? data : (data?.complaints ?? []);

  const rows = all.filter((c) => {
    if (status && c.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.trackingId.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = all.reduce<Record<string, number>>((a, c) => { a[c.status] = (a[c.status] ?? 0) + 1; return a; }, {});
  const filtered = Boolean(status || search);

  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-brand-700 text-white shadow-sm"
             : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900"}`;

  return (
    <>
      <PageHeader
        eyebrow="My civic account"
        title="My Reports"
        subtitle={loading ? "Loading…" : `${rows.length} of ${all.length} report${all.length === 1 ? "" : "s"}`}
        action={<ButtonLink to="/app/me/report" icon={PlusCircle}>Report an Issue</ButtonLink>}
      />

      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or tracking ID…" aria-label="Search my reports"
              className={`${fieldClass} py-2 pl-9 pr-3 text-sm`}
            />
          </div>
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setStatus("")} className={pill(!status)}>All
              <span className={`tnum rounded px-1 text-[10px] ${!status ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{all.length}</span>
            </button>
            {Object.keys(STATUS_LABELS).map((s) => counts[s] ? (
              <button key={s} onClick={() => setStatus(status === s ? "" : s)} className={pill(status === s)}>
                {STATUS_LABELS[s]}
                <span className={`tnum rounded px-1 text-[10px] ${status === s ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[s]}</span>
              </button>
            ) : null)}
          </div>
          {filtered && (
            <button onClick={() => { setStatus(""); setSearch(""); }}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {loading ? <SkeletonTable rows={6} cols={5} />
        : error ? <EmptyState icon={Inbox} title="Could not load your reports" hint={error} />
        : rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filtered ? "No reports match those filters" : "No reports yet"}
            hint={filtered ? "Try clearing a filter." : "Report an issue and it will appear here with live status updates."}
            action={!filtered ? <ButtonLink to="/app/me/report" icon={PlusCircle}>Report an Issue</ButtonLink> : undefined}
          />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <Th>Tracking ID</Th><Th>Report</Th><Th>Category</Th>
                  <Th>Priority</Th><Th>Status</Th><Th className="text-right">Age</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className="group transition hover:bg-brand-50/40">
                    <Td>
                      <Link to={`/app/me/reports/${c.id}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                        {c.trackingId}
                      </Link>
                    </Td>
                    <Td className="max-w-xs">
                      <Link to={`/app/me/reports/${c.id}`} className="block truncate font-semibold text-slate-800 transition hover:text-brand-700">
                        {c.title}
                      </Link>
                    </Td>
                    <Td>
                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{c.category}</span>
                    </Td>
                    <Td><PriorityBadge priority={c.priority} /></Td>
                    <Td><StatusBadge status={c.status} /></Td>
                    <Td className="tnum whitespace-nowrap text-right font-medium text-slate-500">{ageOf(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
    </>
  );
}
