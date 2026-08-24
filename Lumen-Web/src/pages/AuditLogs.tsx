import { Lock, ScrollText } from "lucide-react";
import { useApi } from "../lib/useApi";
import { ROLE_LABELS } from "../lib/rbac";
import { fmtDateTime } from "../lib/format";
import { PageHeader, EmptyState, Alert, SkeletonTable, TableWrap, Th, Td } from "../components/ui";

type L = { id: string; createdAt: string; actor: string; actorRole: string; action: string; module: string; details: string };

export function AuditLogs() {
  const { data, loading, error } = useApi<{ logs: L[] }>("/audit-logs");

  const header = (
    <PageHeader
      eyebrow="Governance"
      title="Audit Log Explorer"
      subtitle="Immutable, append-only record of every state-changing action"
    />
  );

  if (loading) return <>{header}<SkeletonTable rows={8} cols={5} /></>;
  if (error || !data) {
    return <>{header}<EmptyState icon={ScrollText} title="Audit log unavailable" hint={error || "This backend does not expose audit log data yet."} /></>;
  }

  const logs = data.logs ?? [];

  return (
    <>
      {header}

      <div className="mb-5">
        <Alert tone="info" icon={Lock}>
          Entries cannot be edited or deleted — retention is enforced at the storage layer per government compliance requirements.
        </Alert>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries yet" hint="Actions taken in the platform will be recorded here." />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                <Th>Timestamp</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Module</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="transition hover:bg-brand-50/40">
                  <Td className="tnum whitespace-nowrap text-xs text-slate-500">{fmtDateTime(l.createdAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                        {(l.actor ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800">{l.actor}</div>
                        <div className="truncate text-xs text-slate-500">{ROLE_LABELS[l.actorRole] ?? l.actorRole}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-100">
                      {l.action}
                    </span>
                  </Td>
                  <Td className="text-slate-600">{l.module}</Td>
                  <Td className="max-w-sm text-slate-600">
                    <span className="line-clamp-2 leading-snug" title={l.details}>{l.details}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}
