import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Landmark, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth";
import { Button, Field, fieldClass, Alert } from "../components/ui";

const DEMO: [string, string][] = [
  ["Administrator", "admin@lumen.gov"],
  ["Supervisor", "supervisor@lumen.gov"],
  ["Field Engineer", "engineer@lumen.gov"],
];

const HIGHLIGHTS = [
  "Computer-vision damage detection on every report",
  "Severity-driven priority and SLA, set automatically",
  "Optimised dispatch and AI-verified closure",
];

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("supervisor@lumen.gov");
  const [password, setPassword] = useState("lumen123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/app/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ---------------------------------------------------------------- */}
      {/* Brand panel                                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(620px 340px at 78% 12%, rgb(85 109 243 / 0.42), transparent 70%)," +
              "radial-gradient(520px 300px at 8% 92%, rgb(6 182 212 / 0.22), transparent 70%)",
          }}
        />

        <Link to="/" className="relative flex items-center gap-2.5 transition hover:opacity-90">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Landmark size={19} />
          </span>
          <span className="text-lg font-bold tracking-tight">LUMEN</span>
        </Link>

        <div className="relative">
          <h1 className="max-w-md text-[34px] font-bold leading-[1.15] tracking-[-0.02em]">
            AI-assisted civic <span className="text-accent-300">damage operations</span>
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-brand-100/70">
            Sign in to detect road damage from photos, dispatch engineers, and verify
            repairs — all from one screen.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-brand-100/85">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-brand-200/60">
          <ShieldCheck size={16} /> Zero-trust access · Every action is audit-logged
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Form panel                                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex w-full items-center justify-center bg-canvas px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-md animate-rise">
          {/* Small-screen brand mark — the panel above is hidden below lg */}
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-card">
              <Landmark size={19} />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">LUMEN</span>
          </Link>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lift">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Staff Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">
              Access is limited to authorized government personnel.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <Field label="Official Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="username"
                  className={fieldClass}
                />
              </Field>
              <Field label="Password">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className={fieldClass}
                />
              </Field>

              {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

              <Button type="submit" busy={busy} size="lg" className="w-full">
                {busy ? "Signing in…" : "Sign in to Command Center"}
                {!busy && <ArrowRight size={16} />}
              </Button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Demo accounts — password <span className="font-mono text-slate-500">lumen123</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO.map(([label, mail]) => (
                  <button
                    key={mail}
                    type="button"
                    onClick={() => { setEmail(mail); setPassword("lumen123"); }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      email === mail
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link to="/" className="font-medium transition hover:text-brand-700">← Back to the public site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
