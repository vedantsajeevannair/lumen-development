import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Landmark, Menu, X, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
              <Landmark size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              LUMEN
              <span className="ml-2 hidden text-xs font-medium text-slate-500 lg:inline">
                Civic Damage Intelligence
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.href}
                to={n.href}
                end={n.href === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth/login"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
            >
              Staff Login
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav className="border-t border-slate-200 bg-white px-5 py-3 md:hidden animate-fade-in">
            {NAV.map((n) => (
              <NavLink
                key={n.href}
                to={n.href}
                end={n.href === "/"}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
                  <Landmark size={17} />
                </span>
                <span className="text-base font-bold tracking-tight text-slate-900">LUMEN</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Turning a citizen's photograph into a fully-tracked, accountable repair.
              </p>
            </div>

            <div className="flex gap-14">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Platform</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link to="/features" className="text-slate-600 transition hover:text-brand-700">Features</Link></li>
                  <li><Link to="/about" className="text-slate-600 transition hover:text-brand-700">About</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Support</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link to="/faq" className="text-slate-600 transition hover:text-brand-700">FAQ</Link></li>
                  <li><Link to="/contact" className="text-slate-600 transition hover:text-brand-700">Contact</Link></li>
                </ul>
              </div>
            </div>

            <Link
              to="/auth/login"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
            >
              Staff Login <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
            © 2026 LUMEN Civic Systems · Vite · NestJS · FastAPI
          </div>
        </div>
      </footer>
    </div>
  );
}
