import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Landmark, AlertTriangle, UserPlus } from "lucide-react";
import { useAuth } from "../auth";
import { Button, Field, fieldClass, Alert } from "../components/ui";

export function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app" replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Mirrors the backend's RegisterDto so the failure is immediate, not a 400.
    if (form.fullName.trim().length < 2) return setError("Please enter your full name.");
    if (form.phoneNumber.trim().length < 10) return setError("Please enter a valid phone number.");
    if (!form.email.includes("@")) return setError("Please enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    setBusy(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(`/auth/verify?email=${encodeURIComponent(form.email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-md animate-rise">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-card">
            <Landmark size={19} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">LUMEN</span>
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lift">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Create your citizen account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Report civic issues and track every step until they're fixed.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Full name" required>
              <input value={form.fullName} onChange={set("fullName")} className={fieldClass} placeholder="e.g. Priya Menon" autoComplete="name" />
            </Field>
            <Field label="Phone number" required>
              <input value={form.phoneNumber} onChange={set("phoneNumber")} className={fieldClass} placeholder="9876543210" autoComplete="tel" />
            </Field>
            <Field label="Email" required>
              <input value={form.email} onChange={set("email")} type="email" className={fieldClass} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" required>
                <input value={form.password} onChange={set("password")} type="password" className={fieldClass} autoComplete="new-password" />
              </Field>
              <Field label="Confirm" required>
                <input value={form.confirm} onChange={set("confirm")} type="password" className={fieldClass} autoComplete="new-password" />
              </Field>
            </div>

            {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

            <Button type="submit" busy={busy} size="lg" icon={UserPlus} className="w-full">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link to="/auth/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/" className="font-medium transition hover:text-brand-700">← Back to the public site</Link>
        </p>
      </div>
    </div>
  );
}
