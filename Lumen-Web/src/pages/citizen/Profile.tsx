import { useEffect, useState } from "react";
import { UserCircle, Save, AlertTriangle, CheckCircle2, ShieldCheck, Award } from "lucide-react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { PageHeader, Card, Button, Alert, Field, fieldClass, Skeleton, EmptyState } from "../../components/ui";

type Profile = {
  id: string; email: string; fullName: string | null; phoneNumber: string | null;
  role: string; isVerified: boolean; verificationStatus: string; civicScore: number;
  createdAt: string;
};

const VERIFICATION_TONE: Record<string, { cls: string; label: string }> = {
  VERIFIED: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Verified" },
  PENDING: { cls: "bg-amber-50 text-amber-800 ring-amber-200", label: "Pending review" },
  REJECTED: { cls: "bg-red-50 text-red-700 ring-red-200", label: "Rejected" },
  UNVERIFIED: { cls: "bg-slate-100 text-slate-600 ring-slate-200", label: "Not verified" },
};

export function CitizenProfile() {
  const { data, loading, error, reload } = useApi<Profile>("/v1/citizen/profile");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (!data) return;
    setFullName(data.fullName ?? "");
    setPhoneNumber(data.phoneNumber ?? "");
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      await api.patch("/v1/citizen/profile", { fullName, phoneNumber });
      setSaved(true);
      reload();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const header = <PageHeader eyebrow="Services" title="Profile" subtitle="Your details and civic standing." />;

  if (loading) return <>{header}<Skeleton className="h-80 max-w-2xl rounded-2xl" /></>;
  if (error || !data) return <>{header}<EmptyState icon={UserCircle} title="Profile unavailable" hint={error ?? undefined} /></>;

  const v = VERIFICATION_TONE[data.verificationStatus] ?? VERIFICATION_TONE.UNVERIFIED;

  return (
    <>
      {header}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Your details" subtitle="Used when the municipal team needs to reach you">
            <form onSubmit={save} className="space-y-5">
              <Field label="Full name">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} placeholder="e.g. Priya Menon" />
              </Field>
              <Field label="Phone number">
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={fieldClass} placeholder="e.g. 9876543210" />
              </Field>
              <Field label="Email" hint="cannot be changed">
                <input value={data.email} disabled className={`${fieldClass} cursor-not-allowed bg-slate-50 text-slate-500`} />
              </Field>

              {saveError && <Alert tone="danger" icon={AlertTriangle}>{saveError}</Alert>}
              {saved && <Alert tone="success" icon={CheckCircle2}>Profile updated.</Alert>}

              <div className="border-t border-slate-100 pt-5">
                <Button type="submit" busy={saving} icon={Save}>Save changes</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Civic score">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                <Award size={26} />
              </span>
              <div>
                <div className="tnum text-3xl font-bold leading-none text-slate-900">{data.civicScore ?? 0}</div>
                <p className="mt-1.5 text-xs text-slate-500">Earned by reporting issues that get resolved.</p>
              </div>
            </div>
          </Card>

          <Card title="Identity verification">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${v.cls}`}>
              <ShieldCheck size={12} /> {v.label}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {data.verificationStatus === "VERIFIED"
                ? "Your identity is confirmed. Reports you file are treated as verified."
                : "Verifying your identity gives your reports higher trust with the municipal team."}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
