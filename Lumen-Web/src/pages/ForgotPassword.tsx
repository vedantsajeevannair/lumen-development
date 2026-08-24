import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Landmark, KeyRound, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth";
import { Button, Field, fieldClass, Alert } from "../components/ui";

export function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Please enter a valid email address.");
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset code.");
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Matches ResetPasswordDto: 6-digit OTP, password at least 6 characters.
    if (otp.length !== 6) return setError("Enter the 6-digit code from your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await resetPassword(email.trim(), otp, password);
      navigate("/auth/login?reset=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
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
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <KeyRound size={22} />
          </span>

          {step === "request" ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Reset your password</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your email and we'll send you a 6-digit code.
              </p>
              <form onSubmit={sendCode} className="mt-7 space-y-4">
                <Field label="Email" required>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                         autoComplete="email" className={fieldClass} placeholder="you@example.com" />
                </Field>
                {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}
                <Button type="submit" busy={busy} size="lg" className="w-full">
                  {busy ? "Sending…" : "Send reset code"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Enter your new password</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                We sent a code to <span className="font-semibold text-slate-700">{email}</span>.
              </p>
              <form onSubmit={doReset} className="mt-7 space-y-4">
                <Field label="6-digit code" required>
                  <input value={otp} inputMode="numeric" maxLength={6} autoComplete="one-time-code"
                         onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                         className={`${fieldClass} text-center font-mono text-lg font-bold tracking-[0.4em]`} placeholder="······" />
                </Field>
                <Field label="New password" required>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
                         autoComplete="new-password" className={fieldClass} />
                </Field>
                <Field label="Confirm new password" required>
                  <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password"
                         autoComplete="new-password" className={fieldClass} />
                </Field>
                {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}
                <Button type="submit" busy={busy} size="lg" icon={CheckCircle2} className="w-full">
                  {busy ? "Resetting…" : "Reset password"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/auth/login" className="inline-flex items-center gap-1 font-medium transition hover:text-brand-700">
            <ArrowLeft size={12} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
