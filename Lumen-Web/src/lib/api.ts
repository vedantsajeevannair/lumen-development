// Single fetch wrapper for the shared LUMEN backend, same-origin via the Vite
// proxy. Mirrors the mobile app's axios client (src/services/api.client.ts):
// a bearer token on every request, and on a 401 one silent refresh followed by
// a replay of the original request.

import { apiUrl, rootUrl } from "./config";
import { expireSession, session, type TokenResponse } from "./session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Endpoints that must never trigger a refresh — refreshing on these would
 *  either loop or fight the action the caller is taking. */
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

async function handle(res: Response) {
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data.message ?? data.error ?? (res.status === 401 ? "Not authenticated." : `Request failed (${res.status})`);
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status);
  }
  return data;
}

function authHeaders(isUpload: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = session.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Let the browser set multipart boundaries itself on uploads.
  if (!isUpload) headers["Content-Type"] = "application/json";
  return headers;
}

// One in-flight refresh shared by every request that 401s at the same time,
// so a burst of parallel calls produces a single rotation rather than a
// stampede that would invalidate each other's tokens.
let refreshInFlight: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) {
    expireSession();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    expireSession();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  const tokens = (await res.json()) as TokenResponse;
  if (!tokens.access_token) {
    expireSession();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  session.save(tokens);
  return tokens.access_token;
}

function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** `root: true` targets a controller mounted at the backend root rather than
 *  under /api — the auth, complaints, storage and analytics controllers shared
 *  with the mobile app. */
export type RequestOptions = { upload?: boolean; root?: boolean };

async function request(
  path: string,
  init: RequestInit,
  opts: RequestOptions = {},
  allowRetry = true,
): Promise<any> {
  const url = opts.root ? rootUrl(path) : apiUrl(path);
  const res = await fetch(url, { ...init, headers: authHeaders(!!opts.upload) });

  if (res.status === 401 && allowRetry && !NO_REFRESH.some((p) => path.startsWith(p))) {
    await refreshAccessToken();
    // Replay once with the new token. A second 401 is a real authorization
    // failure, not an expiry, so it surfaces to the caller.
    return request(path, init, opts, false);
  }

  return handle(res);
}

const body = (v: unknown) => (v === undefined ? undefined : JSON.stringify(v));

export const api = {
  get: (path: string, opts?: RequestOptions) => request(path, { method: "GET" }, opts),
  post: (path: string, data?: unknown, opts?: RequestOptions) =>
    request(path, { method: "POST", body: body(data) }, opts),
  patch: (path: string, data?: unknown, opts?: RequestOptions) =>
    request(path, { method: "PATCH", body: body(data) }, opts),
  del: (path: string, opts?: RequestOptions) => request(path, { method: "DELETE" }, opts),
  upload: (path: string, form: FormData, opts?: RequestOptions) =>
    request(path, { method: "POST", body: form }, { ...opts, upload: true }),
};
