import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { useSocket } from "./SocketProvider";
import { fmtDateTime } from "../lib/format";

type Notice = {
  id: string;
  title: string;
  detail?: string;
  ref?: string;
  at: string;
};

/** Live notification tray fed by the Socket.IO events the backend already
 *  broadcasts. Held in memory only — there is no notifications REST endpoint
 *  yet, so this reflects what arrived while the tab has been open. */
export function NotificationBell({ href }: { href: string }) {
  const { socket } = useSocket();
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const push = (title: string) => (payload: any) => {
      const notice: Notice = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        detail: payload?.title ?? payload?.status ?? undefined,
        ref: payload?.trackingId ?? payload?.complaintId ?? undefined,
        at: new Date().toISOString(),
      };
      setItems((prev) => [notice, ...prev].slice(0, 20));
      setUnread((n) => n + 1);
    };

    const onStatus = push("Complaint status changed");
    const onCreated = push("New complaint filed");
    socket.on("complaint_status_changed", onStatus);
    socket.on("complaint_created", onCreated);
    return () => {
      socket.off("complaint_status_changed", onStatus);
      socket.off("complaint_created", onCreated);
    };
  }, [socket]);

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
        onClick={() => { setOpen((v) => !v); setUnread(0); }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {items.length > 0 && (
              <button onClick={() => setItems([])} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
                <Check size={12} /> Clear
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Nothing yet. Live updates appear here as they happen.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  {n.detail && <p className="mt-0.5 truncate text-xs text-slate-600">{n.detail}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {n.ref ? <span className="font-mono">{n.ref} · </span> : null}
                    {fmtDateTime(n.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Link to={href} onClick={() => setOpen(false)}
                className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-700 transition hover:bg-brand-50">
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
