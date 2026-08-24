import { useState } from "react";
import { BadgeCheck, Upload, AlertTriangle, CheckCircle2, ShieldCheck, ImageIcon, X } from "lucide-react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { PageHeader, Card, Button, Alert, Field, fieldClass, Skeleton } from "../../components/ui";

const DOCUMENT_TYPES = ["AADHAAR", "PASSPORT", "DRIVERS_LICENSE", "VOTER_ID"];

type Profile = { verificationStatus: string; isVerified: boolean };

const STATUS: Record<string, { tone: "success" | "warning" | "danger" | "info"; text: string }> = {
  VERIFIED: { tone: "success", text: "Your identity is verified. Nothing further is needed." },
  PENDING: { tone: "warning", text: "Your documents are under review. This usually takes a couple of working days." },
  REJECTED: { tone: "danger", text: "Your last submission was rejected. Please upload clearer documents and try again." },
  UNVERIFIED: { tone: "info", text: "Verify your identity so the municipal team can treat your reports as trusted." },
};

/** Small labelled image picker — used for both the ID and the selfie. */
function ImageSlot({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  function handle(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    onPick(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label} <span className="text-brand-600">*</span></span>
      <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-7 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
        {preview ? (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(null); setPreview(null); }}
              aria-label={`Remove ${label}`}
              className="absolute right-2.5 top-2.5 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:text-red-600"
            >
              <X size={13} />
            </button>
            <img src={preview} alt={label} className="max-h-40 rounded-lg object-contain shadow-card" />
            <span className="mt-2 text-xs text-slate-500">Click to replace</span>
          </>
        ) : (
          <>
            <ImageIcon size={20} className="mb-2 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Click to upload</span>
          </>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </label>
      {file && <p className="mt-1 truncate text-[11px] text-slate-400">{file.name}</p>}
    </div>
  );
}

export function IdentityVerification() {
  const { data, loading, reload } = useApi<Profile>("/v1/citizen/profile");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const status = data?.verificationStatus ?? "UNVERIFIED";
  const meta = STATUS[status] ?? STATUS.UNVERIFIED;
  const alreadyVerified = status === "VERIFIED";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!idDoc || !selfie) return setError("Both an ID document and a selfie are required.");

    setBusy(true);
    try {
      // Both files go to S3 first; the endpoint stores their URLs, not the bytes.
      const upload = async (f: File) => {
        const fd = new FormData();
        fd.append("file", f);
        const r = await api.upload("/storage/upload", fd, { root: true });
        const url = r?.imageUrl ?? r?.url;
        if (!url) throw new Error("Upload did not return a URL.");
        return url as string;
      };

      const [idDocumentUrl, selfieUrl] = await Promise.all([upload(idDoc), upload(selfie)]);

      await api.post("/v1/citizen/verify-identity", {
        documentType,
        documents: { idDocumentUrl, selfieUrl },
      });

      setDone(true);
      setIdDoc(null); setSelfie(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your documents.");
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <PageHeader eyebrow="Services" title="Identity Verification"
      subtitle="Confirm who you are so your reports carry verified standing." />
  );

  if (loading) return <>{header}<Skeleton className="h-96 max-w-2xl rounded-2xl" /></>;

  return (
    <>
      {header}

      <div className="mb-5 max-w-2xl">
        <Alert tone={meta.tone} icon={ShieldCheck} title={status.replace(/_/g, " ")}>{meta.text}</Alert>
      </div>

      {done && (
        <div className="mb-5 max-w-2xl">
          <Alert tone="success" icon={CheckCircle2} title="Documents submitted">
            We've received them. You'll see the status change here once reviewed.
          </Alert>
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Document type" required>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}
                    disabled={alreadyVerified} className={fieldClass}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageSlot label="ID document" file={idDoc} onPick={setIdDoc} />
            <ImageSlot label="Selfie" file={selfie} onPick={setSelfie} />
          </div>

          {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" busy={busy} icon={alreadyVerified ? BadgeCheck : Upload} size="lg" disabled={alreadyVerified}>
              {alreadyVerified ? "Already verified" : "Submit for verification"}
            </Button>
            {!alreadyVerified && <span className="text-xs text-slate-400">Documents are stored privately and used only for verification.</span>}
          </div>
        </form>
      </Card>
    </>
  );
}
