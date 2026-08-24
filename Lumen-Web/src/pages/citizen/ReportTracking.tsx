import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Activity, PlusCircle, MapPin, ScanSearch } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { useSocket } from "../../components/SocketProvider";
import { fmtDateTime, ageOf } from "../../lib/format";
import { Card, EmptyState, Skeleton, Alert } from "../../components/ui";
import { StatusBadge, PriorityBadge, SeverityMeter } from "../../components/badges";
import { STATUS_LABELS } from "../../lib/rbac";

type TimelineEvent = {
  id: string; status: string; notes: string | null; createdAt: string;
  performedBy?: { fullName: string | null; role: string } | null;
};

type Complaint = {
  id: string; trackingId: string; title: string; description: string; category: string;
  status: string; priority: string; createdAt: string; severity: number | null;
  severityBand: string | null; severityPercent: number | null; slaStatus: string | null;
  imageUrl: string; latitude: number | null; longitude: number | null;
};

/** Ordered lifecycle used to render progress, so a citizen can see how far
 *  along their report is rather than just its current label. */
const STAGES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function ReportTracking() {
  const { id } = useParams();
  const { socket } = useSocket();

  // The citizen list already carries the report; tracking returns its timeline.
  const { data: list, loading: loadingList } = useApi<Complaint[] | { complaints: Complaint[] }>("/v1/citizen/complaints");
  const { data: timeline, loading: loadingTimeline, error, reload } =
    useApi<TimelineEvent[]>(id ? `/v1/citizen/complaints/${id}/tracking` : null);

  useEffect(() => {
    if (!socket || !id) return;
    const onUpdate = () => reload();
    socket.on("complaint_status_changed", onUpdate);
    socket.on(`complaint_${id}_timeline`, onUpdate);
    return () => {
      socket.off("complaint_status_changed", onUpdate);
      socket.off(`complaint_${id}_timeline`, onUpdate);
    };
  }, [socket, id, reload]);

  const all: Complaint[] = Array.isArray(list) ? list : (list?.complaints ?? []);
  const c = all.find((x) => x.id === id);
  const events = Array.isArray(timeline) ? timeline : [];

  const back = (
    <Link to="/app/me/reports" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700">
      <ArrowLeft size={15} /> My Reports
    </Link>
  );

  if (loadingList || loadingTimeline) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-96 max-w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !c) {
    return <>{back}<EmptyState icon={ScanSearch} title="Report not found" hint={error} /></>;
  }

  const stageIndex = c ? STAGES.indexOf(c.status) : -1;

  return (
    <>
      {back}

      <div className="mb-7 animate-rise">
        <div className="flex flex-wrap items-center gap-2.5">
          {c && <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-xs font-bold text-brand-700">{c.trackingId}</span>}
          {c && <StatusBadge status={c.status} />}
          {c && <PriorityBadge priority={c.priority} />}
        </div>
        <h1 className="mt-3 max-w-3xl text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
          {c?.title ?? "Report tracking"}
        </h1>
        {c && (
          <p className="mt-1.5 text-sm text-slate-500">
            {c.category} · reported {fmtDateTime(c.createdAt)} · <span className="tnum">{ageOf(c.createdAt)}</span> ago
          </p>
        )}
      </div>

      {/* Progress rail */}
      {stageIndex >= 0 && (
        <Card className="mb-6">
          <ol className="flex flex-wrap items-center gap-y-3">
            {STAGES.map((s, i) => {
              const done = i <= stageIndex;
              return (
                <li key={s} className="flex flex-1 items-center gap-2 min-w-[130px]">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    done ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                  <span className={`text-xs font-semibold ${done ? "text-slate-800" : "text-slate-400"}`}>
                    {STATUS_LABELS[s] ?? s}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span className={`ml-1 hidden h-0.5 flex-1 rounded ${i < stageIndex ? "bg-brand-500" : "bg-slate-200"} sm:block`} />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {c && (
            <Card title="What you reported">
              <div className="grid gap-5 sm:grid-cols-2">
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt="Reported damage" className="w-full rounded-xl border border-slate-200 object-cover shadow-card" />
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-400">
                    No photo on record
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Description</p>
                  <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
                    {c.description || <span className="italic text-slate-400">No description provided.</span>}
                  </p>
                  {(c.latitude != null && c.longitude != null) && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={13} className="text-slate-400" />
                      <span className="tnum font-mono">{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</span>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card title="Progress updates" subtitle="Every recorded change to your report">
            {events.length === 0 ? (
              <Alert tone="info">
                No updates yet. You'll see each step here — and get a live update the moment it changes.
              </Alert>
            ) : (
              <ol className="relative space-y-5 border-l border-slate-200 pl-6">
                {events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-brand-500">
                      <Activity size={12} className="text-brand-600" />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {STATUS_LABELS[ev.status] ?? ev.status.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fmtDateTime(ev.createdAt)}
                      {ev.performedBy?.fullName ? ` · ${ev.performedBy.fullName}` : ""}
                    </p>
                    {ev.notes && <p className="mt-1 text-xs leading-relaxed text-slate-600">{ev.notes}</p>}
                  </li>
                ))}
                <li className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                    <PlusCircle size={12} className="text-slate-500" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900">Report submitted</p>
                  {c && <p className="mt-0.5 text-xs text-slate-500">{fmtDateTime(c.createdAt)}</p>}
                </li>
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {c && (
            <Card title="AI severity assessment">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200">
                  <span className="tnum text-2xl font-black tracking-tight text-slate-800">{c.severity ?? "—"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <SeverityMeter score={c.severity} band={c.severityBand} percent={c.severityPercent} />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Scored automatically from your photo
                  </p>
                </div>
              </div>
            </Card>
          )}
          <Card title="What happens next">
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5"><span className="font-bold text-brand-600">1.</span> Your photo is analysed and the damage classified.</li>
              <li className="flex gap-2.5"><span className="font-bold text-brand-600">2.</span> Severity sets the priority and the response deadline.</li>
              <li className="flex gap-2.5"><span className="font-bold text-brand-600">3.</span> A field engineer is dispatched automatically.</li>
              <li className="flex gap-2.5"><span className="font-bold text-brand-600">4.</span> The repair is verified from an after-photo before closure.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
