import { remixPWA } from "@remix-pwa/dev";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Inject all .env vars into process.env so SSR server code (process.env.*) can read them.
  // Vite 6 SSR module runner shares the same process but won't pick these up otherwise.
  const env = loadEnv(mode, process.cwd(), "");
  Object.entries(env).forEach(([key, val]) => {
    if (!(key in process.env)) process.env[key] = val;
  });

  return {
    server: {
      port: 5173,
      strictPort: true,
    },
    plugins: [
      !process.env.VITEST ? reactRouter() : null,
      !process.env.VITEST ? remixPWA() : null,
    ],
    resolve: {
      alias: {
        "~": "/app",
      },
    },
    test: {
      environment: "jsdom",
    },
  };
});

