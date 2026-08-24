import { useState } from "react";
import { Users as UsersIcon, UserPlus, Trash2, AlertTriangle, CheckCircle2, Search, X, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { fmtDate } from "../../lib/format";
import { ROLE_LABELS } from "../../lib/rbac";
import {
  PageHeader, Card, Button, Alert, Field, fieldClass, EmptyState,
  SkeletonTable, TableWrap, Th, Td, KpiCard,
} from "../../components/ui";

type User = {
  id: string; email: string; fullName: string | null; phoneNumber: string | null;
  role: string; isActive: boolean; isVerified: boolean; verificationStatus: string;
  civicScore: number; createdAt: string;
};

type UsersResponse = { data: User[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const label = (t: string) =>
  t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const BACKEND_ROLES = ["CITIZEN", "DEPARTMENT", "SUPERVISOR", "ENGINEER", "ADMIN", "SUPER_ADMIN"];

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-brand-50 text-brand-700 ring-brand-200",
  SUPER_ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  SUPERVISOR: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  ENGINEER: "bg-amber-50 text-amber-800 ring-amber-200",
  DEPARTMENT: "bg-sky-50 text-sky-800 ring-sky-200",
  CITIZEN: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Users() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<UsersResponse>(`/v1/admin/users?page=${page}`);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const users = data?.data ?? [];
  const meta = data?.meta;

  const rows = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.fullName ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const staffCount = users.filter((u) => u.role !== "CITIZEN").length;
  const verified = users.filter((u) => u.isVerified).length;

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      fullName: String(form.get("fullName") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
      password: String(form.get("password") ?? "") || undefined,
      role: String(form.get("role") ?? "CITIZEN"),
    };
    if (!payload.email) return setNotice({ tone: "danger", text: "An email address is required." });

    setBusy(true);
    try {
      await api.post("/v1/admin/users", payload);
      setNotice({ tone: "success", text: `${payload.email} provisioned.` });
      setCreating(false);
      reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not create the user." });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(u: User, role: string) {
    if (role === u.role) return;
    setPendingRole(u.id); setNotice(null);
    try {
      await api.patch(`/v1/admin/users/${u.id}`, { role });
      setNotice({ tone: "success", text: `${u.email} is now ${ROLE_LABELS[role] ?? role}.` });
      reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not change the role." });
    } finally {
      setPendingRole(null);
    }
  }

  async function remove(u: User) {
    // Soft delete on the backend, but it removes their access — worth confirming.
    if (!window.confirm(`Deactivate ${u.email}? They will lose access immediately.`)) return;
    setNotice(null);
    try {
      await api.del(`/v1/admin/users/${u.id}`);
      setNotice({ tone: "success", text: `${u.email} deactivated.` });
      reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not deactivate the user." });
    }
  }

  const header = (
    <PageHeader
      eyebrow="Governance"
      title="Users"
      subtitle={meta ? `${meta.total} active account${meta.total === 1 ? "" : "s"}` : "Provision staff and manage citizen accounts"}
      action={<Button icon={UserPlus} onClick={() => setCreating((v) => !v)}>{creating ? "Cancel" : "New User"}</Button>}
    />
  );

  if (loading) return <>{header}<SkeletonTable rows={7} cols={5} /></>;
  if (error) return <>{header}<EmptyState icon={UsersIcon} title="Users unavailable" hint={error} /></>;

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Accounts" value={meta?.total ?? users.length} sub="Excluding deactivated" icon={UsersIcon} tone="brand" />
        <KpiCard label="Staff" value={staffCount} sub="On this page" icon={ShieldCheck} tone="slate" />
        <KpiCard label="Verified" value={verified} sub="Identity confirmed" icon={CheckCircle2} tone="green" />
      </div>

      {notice && (
        <div className="mt-5">
          <Alert tone={notice.tone} icon={notice.tone === "success" ? CheckCircle2 : AlertTriangle}>{notice.text}</Alert>
        </div>
      )}

      {creating && (
        <Card title="Provision a user" subtitle="Staff accounts sign in with the password you set here" className="mt-5 max-w-2xl">
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required><input name="email" type="email" placeholder="name@lumen.gov" className={fieldClass} /></Field>
              <Field label="Full name"><input name="fullName" placeholder="e.g. Priya Menon" className={fieldClass} /></Field>
              <Field label="Phone"><input name="phone" placeholder="9876543210" className={fieldClass} /></Field>
              <Field label="Role" required>
                <select name="role" className={fieldClass} defaultValue="ENGINEER">
                  {BACKEND_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Initial password" hint="optional for citizens">
              <input name="password" type="password" placeholder="Set a first-login password" className={fieldClass} />
            </Field>
            <div className="border-t border-slate-100 pt-4">
              <Button type="submit" busy={busy} icon={UserPlus}>Create user</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="my-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users"
                 placeholder="Search name or email…" className={`${fieldClass} py-2 pl-9 pr-8 text-sm`} />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={UsersIcon} title={search ? "No users match" : "No users yet"} hint={search ? "Try a different search." : undefined} />
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr><Th>User</Th><Th>Role</Th><Th>Identity</Th><Th className="text-right">Civic score</Th><Th>Joined</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u) => (
                <tr key={u.id} className="transition hover:bg-brand-50/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                        {(u.fullName ?? u.email).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800">{u.fullName ?? "—"}</div>
                        <div className="truncate text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <select
                      value={u.role} disabled={pendingRole === u.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      aria-label={`Role for ${u.email}`}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-inset transition disabled:opacity-50 ${
                        ROLE_STYLE[u.role] ?? ROLE_STYLE.CITIZEN}`}
                    >
                      {BACKEND_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r.replace(/_/g, " ")}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                      u.isVerified ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                      {u.isVerified ? "Verified" : label(u.verificationStatus ?? "UNVERIFIED")}
                    </span>
                  </Td>
                  <Td className="tnum text-right font-semibold text-slate-700">{u.civicScore ?? 0}</Td>
                  <Td className="tnum whitespace-nowrap text-slate-500">{fmtDate(u.createdAt)}</Td>
                  <Td className="text-right">
                    <button
                      onClick={() => remove(u)} aria-label={`Deactivate ${u.email}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={13} /> Deactivate
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
