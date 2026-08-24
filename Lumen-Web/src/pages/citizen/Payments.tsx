import { useState } from "react";
import { Receipt, CheckCircle2, AlertTriangle, CreditCard, ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { fmtDate, fmtINR } from "../../lib/format";
import { PageHeader, Button, EmptyState, Alert, SkeletonTable, TableWrap, Th, Td, KpiCard } from "../../components/ui";

type Payment = {
  id: string; amount: number; currency: string; status: string;
  type: string; receiptUrl: string | null; transactionId: string | null; createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  REFUNDED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const label = (t: string) => t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function CitizenPayments() {
  const { data, loading, error, reload } = useApi<Payment[] | { payments: Payment[] }>("/v1/citizen/payments");
  const [paying, setPaying] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const bills: Payment[] = Array.isArray(data) ? data : (data?.payments ?? []);
  const pending = bills.filter((b) => b.status === "PENDING");
  const outstanding = pending.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const paidTotal = bills.filter((b) => b.status === "COMPLETED").reduce((s, b) => s + (b.amount ?? 0), 0);

  async function pay(id: string) {
    setPaying(id); setNotice(null);
    try {
      await api.post(`/v1/citizen/payments/${id}/pay`);
      setNotice({ tone: "success", text: "Payment recorded. Your receipt will appear shortly." });
      reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Payment failed." });
    } finally {
      setPaying(null);
    }
  }

  const header = (
    <PageHeader eyebrow="Services" title="Municipal Bills"
      subtitle="Water, electricity and property tax dues raised against your account." />
  );

  if (loading) return <>{header}<SkeletonTable rows={5} cols={5} /></>;
  if (error) return <>{header}<EmptyState icon={Receipt} title="Bills unavailable" hint={error} /></>;

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={fmtINR(outstanding)} sub={`${pending.length} unpaid bill${pending.length === 1 ? "" : "s"}`}
                 icon={Receipt} tone={outstanding > 0 ? "amber" : "green"} />
        <KpiCard label="Paid to date" value={fmtINR(paidTotal)} sub="Across all completed payments" icon={CheckCircle2} tone="green" />
        <KpiCard label="Total Bills" value={bills.length} sub="All time" icon={CreditCard} tone="slate" />
      </div>

      {notice && (
        <div className="mt-5">
          <Alert tone={notice.tone} icon={notice.tone === "success" ? CheckCircle2 : AlertTriangle}>{notice.text}</Alert>
        </div>
      )}

      <div className="mt-6">
        {bills.length === 0 ? (
          <EmptyState icon={Receipt} title="No bills on your account" hint="Municipal dues raised against you will appear here." />
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr>
                  <Th>Bill</Th><Th>Raised</Th><Th className="text-right">Amount</Th>
                  <Th>Status</Th><Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.id} className="transition hover:bg-brand-50/40">
                    <Td>
                      <div className="font-semibold text-slate-800">{label(b.type)}</div>
                      {b.transactionId && <div className="font-mono text-xs text-slate-400">{b.transactionId}</div>}
                    </Td>
                    <Td className="tnum whitespace-nowrap text-slate-500">{fmtDate(b.createdAt)}</Td>
                    <Td className="tnum whitespace-nowrap text-right font-semibold text-slate-900">{fmtINR(b.amount)}</Td>
                    <Td>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                        STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING}`}>{label(b.status)}</span>
                    </Td>
                    <Td className="text-right">
                      {b.status === "PENDING" ? (
                        <Button size="sm" busy={paying === b.id} onClick={() => pay(b.id)} icon={CreditCard}>Pay now</Button>
                      ) : b.receiptUrl ? (
                        <a href={b.receiptUrl} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">
                          Receipt <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </>
  );
}
