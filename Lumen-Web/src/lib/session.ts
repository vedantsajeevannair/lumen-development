// Owns the stored session. Kept separate from api.ts and auth.tsx so the fetch
// layer can clear the session on an unrecoverable 401 without importing React,
// and so auth.tsx can react to that without a circular import.

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

/** Shape returned by /api/auth/login and /api/auth/refresh. */
export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  user?: unknown;
};

let onExpired: (() => void) | null = null;

/** Register the callback fired when the session can no longer be renewed. */
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onExpired = fn;
}

export const session = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),

  /** Persist a login or refresh response. Refresh tokens rotate on every use,
   *  so the new one must always replace the old. */
  save(tokens: TokenResponse) {
    if (tokens.access_token) localStorage.setItem(ACCESS_KEY, tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Drop the session and notify the app (used when refresh fails). */
export function expireSession() {
  session.clear();
  onExpired?.();
}
