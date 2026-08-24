// Where the browser sends REST and WebSocket traffic.
//
// The dev server can proxy /api to the backend, which works locally but NOT in
// a built SPA — static hosting has nothing to proxy with. So a deployed build
// must call the backend's absolute origin, and that origin has to be baked in
// at build time (Vite inlines import.meta.env at build, it is not read at runtime).

const trim = (v: string | undefined) => (v ?? "").trim().replace(/\/+$/, "");

/** Absolute backend origin, e.g. https://backend.render.com.
 *  Empty means "same origin" — the dev proxy, or a reverse-proxied deployment. */
export const API_BASE_URL = trim(import.meta.env.VITE_API_BASE_URL);

/** Socket.IO origin. Falls back to the API origin, then to this page's origin. */
export const WS_URL =
  trim(import.meta.env.VITE_WS_URL) || API_BASE_URL || window.location.origin;

/** Full URL for a path under the web-integration prefix (/api/...). */
export const apiUrl = (path: string) => `${API_BASE_URL}/api${path}`;

/** Full URL for a path served at the backend root (/auth/..., /complaints/...,
 *  /analytics/..., /storage/...). Those controllers are shared with the mobile
 *  app and are not mounted under /api. */
export const rootUrl = (path: string) => `${API_BASE_URL}${path}`;

// A production build with no backend origin would silently issue same-origin
// requests that 404 against the static host. Say so loudly instead.
if (import.meta.env.PROD && !API_BASE_URL) {
  console.warn(
    "[LUMEN] VITE_API_BASE_URL was empty at build time. API calls will go to this " +
      "page's own origin, which only works if a reverse proxy forwards /api to the backend.",
  );
}
