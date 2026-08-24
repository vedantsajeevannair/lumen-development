import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const FAQS: [string, string][] = [
  ["How does detection work?", "A citizen's photo is sent to the AI service, which runs a computer-vision model to localise and classify road damage and return an annotated image with bounding boxes and confidences."],
  ["What is the severity score?", "A number from 0 to 100 computed from the detected damage — its area, how many regions, the class and confidence. It automatically sets the complaint's priority and SLA."],
  ["How are duplicates caught?", "Each photo is turned into a CNN embedding; two complaints are merged only if the images are visually similar AND within 150 m and 72 hours of each other."],
  ["Can an engineer fake a repair?", "No. The after-photo is re-analysed and compared to the original; if damage is still present, or the same photo is resubmitted, closure is blocked automatically."],
  ["How are engineers assigned?", "The Hungarian algorithm assigns all open complaints at once, minimising total cost (travel, workload, skill match) — provably better than a greedy nearest-engineer rule."],
  ["What is the tech stack?", "A Vite + React single-page app, talking to the shared LUMEN backend (NestJS + Prisma) that also serves the mobile app, which in turn orchestrates a Python FastAPI computer-vision service."],
];

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Support</p>
      <h1 className="mt-3 text-[36px] font-bold leading-tight tracking-[-0.025em] text-slate-900">
        Frequently Asked Questions
      </h1>

      <div className="mt-10 space-y-3">
        {FAQS.map(([q, a]) => (
          <details
            key={q}
            className="group rounded-2xl border border-slate-200/80 bg-white px-5 shadow-card transition hover:border-slate-300"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 font-semibold text-slate-800 transition group-open:text-brand-700">
              <span className="py-0.5">{q}</span>
              <ChevronDown
                size={18}
                className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 group-open:text-brand-600"
              />
            </summary>
            <p className="pb-5 pr-8 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-slate-50 p-6 text-center">
        <p className="font-semibold text-slate-800">Still have a question?</p>
        <p className="mt-1 text-sm text-slate-600">We're happy to walk a municipality through the platform.</p>
        <Link
          to="/contact"
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
        >
          Get in touch
        </Link>
      </div>
    </div>
  );
}
