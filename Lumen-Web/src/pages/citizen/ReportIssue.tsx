import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, X, Send, AlertTriangle, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader, Card, Button, Alert, Field, fieldClass } from "../../components/ui";

const CATEGORIES = [
  "Pothole", "Alligator Crack", "Garbage Pile", "Overflowing Bin",
  "Open Manhole", "Street Light", "Water Leak", "Other",
];

type Step = "idle" | "uploading" | "creating";

export function ReportIssue() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  // Kept as strings so the inputs stay controlled whether the user types them
  // or the browser fills them in from geolocation.
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const busy = step !== "idle";

  function pick(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location. Enter coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setAccuracy(pos.coords.accuracy);
        setLocating(false);
      },
      (err) => {
        setError(`Could not get your location: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!file) return setError("A photograph is required — the AI classifies the damage from it.");
    if (!title) return setError("Please give your report a short title.");
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return setError("A location is required. Use “Use my location” or enter coordinates.");
    }

    try {
      // 1. Upload the photo to S3 and get back a durable URL.
      setStep("uploading");
      const fd = new FormData();
      fd.append("file", file);
      const uploaded = await api.upload("/storage/upload", fd, { root: true });
      const imageUrl = uploaded?.imageUrl ?? uploaded?.url;
      if (!imageUrl) throw new Error("Upload succeeded but no image URL was returned.");

      // 2. Create the complaint. Detection, severity and dispatch run server-side.
      setStep("creating");
      const created = await api.post(
        "/complaints",
        {
          title,
          description,
          category,
          imageUrl,
          latitude,
          longitude,
          ...(accuracy ? { accuracy } : {}),
          isAnonymous: form.get("anonymous") === "on",
        },
        { root: true },
      );

      navigate(created?.id ? `/app/me/reports/${created.id}` : "/app/me/reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your report.");
    } finally {
      setStep("idle");
    }
  }

  return (
    <>
      <Link to="/app/me/reports" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700">
        <ArrowLeft size={15} /> My Reports
      </Link>

      <PageHeader
        eyebrow="My civic account"
        title="Report an Issue"
        subtitle="Photograph the problem and we'll classify it, score its severity and dispatch the right team."
      />

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Photograph of the issue" required>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition duration-200 ${
                dragging ? "scale-[1.01] border-brand-500 bg-brand-50"
                         : "border-slate-300 bg-slate-50/70 hover:border-brand-400 hover:bg-brand-50/40"}`}
            >
              {preview ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                    aria-label="Remove photograph"
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:bg-white hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                  <img src={preview} alt="Selected" className="mb-3 max-h-60 rounded-xl object-contain shadow-card" />
                  <span className="text-xs font-medium text-slate-500">Click or drop to replace</span>
                </>
              ) : (
                <>
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-card">
                    <ImageIcon size={22} />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {dragging ? "Drop the photograph here" : "Drag & drop a photo, or click to select"}
                  </span>
                  <span className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                    The damage class, severity and priority are all derived from this image
                  </span>
                </>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          </Field>

          <Field label="Title" required>
            <input name="title" placeholder="e.g. Deep pothole outside the bus stop" className={fieldClass} />
          </Field>

          <Field label="What's wrong?" hint="optional">
            <textarea name="description" rows={3} placeholder="Anything that helps the crew find and fix it…" className={fieldClass} />
          </Field>

          <Field label="Category">
            <select name="category" className={fieldClass} defaultValue={CATEGORIES[0]}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Location <span className="text-brand-600">*</span></span>
              <button
                type="button" onClick={useMyLocation} disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
              >
                {locating ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                {locating ? "Locating…" : "Use my location"}
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input name="lat" type="number" step="0.000001" placeholder="Latitude"
                     value={lat} onChange={(e) => setLat(e.target.value)} className={fieldClass} />
              <input name="lng" type="number" step="0.000001" placeholder="Longitude"
                     value={lng} onChange={(e) => setLng(e.target.value)} className={fieldClass} />
            </div>
            {accuracy != null && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 size={12} /> Located to within {Math.round(accuracy)} m
              </p>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input type="checkbox" name="anonymous" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            Report anonymously
          </label>

          {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" busy={busy} icon={Send} size="lg">
              {step === "uploading" ? "Uploading photo…" : step === "creating" ? "Submitting…" : "Submit Report"}
            </Button>
            <span className="text-xs text-slate-400">Upload → detection → severity → dispatch</span>
          </div>
        </form>
      </Card>
    </>
  );
}
