import { Mail, Building2, Send } from "lucide-react";
import { fieldClass, Field } from "../../components/ui";

export function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Contact</p>
          <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-[-0.025em] text-slate-900">
            Contact Us
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
            For demos or partnership enquiries, reach out and we'll get back to you.
          </p>

          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Mail size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-900">Email</div>
                <div className="text-sm text-slate-600">hello@lumen.gov</div>
              </div>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Building2 size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-900">For municipalities</div>
                <div className="text-sm leading-relaxed text-slate-600">
                  We onboard a department at a time — start with one zone and expand.
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-card">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className={fieldClass} placeholder="e.g. Priya Menon" />
              </Field>
              <Field label="Official email">
                <input className={fieldClass} placeholder="you@municipality.gov" type="email" />
              </Field>
            </div>
            <Field label="Organization / Municipality">
              <input className={fieldClass} placeholder="e.g. Lumen City Municipal Corporation" />
            </Field>
            <Field label="How can we help?">
              <textarea className={`${fieldClass} h-32 resize-y`} placeholder="Tell us about your department and what you'd like to see…" />
            </Field>

            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              <Send size={16} /> Send Message
            </button>
            <p className="text-center text-xs text-slate-400">
              Demo form — submissions are not transmitted in this build.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
