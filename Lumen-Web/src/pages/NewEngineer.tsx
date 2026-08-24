import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { UserPlus, HardHat, ArrowLeft, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth";
import { PageHeader, Card, Button, Alert, Field, fieldClass } from "../components/ui";

export function NewEngineer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deptData } = useApi<{ departments: { id: string; name: string }[] }>("/departments");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user && !["SUPERVISOR", "ADMINISTRATOR"].includes(user.role)) {
    return <Navigate to="/app/engineers" replace />;
  }

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
      navigate("/app/engineers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision engineer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link
        to="/app/engineers"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={15} /> Back to engineers
      </Link>

      <PageHeader
        eyebrow="Field"
        title="Provision Field Engineer"
        subtitle="Onboard a new field worker. They will be assigned a mobile app login."
      />

      <div className="mb-5 max-w-2xl">
        <Alert tone="warning" icon={HardHat} title="HR / Admin task">
          Creating an engineer generates an official employee code and allows them to accept
          dispatches on their mobile app.
        </Alert>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" required>
              <input name="fullName" placeholder="e.g. Rahul Sharma" className={fieldClass} />
            </Field>
            <Field label="Official Email" required>
              <input name="email" type="email" placeholder="rahul@lumen.gov" className={fieldClass} />
            </Field>
          </div>

          <Field label="App Password" required hint="initial credential">
            <input name="password" type="password" placeholder="Initial password for the mobile app" className={fieldClass} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" required>
              <select name="departmentId" className={fieldClass} defaultValue="">
                <option value="" disabled>Select department</option>
                {deptData?.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Certified Skills" required hint="comma separated">
              <input name="skills" placeholder="e.g. Potholes, Paving" className={fieldClass} />
            </Field>
          </div>

          {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" busy={busy} icon={UserPlus} size="lg">
              {busy ? "Provisioning…" : "Provision Engineer"}
            </Button>
            <span className="text-xs text-slate-400">Generates an Employee ID instantly</span>
          </div>
        </form>
      </Card>
    </>
  );
}
