import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Route, Map, HardHat, ScrollText, Landmark, X,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "../lib/rbac";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, ClipboardList, Route, Map, HardHat, ScrollText,
};

/** Grouping keeps the rail legible as the module list grows. */
const GROUPS: { heading: string; keys: string[] }[] = [
  { heading: "Operations", keys: ["dashboard", "complaints", "assignment"] },
  { heading: "Field", keys: ["gis", "engineers"] },
  { heading: "Governance", keys: ["audit-logs"] },
];

export function Sidebar({ items, roleLabel, open, onClose }: {
  items: NavItem[];
  roleLabel: string;
  open: boolean;
  onClose: () => void;
}) {
  const groups = GROUPS
    .map((g) => ({ heading: g.heading, items: g.keys.map((k) => items.find((i) => i.key === k)).filter(Boolean) as NavItem[] }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-950 text-white transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Faint grid + glow give the dark rail some depth */}
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
          style={{ background: "radial-gradient(420px 200px at 20% 0%, rgb(85 109 243 / 0.28), transparent 70%)" }}
        />

        <div className="relative flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Landmark size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-tight tracking-tight">LUMEN</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300">
              {roleLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-brand-200 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.heading}>
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-300/50">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  return (
                    <NavLink
                      key={item.key}
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150 ${
                          isActive
                            ? "bg-white/12 text-white shadow-sm ring-1 ring-white/10"
                            : "text-brand-100/65 hover:bg-white/6 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400 transition-opacity duration-150 ${
                              isActive ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <Icon size={17} className={isActive ? "text-accent-300" : "text-brand-200/60 group-hover:text-white"} />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-white/10 px-5 py-3.5">
          <div className="text-[11px] font-medium text-brand-200/50">LUMEN Platform v1.0</div>
          <div className="text-[10px] text-brand-300/35">Vite · NestJS · FastAPI</div>
        </div>
      </aside>
    </>
  );
}
