import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

/**
 * Catches a render crash and shows it, instead of a white screen.
 *
 * Every page that has broken in this console failed the same way: it read a
 * field the API did not send, the read threw, React unmounted the whole tree,
 * and the result was a blank page with nothing logged where anyone would look.
 * Assignment, GIS and the complaint detail page each did it, and each survived
 * until someone happened to open the exact page with the exact data.
 *
 * This does not prevent those bugs — only types and guards do that. What it
 * changes is the symptom. A crash now leaves the shell standing, names the
 * error, and offers a way out, so the failure is reportable the first time it
 * happens rather than the tenth.
 *
 * A class component because this is the one thing hooks cannot express: React
 * exposes error catching only through componentDidCatch and
 * getDerivedStateFromError.
 */

type Props = {
  children: ReactNode;
  /** Remounts the subtree when it changes — the route path, so navigating away
   *  from a broken page clears the error rather than trapping the user. */
  resetKey?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // Clear on navigation. Without this, one broken complaint would leave the
    // error showing for every page visited afterwards.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept to the console rather than sent anywhere: there is no error
    // reporting service on this deployment, and inventing one silently would
    // be worse than a stack trace a developer can read on request.
    console.error("[LUMEN] render failed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                This page could not be displayed
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Something in the data for this screen was not what the page
                expected, so it stopped rather than showing you something wrong.
                The rest of the console still works.
              </p>

              <p className="mt-3 break-words rounded-lg bg-white/70 p-3 font-mono text-xs text-slate-700">
                {error.message || String(error)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => this.setState({ error: null })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-800"
                >
                  <RotateCw size={15} /> Try again
                </button>
                <a
                  href="/app/complaints"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={15} /> Back to the queue
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
