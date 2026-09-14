// Single fetch wrapper for the backend REST API.
//
// Same-origin: in development the Vite proxy forwards /api, and in production
// Caddy does, so no absolute base URL is ever needed and no cross-origin
// request is made. Authentication is a bearer token from localStorage, written
// by auth.tsx on login — `credentials: "include"` below is a leftover from the
// cookie-session backend this console was originally written against. It is
// harmless same-origin, and kept so a future cookie-based deployment still
// works without touching every call site.

async function handle(res: Response) {
  if (res.status === 401) throw new ApiError("Not authenticated.", 401);
  const data = await res.json().catch(() => ({}));
  // NestJS puts the reason in `message`; the original backend used `error`.
  // Accept both, and flatten the array form that class-validator produces for
  // a DTO with several failing fields.
  const reason = Array.isArray(data.message)
    ? data.message.join(", ")
    : data.message ?? data.error;
  if (!res.ok) throw new ApiError(reason ?? `Request failed (${res.status})`, res.status);
  return data;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Attach the bearer token, when there is one.
 *
 * The API authenticates with a JWT in an Authorization header. This console was
 * written against a backend that used an HttpOnly session cookie instead, so
 * none of the calls below sent a credential the API recognises and every
 * request after login came back 401 — which presented as a blank console
 * rather than an error, because the shell redirects an unauthenticated user
 * back to the sign-in page.
 *
 * Read at call time rather than captured at module load, so a login later in
 * the same page life is picked up without a reload.
 */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  try {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* private browsing — fall through unauthenticated */
  }
  return headers;
}

export const api = {
  get: (path: string) =>
    fetch(`/api${path}`, { credentials: "include", headers: authHeaders() }).then(handle),
  post: (path: string, body?: unknown) =>
    fetch(`/api${path}`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: body ? JSON.stringify(body) : undefined,
    }).then(handle),
  // No Content-Type: the browser must set it, because only it knows the
  // multipart boundary it generated for this FormData.
  upload: (path: string, form: FormData) =>
    fetch(`/api${path}`, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: form,
    }).then(handle),
};
