import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, PlusCircle, Activity, ScanSearch, Image as ImageIcon, Crosshair,
} from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth";
import { useSocket } from "../components/SocketProvider";
import { fmtDateTime, ageOf } from "../lib/format";
import { Card, Button, EmptyState, Skeleton, Alert } from "../components/ui";
import { StatusBadge, PriorityBadge, SeverityMeter } from "../components/badges";

type AiPrediction = {
  damageClass: string;
  confidenceScore: number;
  boundingBoxes: any;
  metadata: any;
};

type TimelineEvent = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Complaint = {
  id: string; trackingId: string; title: string; description: string; category: string;
  latitude: number; longitude: number; status: string; priority: string; createdAt: string;
  severity: number | null; confidence: number | null;
  severityBand: string | null; severityPercent: number | null; slaStatus: string | null;
  imageUrl: string; videoUrl: string | null;
  reporter: { fullName: string } | null;
  aiPrediction: AiPrediction | null;
  timeline: TimelineEvent[];
};

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

/** The API has returned bounding boxes as an array, a JSON string, or a
 *  double-encoded JSON string depending on the pipeline — normalise all three. */
function parseBoxes(raw: unknown): any[] {
  let v = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    try { v = JSON.parse(v); } catch { return []; }
  }
  return Array.isArray(v) ? v : [];
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-3 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-96 max-w-full" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function ComplaintDetail() {
  const { ref } = useParams();
  const { user } = useAuth();
  const { data: complaint, loading, error, reload } = useApi<Complaint>(`/complaints/${ref}`);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !ref) return;

    // Join the specific complaint room to receive targeted updates
    socket.emit("join_complaint", ref);

    const handleUpdate = (update: any) => {
      if (!update?.complaintId || update.complaintId === ref) reload();
    };

    socket.on(`complaint_${ref}_update`, handleUpdate);
    socket.on(`complaint_${ref}_timeline`, handleUpdate);
    socket.on("complaint_status_changed", handleUpdate);

    return () => {
      socket.emit("leave_complaint", ref);
      socket.off(`complaint_${ref}_update`, handleUpdate);
      socket.off(`complaint_${ref}_timeline`, handleUpdate);
      socket.off("complaint_status_changed", handleUpdate);
    };
  }, [socket, ref, reload]);

  if (loading) return <DetailSkeleton />;

  if (error || !complaint) {
    return (
      <>
        <Link to="/app/complaints" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700">
          <ArrowLeft size={15} /> Complaint Queue
        </Link>
        <EmptyState icon={ScanSearch} title="Complaint not found" hint={error || "This complaint may have been merged as a duplicate or removed."} />
      </>
    );
  }

  const c = complaint;
  const isSuperAdmin = ["SUPER_ADMIN", "ADMIN", "ADMINISTRATOR"].includes(user!.role);
  const possibleTransitions = isSuperAdmin ? NEXT_STATUSES[c.status] ?? [] : [];
  const boxes = parseBoxes(c.aiPrediction?.boundingBoxes);

  async function transition(to: string) {
    await api.patch(`/v1/admin/complaints/${c.id}/status`, { status: to });
    reload();
  }

  const transitionVariant = (s: string) =>
    s === "RESOLVED" || s === "CLOSED" ? "primary" : s === "REJECTED" ? "danger" : "secondary";

  return (
    <>
      <Link
        to="/app/complaints"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={15} /> Complaint Queue
      </Link>

      {/* Title block */}
      <div className="mb-7 animate-rise">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-xs font-bold text-brand-700">{c.trackingId}</span>
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
        </div>
        <h1 className="mt-3 max-w-3xl text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{c.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {c.category} · reported {fmtDateTime(c.createdAt)} · <span className="tnum">{ageOf(c.createdAt)}</span> old
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------------------ */}
        {/* Main column                                                   */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Damage Detection"
            subtitle={boxes.length > 0 ? `${boxes.length} region${boxes.length === 1 ? "" : "s"} localised by the vision model` : undefined}
          >
            {c.imageUrl ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Reported photo</p>
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-card">
                    <img src={c.imageUrl} alt="Reported damage" className="w-full object-cover" />
                    {boxes.map((box: any, i: number) => {
                      const xmin = parseFloat(box.xmin) || 0;
                      const ymin = parseFloat(box.ymin) || 0;
                      const xmax = parseFloat(box.xmax) || 0;
                      const ymax = parseFloat(box.ymax) || 0;
                      const conf = (parseFloat(box.confidence) || 0) * 100;
                      return (
                        <div
                          key={i}
                          className="pointer-events-none absolute rounded-[3px] border-2 border-red-500 bg-red-500/15 shadow-[0_0_0_1px_rgba(255,255,255,.5)]"
                          style={{
                            left: `${xmin * 100}%`,
                            top: `${ymin * 100}%`,
                            width: `${(xmax - xmin) * 100}%`,
                            height: `${(ymax - ymin) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-[22px] left-[-2px] whitespace-nowrap rounded-md bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                            {box.class_name || box.label || "Damage"} {conf.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Description</p>
                  <div className="h-full rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
                    {c.description || <span className="italic text-slate-400">No description provided.</span>}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState icon={ImageIcon} title="No photograph on record" hint="This complaint was filed without an image, so no detection was run." />
            )}

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">AI analysis</h3>
              {!c.aiPrediction ? (
                <p className="text-sm text-slate-500">No AI predictions available yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Predicted class</p>
                    <p className="mt-1 font-semibold text-slate-900">{c.aiPrediction.damageClass}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Confidence</p>
                    <p className="tnum mt-1 font-semibold text-slate-900">{(c.aiPrediction.confidenceScore * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Regions</p>
                    <p className="tnum mt-1 font-semibold text-slate-900">{boxes.length} detected</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {possibleTransitions.length > 0 && (
            <Card title="Actions" subtitle="Advance this complaint through its lifecycle">
              <div className="flex flex-wrap gap-2">
                {possibleTransitions.map((statusOption) => (
                  <Button
                    key={statusOption}
                    variant={transitionVariant(statusOption)}
                    onClick={() => transition(statusOption)}
                  >
                    Mark as {statusOption.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Sidebar column                                                */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-6">
          <Card title="Severity Score">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200">
                <span className="tnum text-2xl font-black tracking-tight text-slate-800">{c.severity ?? "—"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <SeverityMeter score={c.severity} band={c.severityBand} percent={c.severityPercent} />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Determined by LUMEN Vision
                </p>
              </div>
            </div>
          </Card>

          <Card title="Location" flush>
            <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="absolute inset-0 opacity-60"
                   style={{ backgroundImage: "linear-gradient(to right,#cbd5e1 1px,transparent 1px),linear-gradient(to bottom,#cbd5e1 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
              <div className="relative flex flex-col items-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift">
                  <MapPin size={20} />
                </span>
                <span className="mt-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                  Approximate position
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 px-5 py-4">
              <Crosshair size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Coordinates</h3>
                <p className="tnum mt-0.5 font-mono text-xs text-slate-500">
                  {c.latitude?.toFixed(6)}, {c.longitude?.toFixed(6)}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Timeline" subtitle="Every recorded state change">
            <ol className="relative space-y-5 border-l border-slate-200 pl-6">
              {/* Creation event */}
              <li className="relative">
                <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-brand-500">
                  <PlusCircle size={12} className="text-brand-600" />
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  Reported by {c.reporter?.fullName ?? "Citizen"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{fmtDateTime(c.createdAt)}</p>
              </li>

              {c.timeline?.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                    <Activity size={12} className="text-slate-500" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900">
                    Status changed to {ev.status.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{fmtDateTime(ev.createdAt)}</p>
                  {ev.notes && <p className="mt-1 text-xs leading-relaxed text-slate-500">{ev.notes}</p>}
                </li>
              ))}
            </ol>

            {(!c.timeline || c.timeline.length === 0) && (
              <div className="mt-4">
                <Alert tone="info">No status changes recorded yet.</Alert>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
