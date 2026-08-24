import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Upload, ImageIcon, Cpu, AlertTriangle, ArrowLeft, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth";
import { PageHeader, Card, Button, Alert, Field, fieldClass } from "../components/ui";

const ZONES = ["North Zone", "South Zone", "East Zone", "West Zone", "Central Zone"];

export function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: health } = useApi<{ ai: { model_mode: string; note: string } | null }>("/health");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user && !["SUPERVISOR", "ADMINISTRATOR"].includes(user.role)) {
    return <Navigate to="/app/complaints" replace />;
  }

  const ai = health?.ai;

  function handleFileSelect(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(f));
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      inputRef.current.files = dt.files;
    }
  }

  function clearPhoto(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (!(form.get("photo") as File)?.size) { setError("A photograph is required."); return; }
    if (!String(form.get("title")).trim()) { setError("A title is required."); return; }
    setBusy(true);
    try {
      const { ref } = await api.upload("/complaints", form);
      navigate(`/app/complaints/${ref}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create complaint.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link
        to="/app/complaints"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft size={15} /> Back to queue
      </Link>

      <PageHeader
        eyebrow="Operations"
        title="New Complaint"
        subtitle="The photograph drives classification, severity and duplicate detection"
      />

      <div className="mb-5 max-w-2xl">
        {ai === null ? (
          <Alert tone="danger" icon={AlertTriangle} title="AI service is not reachable">
            The LUMEN backend reports the vision service as down. Start the backend and its AI service, then reload.
          </Alert>
        ) : ai?.model_mode === "HEURISTIC" ? (
          <Alert tone="info" icon={Cpu} title="Running the classical-CV heuristic detector">
            Damage is localised with OpenCV — a real detector, but not deep learning. Train the RDD2022 model to swap in YOLO.
          </Alert>
        ) : ai ? (
          <Alert tone="success" icon={Cpu}>{ai.note}</Alert>
        ) : null}
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Photograph of the damage" required>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files?.[0]); }}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition duration-200 ${
                dragging
                  ? "scale-[1.01] border-brand-500 bg-brand-50"
                  : "border-slate-300 bg-slate-50/70 hover:border-brand-400 hover:bg-brand-50/40"
              }`}
            >
              {preview ? (
                <>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    aria-label="Remove photograph"
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm transition hover:bg-white hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                  <img src={preview} alt="Selected damage" className="mb-3 max-h-60 rounded-xl object-contain shadow-card" />
                  <span className="text-xs font-medium text-slate-500">Click or drop to replace</span>
                </>
              ) : (
                <>
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-card">
                    <ImageIcon size={22} />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {dragging ? "Drop the photograph here" : "Drag & drop a photograph, or click to select"}
                  </span>
                  <span className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                    The damage class, severity and priority are all derived from this image
                  </span>
                </>
              )}
              <input
                ref={inputRef} type="file" name="photo" accept="image/*" className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>
          </Field>

          <Field label="Title" required>
            <input name="title" placeholder="e.g. Deep pothole outside the bus stop" className={fieldClass} />
          </Field>

          <Field label="Description" hint="optional">
            <textarea name="description" rows={3} placeholder="What was reported and any access notes…" className={fieldClass} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zone">
              <select name="zone" className={fieldClass}>
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Address / landmark">
              <input name="address" placeholder="e.g. Near 4th Block bus stop" className={fieldClass} />
            </Field>
            <Field label="Latitude">
              <input name="lat" type="number" step="0.0001" defaultValue="12.9716" className={fieldClass} />
            </Field>
            <Field label="Longitude">
              <input name="lng" type="number" step="0.0001" defaultValue="77.5946" className={fieldClass} />
            </Field>
          </div>

          {error && <Alert tone="danger" icon={AlertTriangle}>{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <Button type="submit" busy={busy} icon={Upload} size="lg">
              {busy ? "Analysing image…" : "Analyse & Create Complaint"}
            </Button>
            <span className="text-xs text-slate-400">Runs detection → severity → duplicate check</span>
          </div>
        </form>
      </Card>
    </>
  );
}
