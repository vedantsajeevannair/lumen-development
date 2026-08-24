# LUMEN Web — frontend

Vite + React + TypeScript SPA. Tailwind for styling, React Router for routing,
Oxlint for linting.

```bash
npm install
cp .env.example .env      # points at the shared LUMEN backend
npm run dev               # http://localhost:5173
```

Requires the shared backend (`../../Lumen-backend`) to be running — see the
[README one level up](../README.md) for how the two fit together.

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on :5173, proxying `/api` to the backend |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Oxlint |

## Layout

```
src/
├── lib/          api.ts (REST wrapper), socket.ts (Socket.IO), rbac, formatting
├── components/   AppShell, Sidebar, charts, badges, shared UI
├── pages/        one file per route; pages/public/ is the unauthenticated site
├── auth.tsx      auth context — login, logout, current user
└── App.tsx       route table
```

## Pointing at a hosted backend

`VITE_API_BASE_URL` is **inlined at build time** — the built bundle contains the
literal backend URL, so changing it requires a rebuild, not a restart.

```bash
VITE_API_BASE_URL=https://backend.render.com npm run build
```

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend origin the browser calls. Empty = same origin. | `https://backend.render.com` |
| `VITE_DEV_PROXY_TARGET` | Only used when the above is empty: dev-server proxy target. | `http://localhost:3000` |
| `VITE_WS_URL` | Socket.IO origin. Defaults to `VITE_API_BASE_URL`. | *(usually blank)* |

Because the deployed app calls the backend cross-origin, the backend's
`FRONTEND_URL` must list this app's origin or the browser blocks every request
before it arrives. Native mobile builds are unaffected — they send no `Origin`.

Leave `VITE_API_BASE_URL` empty only when something in front of the app
reverse-proxies `/api` to the backend on the same origin.
