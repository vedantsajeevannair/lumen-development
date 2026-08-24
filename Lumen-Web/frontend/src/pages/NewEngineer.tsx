import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, HardHat } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth";
import { PageHeader, Card } from "../components/ui";

export function NewEngineer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deptData } = useApi<{ departments: { id: string; name: string }[] }>("/departments");
  
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user && !["SUPERVISOR", "ADMINISTRATOR"].includes(user.role)) return <Navigate to="/app/engineers" replace />;

  const input = "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
  const label = "mb-1.5 block text-sm font-medium text-slate-700";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries((form as any).entries());
    
    if (!payload.fullName || !payload.email || !payload.password || !payload.departmentId || !payload.skills) {
      setError("Please fill all required fields.");
      return;
    }
    
    setBusy(true);
    try {
      await api.post("/engineers", payload);
      navigate(`/app/engineers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision engineer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Provision Field Engineer" subtitle="Onboard a new field worker. They will be assigned a mobile app login." />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <HardHat size={17} className="mt-0.5 shrink-0" />
        <div><p className="font-semibold">HR / Admin Task</p><p className="mt-0.5">Creating an engineer generates an official employee code and allows them to accept dispatches on their mobile app.</p></div>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label}>Full Name *</label><input name="fullName" placeholder="e.g. Rahul Sharma" className={input} /></div>
            <div><label className={label}>Official Email *</label><input name="email" type="email" placeholder="rahul@lumen.gov" className={input} /></div>
          </div>
          
          <div>
            <label className={label}>App Password *</label>
            <input name="password" type="password" placeholder="Initial password for the mobile app" className={input} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Department *</label>
              <select name="departmentId" className={input} defaultValue="">
                <option value="" disabled>Select Department</option>
                {deptData?.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Certified Skills *</label>
              <input name="skills" placeholder="e.g. Potholes, Paving" className={input} />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
          
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {busy ? "Provisioning…" : "Provision Engineer"}
            </button>
            <span className="text-xs text-slate-400">Generates an Employee ID instantly</span>
          </div>
        </form>
      </Card>
    </>
  );
}
