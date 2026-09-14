import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./lib/api";

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
  departmentId: string | null;
};

/**
 * The API returns a user row, not a session claim set.
 *
 * This console was written against a backend that set an HttpOnly cookie and
 * echoed a session object shaped { sub, name, departmentId }. The NestJS API
 * returns a JWT in the body and a user row with { id, fullName } and no
 * department. Without this mapping `user.name` is undefined, and the first
 * component to render a set of initials crashes the tree — which showed up as
 * a blank page immediately after a successful login.
 */
function toSessionUser(raw: any): SessionUser | null {
  if (!raw) return null;
  return {
    sub: raw.sub ?? raw.id,
    email: raw.email,
    name: raw.name ?? raw.fullName ?? raw.email,
    role: raw.role,
    departmentId: raw.departmentId ?? null,
  };
}

/**
 * Where the access token lives.
 *
 * lib/api.ts already reads localStorage["token"] on every request — nothing
 * ever wrote it, because the original backend authenticated with a cookie the
 * browser sent automatically. These two functions are the missing half.
 */
const TOKEN_KEY = 'token';
const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing: the session simply will not persist a reload */
  }
};

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip the probe when there is no token: /auth/me would 401, and on a
    // public page that is a guaranteed console error for every visitor.
    let hasToken = false;
    try { hasToken = !!localStorage.getItem(TOKEN_KEY); } catch { /* ignore */ }
    if (!hasToken) { setUser(null); setLoading(false); return; }

    api.get("/auth/me")
      .then((d) => setUser(toSessionUser(d.user)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await api.post("/auth/login", { email, password });
    // access_token, not token — the API uses snake_case here.
    setToken(d.access_token ?? d.accessToken ?? null);
    setUser(toSessionUser(d.user));
  }
  // Sign-up signs you straight in — the server sets the session cookie on the
  // same response, so a new resident never has to type their password twice.
  async function register(name: string, email: string, password: string) {
    // Registration here does not sign you in: the API emails a one-time code
    // and the account stays unverified until it is entered. Returning without
    // a user is correct, and the caller shows the "check your email" state.
    await api.post("/auth/register", { fullName: name, email, password });
  }
  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
