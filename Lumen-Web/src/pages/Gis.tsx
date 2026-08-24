import { Map as MapIcon } from "lucide-react";
import { useApi } from "../lib/useApi";
import { PageHeader, Card, EmptyState, Skeleton } from "../components/ui";

type C = { id: string; lat: number; lng: number; severityScore: number | null; severityBand: string | null };
type E = { id: string; code: string; lat: number; lng: number };

const BAND: Record<string, string> = {
  SEVERE: "#ef4444",
  SIGNIFICANT: "#f59e0b",
  MODERATE: "#0ea5e9",
  MINOR: "#94a3b8",
  NONE: "#cbd5e1",
};

const LAT0 = 12.9, LAT1 = 13.04, LNG0 = 77.53, LNG1 = 77.69;
const px = (lng: number) => ((lng - LNG0) / (LNG1 - LNG0)) * 880 + 30;
const py = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * 480 + 30;

export function Gis() {
  const { data, loading, error } = useApi<{ complaints: C[]; engineers: E[] }>("/gis");

  const header = (
    <PageHeader eyebrow="Field" title="GIS Map" subtitle="Open complaints sized by CV severity, with engineers on duty" />
  );

  if (loading) return <>{header}<Skeleton className="h-[560px] rounded-2xl" /></>;
  if (error || !data) {
    return <>{header}<EmptyState icon={MapIcon} title="GIS map unavailable" hint={error || "This backend does not expose GIS data yet."} /></>;
  }

  const { complaints, engineers } = data;
  const counts = complaints.reduce<Record<string, number>>((acc, c) => {
    const b = c.severityBand ?? "NONE";
    acc[b] = (acc[b] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        eyebrow="Field"
        title="GIS Map"
        subtitle={`${complaints.length} open complaint${complaints.length === 1 ? "" : "s"} sized by CV severity · ${engineers.length} engineer${engineers.length === 1 ? "" : "s"} on duty`}
      />

      <Card flush className="overflow-hidden">
        <div className="overflow-x-auto p-1.5">
          <svg
            viewBox="0 0 940 540"
            className="min-w-[720px] rounded-xl"
            style={{ background: "linear-gradient(160deg,#f2f6fb 0%,#e8eef6 55%,#e2eaf4 100%)" }}
            role="img"
            aria-label="Map of open complaints and engineer positions"
          >
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.55" />
              </pattern>
              <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#0f172a" floodOpacity="0.22" />
              </filter>
            </defs>

            <rect x="0" y="0" width="940" height="540" fill="url(#grid)" />

            {/* Ward blocks */}
            {[0, 1].map((r) => [0, 1, 2].map((c) => (
              <rect
                key={`${r}${c}`}
                x={30 + c * 293} y={30 + r * 240} width={293} height={240}
                fill="rgb(255 255 255 / 0.35)" stroke="#cbd5e1" strokeDasharray="7 6" strokeWidth={1}
              />
            )))}

            {/* Arterial roads */}
            <path d="M30 300 C 260 250, 620 340, 910 280" stroke="#ffffff" strokeWidth={14} fill="none" strokeLinecap="round" opacity="0.95" />
            <path d="M30 300 C 260 250, 620 340, 910 280" stroke="#e2e8f0" strokeWidth={1} fill="none" strokeDasharray="10 12" />
            <path d="M420 30 C 450 220, 400 380, 470 510" stroke="#ffffff" strokeWidth={11} fill="none" strokeLinecap="round" opacity="0.95" />
            <path d="M420 30 C 450 220, 400 380, 470 510" stroke="#e2e8f0" strokeWidth={1} fill="none" strokeDasharray="10 12" />

            {/* Complaints — radius encodes severity, halo marks the severe ones */}
            {complaints.map((c) => {
              const sev = c.severityScore ?? 0;
              const r = 4 + (sev / 100) * 9;
              const color = BAND[c.severityBand ?? "NONE"];
              return (
                <g key={c.id}>
                  {sev >= 60 && <circle cx={px(c.lng)} cy={py(c.lat)} r={r + 9} fill={color} opacity={0.14} />}
                  {sev >= 60 && <circle cx={px(c.lng)} cy={py(c.lat)} r={r + 4} fill={color} opacity={0.2} />}
                  <circle cx={px(c.lng)} cy={py(c.lat)} r={r} fill={color} stroke="#fff" strokeWidth={1.75} filter="url(#soft)" />
                </g>
              );
            })}

            {/* Engineers */}
            {engineers.map((e) => (
              <g key={e.id} filter="url(#soft)">
                <rect x={px(e.lng) - 7} y={py(e.lat) - 7} width={14} height={14} rx={4} fill="#10b981" stroke="#fff" strokeWidth={2.25} />
                <text x={px(e.lng) + 13} y={py(e.lat) + 4} fontSize={10.5} fill="#334155" fontWeight={700}>{e.code}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-600">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Legend</span>
          {["SEVERE", "SIGNIFICANT", "MODERATE", "MINOR"].map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: BAND[b], boxShadow: "0 0 0 1px rgb(15 23 42 / .08)" }} />
              {b.charAt(0) + b.slice(1).toLowerCase()}
              {counts[b] ? <span className="tnum text-slate-400">({counts[b]})</span> : null}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="h-3 w-3 rounded-sm border-2 border-white bg-emerald-500 shadow" /> Engineer
          </span>
          <span className="ml-auto text-slate-400">Marker radius ∝ severity score</span>
        </div>
      </Card>
    </>
  );
}
