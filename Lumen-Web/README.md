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
