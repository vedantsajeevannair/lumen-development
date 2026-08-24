import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./lib/api";
import { session, setSessionExpiredHandler } from "./lib/session";

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
  departmentId: string | null;
};

export type RegisterInput = {
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
};

type AuthCtx = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Citizen self-service signup. Sends an OTP; does not create a session. */
  register: (input: RegisterInput) => Promise<void>;
  /** Completes signup — the backend returns tokens, so this signs the user in. */
  verifyOtp: (email: string, otp: string) => Promise<SessionUser | null>;
  resendOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

/** The backend returns the raw Prisma user; the UI wants a flat session shape.
 *  ADMIN / SUPER_ADMIN both present as ADMINISTRATOR in the operator console. */
function mapUser(dbUser: any): SessionUser | null {
  if (!dbUser) return null;
  const role =
    dbUser.role === "ADMIN" || dbUser.role === "SUPER_ADMIN" ? "ADMINISTRATOR" : dbUser.role;
  return {
    sub: dbUser.id || dbUser.sub,
    email: dbUser.email,
    name: dbUser.fullName || dbUser.name || "",
    role,
    departmentId: dbUser.departmentId || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // api.ts calls this when a refresh fails and the session cannot be renewed.
  // Clearing the user here is what bounces the app back to /auth/login.
  const handleExpired = useCallback(() => setUser(null), []);

  useEffect(() => {
    setSessionExpiredHandler(handleExpired);
    return () => setSessionExpiredHandler(null);
  }, [handleExpired]);

  useEffect(() => {
    // No stored access token means no session to restore. A stale token is
    // fine — api.get transparently refreshes it before this resolves.
    if (!session.getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((d) => setUser(mapUser(d.user)))
      .catch(() => {
        session.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const d = await api.post("/auth/login", { email, password });
    if (!d.access_token) throw new Error("No access token returned.");
    // Persist the refresh token too — without it the session dies silently
    // when the short-lived access token expires.
    session.save(d);
    setUser(mapUser(d.user));
  }

  async function logout() {
    // Hand the refresh token back so the backend can revoke that row rather
    // than leaving it valid until it expires on its own.
    const refreshToken = session.getRefreshToken();
    await api.post("/auth/logout", refreshToken ? { refreshToken } : undefined).catch(() => {});
    session.clear();
    setUser(null);
  }

  // Signup, OTP and password-reset live on the backend's root /auth controller
  // (shared with the mobile app), not under the web-integration /api prefix.
  const ROOT = { root: true } as const;

  async function register(input: RegisterInput) {
    await api.post("/auth/register", input, ROOT);
  }

  async function verifyOtp(email: string, otp: string) {
    const d = await api.post("/auth/verify-otp", { email, otp }, ROOT);
    if (!d?.access_token) throw new Error("Verification did not return a session.");
    session.save(d);
    const mapped = mapUser(d.user);
    setUser(mapped);
    return mapped;
  }

  async function resendOtp(email: string) {
    await api.post("/auth/resend-otp", { email }, ROOT);
  }

  async function forgotPassword(email: string) {
    await api.post("/auth/forgot-password", { email }, ROOT);
  }

  async function resetPassword(email: string, otp: string, newPassword: string) {
    await api.post("/auth/reset-password", { email, otp, newPassword }, ROOT);
  }

  return (
    <Ctx.Provider
      value={{ user, loading, login, logout, register, verifyOtp, resendOtp, forgotPassword, resetPassword }}
    >
      {children}
    </Ctx.Provider>
  );
}
