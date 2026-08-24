import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Page header                                                                 */
/* -------------------------------------------------------------------------- */

export function PageHeader({ title, subtitle, action, eyebrow }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({ title, subtitle, action, children, className = "", bodyClassName = "", flush = false }: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Remove body padding — for tables that should bleed to the card edge. */
  flush?: boolean;
}) {
  const hasHeader = title || action;
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-card ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={flush ? bodyClassName : `p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI card                                                                    */
/* -------------------------------------------------------------------------- */

const KPI_TONES = {
  brand: { chip: "bg-brand-50 text-brand-700", bar: "bg-brand-500" },
  green: { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  amber: { chip: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
  red: { chip: "bg-red-50 text-red-700", bar: "bg-red-500" },
  slate: { chip: "bg-slate-100 text-slate-600", bar: "bg-slate-400" },
} as const;

export type KpiTone = keyof typeof KPI_TONES;

export function KpiCard({ label, value, sub, icon: Icon, tone = "brand", progress }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** 0–100. Renders a thin proportion bar along the bottom of the card. */
  progress?: number;
}) {
  const t = KPI_TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
          <p className="tnum mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-slate-900">{value}</p>
          {sub && <p className="mt-2 truncate text-xs text-slate-500">{sub}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip} transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={18} />
        </span>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${t.bar} transition-[width] duration-500`}
               style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-55";

const BTN_VARIANTS = {
  primary: "bg-brand-700 text-white shadow-sm hover:bg-brand-800 hover:shadow-card-hover active:bg-brand-900",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
} as const;

const BTN_SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-11 px-5",
} as const;

type ButtonProps = {
  variant?: keyof typeof BTN_VARIANTS;
  size?: keyof typeof BTN_SIZES;
  icon?: LucideIcon;
  busy?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Button({
  variant = "primary", size = "md", icon: Icon, busy, className = "", children, ...rest
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  to, variant = "primary", size = "md", icon: Icon, className = "", children,
}: ButtonProps & { to: string }) {
  return (
    <Link to={to} className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}>
      {Icon && <Icon size={16} />}
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

export const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "shadow-sm transition placeholder:text-slate-400 " +
  "hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12";

export function Field({ label, hint, required, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-brand-600">*</span>}
        {hint && <span className="ml-auto text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                      */
/* -------------------------------------------------------------------------- */

const ALERT_TONES = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
} as const;

export function Alert({ tone = "info", icon: Icon, title, children }: {
  tone?: keyof typeof ALERT_TONES;
  icon?: LucideIcon;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${ALERT_TONES[tone]}`}>
      {Icon && <Icon size={17} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

export function EmptyState({ title, hint, icon: Icon, action }: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center animate-fade-in">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon size={22} />
        </span>
      )}
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading skeletons — these replace the old bare "Loading…" text              */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonKpis({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <Skeleton className="h-2.5 w-32" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3 ${c === 1 ? "flex-[2]" : "flex-1"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Full-page loading state for a route that has nothing to show yet. */
export function PageSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <SkeletonKpis />
      <SkeletonTable />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table primitives                                                            */
/* -------------------------------------------------------------------------- */

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 align-middle ${className}`}>{children}</td>;
}
