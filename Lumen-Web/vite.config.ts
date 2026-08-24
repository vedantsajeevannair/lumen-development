import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// When VITE_API_BASE_URL is set, the browser talks to that origin directly and
// this proxy is unused (the backend must allow the dev origin via CORS).
// When it is empty, requests stay same-origin and the dev server proxies them
// to VITE_DEV_PROXY_TARGET — which is also how a reverse-proxied deploy behaves.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: proxyTarget, changeOrigin: true },
        "/uploads": { target: proxyTarget, changeOrigin: true },
      },
    },
  };
});
