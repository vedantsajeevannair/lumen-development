import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Inbox, X, SlidersHorizontal } from "lucide-react";
import { useSocket } from "../components/SocketProvider";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth";
import { STATUS_LABELS } from "../lib/rbac";
import { ageOf } from "../lib/format";
import { PageHeader, EmptyState, ButtonLink, SkeletonTable, TableWrap, Th, Td, fieldClass } from "../components/ui";
import { StatusBadge, PriorityBadge, SeverityMeter } from "../components/badges";

type Complaint = {
  id: string;
  trackingId: string;
  title: string;
  category: string;
  severity: number | null;
  severityBand: string | null;
  severityPercent: number | null;
  slaStatus: string | null;
  confidence: number | null;
  priority: string;
  status: string;
  createdAt: string;
  reporter: { fullName: string; email: string } | null;
  dispatchRecords: { department: string }[];
};

export function Complaints() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status") ?? "";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  // Filtering is the server's job — /api/complaints accepts status and q. The
  // client used to fetch every complaint and filter in JS, which duplicated the
  // backend's matching rules and would not survive a real dataset.
  const query = new URLSearchParams();
  if (statusFilter) query.set("status", statusFilter);
  if (q) query.set("q", q);
  const qs = query.toString();
  const { data: complaintsData, loading, error, reload } =
    useApi<{ complaints: Complaint[] }>(`/complaints${qs ? `?${qs}` : ""}`);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => reload();
    socket.on("complaint_status_changed", handleUpdate);
    socket.on("complaint_created", handleUpdate);
    return () => {
      socket.off("complaint_status_changed", handleUpdate);
      socket.off("complaint_created", handleUpdate);
    };
  }, [socket, reload]);

  const canCreate = ["SUPERVISOR", "ADMINISTRATOR"].includes(user!.role);

  const setStatus = (s: string) => {
    const p = new URLSearchParams(params);
    if (s) p.set("status", s); else p.delete("status");
    setParams(p);
  };
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams(params);
    if (search) p.set("q", search); else p.delete("q");
    setParams(p);
  };
  const clearAll = () => { setSearch(""); setParams(new URLSearchParams()); };

  const complaints = complaintsData?.complaints ?? [];
  const isFiltered = Boolean(statusFilter || q);

  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-brand-700 text-white shadow-sm"
        : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Complaint Queue"
        subtitle={
          loading
            ? "Loading the queue…"
            : `${complaints.length} complaint${complaints.length === 1 ? "" : "s"}${isFiltered ? " matching your filters" : ""}, ranked by AI severity`
        }
        action={canCreate ? <ButtonLink to="/app/complaints/new" icon={Plus}>New Complaint</ButtonLink> : undefined}
      />

      {/* Toolbar */}
      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={submitSearch} className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or tracking ID…"
              aria-label="Search complaints"
              className={`${fieldClass} py-2 pl-9 pr-3 text-sm`}
            />
          </form>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal size={14} className="mr-0.5 hidden text-slate-400 sm:block" />
            <button onClick={() => setStatus("")} className={pill(!statusFilter)}>All</button>
            {Object.keys(STATUS_LABELS).map((s) => (
              <button key={s} onClick={() => setStatus(statusFilter === s ? "" : s)} className={pill(statusFilter === s)}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {isFiltered && (
            <button
              onClick={clearAll}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={7} cols={6} />
      ) : error ? (
        <EmptyState icon={Inbox} title="Complaints unavailable" hint={error} />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={isFiltered ? "No complaints match those filters" : "The queue is empty"}
          hint={isFiltered ? "Try clearing a filter or broadening your search." : "New citizen reports will appear here as they arrive."}
        />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                <Th>Tracking ID</Th>
                <Th>Complaint</Th>
                <Th>Damage Class</Th>
                <Th>Severity</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Reporter</Th>
                <Th className="text-right">Age</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id} className="group transition hover:bg-brand-50/40">
                  <Td>
                    <Link
                      to={`/app/complaints/${c.id}`}
                      className="font-mono text-xs font-bold text-brand-700 transition group-hover:text-brand-800 hover:underline"
                    >
                      {c.trackingId}
                    </Link>
                  </Td>
                  <Td className="max-w-xs">
                    <Link to={`/app/complaints/${c.id}`} className="block truncate font-semibold text-slate-800 transition hover:text-brand-700">
                      {c.title}
                    </Link>
                    {c.dispatchRecords?.length > 0 && (
                      <span className="text-xs text-slate-500">{c.dispatchRecords[0].department}</span>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {c.category}
                    </span>
                  </Td>
                  <Td>
                    <SeverityMeter score={c.severity} band={c.severityBand} percent={c.severityPercent} compact />
                  </Td>
                  <Td><PriorityBadge priority={c.priority} /></Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td className="text-slate-600">
                    {c.reporter?.fullName ?? <span className="italic text-slate-400">Anonymous</span>}
                  </Td>
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
