import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Landmark, ShieldCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { useAuth } from "../auth";
import { Button, fieldClass, Alert } from "../components/ui";
import { isStaff } from "../lib/rbac";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function VerifyOtp() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  async function submit(code: string) {
    if (code.length !== OTP_LENGTH) return;
    setBusy(true); setError(null);
    try {
      const u = await verifyOtp(email, code);
      // Verification returns a session, so route straight to the right home —
      // staff to the console, everyone else to the citizen portal.
      navigate(isStaff(u?.role) ? "/app/dashboard" : "/app/me", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code wasn't right.");
      setOtp("");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await resendOtp(email);
      setResent(true);
      setTimer(RESEND_SECONDS);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
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

        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-lift">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck size={22} />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Confirm your email</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            We sent a {OTP_LENGTH}-digit code to{" "}
            <span className="font-semibold text-slate-700">{email || "your email"}</span>.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); submit(otp); }}
            className="mt-7 space-y-4"
          >
            <input
              ref={inputRef}
              value={otp}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Verification code"
              maxLength={OTP_LENGTH}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
                setOtp(v);
                if (v.length === OTP_LENGTH) submit(v);   // auto-submit on the last digit
              }}
              className={`${fieldClass} text-center font-mono text-2xl font-bold tracking-[0.5em]`}
              placeholder="······"
            />

            {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}
            {resent && <Alert tone="success">A new code is on its way.</Alert>}

            <Button type="submit" busy={busy} size="lg" className="w-full" disabled={otp.length !== OTP_LENGTH}>
              {busy ? "Verifying…" : "Verify and continue"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            {timer > 0 ? (
              <p className="text-xs text-slate-400">Resend available in {timer}s</p>
            ) : (
              <button onClick={resend} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800">
                <RotateCcw size={12} /> Resend code
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/auth/login" className="font-medium transition hover:text-brand-700">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
