import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "../auth";
import { useSocket } from "./SocketProvider";
import { navForRole, ROLE_LABELS } from "../lib/rbac";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "./ui";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/** Live/offline pill driven by the Socket.IO connection. */
function ConnectionPill() {
  const { socket } = useSocket();
  const [online, setOnline] = useState(!!socket?.connected);

  useEffect(() => {
    if (!socket) return setOnline(false);
    setOnline(socket.connected);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    socket.on("connect", on);
    socket.on("disconnect", off);
    return () => { socket.off("connect", on); socket.off("disconnect", off); };
  }, [socket]);

  return (
    <span
      title={online ? "Receiving live complaint updates" : "Not connected to the realtime feed"}
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset sm:inline-flex ${
        online
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "animate-pulse-dot bg-emerald-500" : "bg-slate-400"}`} />
      {online ? "Live" : "Offline"}
    </span>
  );
}

function UserMenu({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white shadow-sm">
          {initials(name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-slate-800">{name}</span>
          <span className="block text-[11px] leading-tight text-slate-500">{role}</span>
        </span>
        <ChevronDown size={15} className={`hidden text-slate-400 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-fade-in"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
            <p className="truncate text-xs text-slate-500">{role}</p>
          </div>
          <button
            onClick={onLogout}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Never leave the drawer open behind a new route on mobile.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64 lg:bg-brand-950" />
        <div className="lg:pl-64">
          <div className="h-16 border-b border-slate-200 bg-white" />
          <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3 w-80" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;

  async function onLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        items={navForRole(user.role)}
        roleLabel={ROLE_LABELS[user.role] ?? user.role}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-500">
              <span className="hidden sm:inline">Lumen City Municipal Corporation · </span>
              <span className="font-semibold text-slate-800">Operational Command Center</span>
            </p>
          </div>

          <ConnectionPill />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <UserMenu name={user.name} role={ROLE_LABELS[user.role] ?? user.role} onLogout={onLogout} />
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
