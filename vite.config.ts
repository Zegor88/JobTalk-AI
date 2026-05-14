import { remixPWA } from "@remix-pwa/dev";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    !process.env.VITEST ? reactRouter() : null,
    !process.env.VITEST ? remixPWA() : null
  ],
  resolve: {
    alias: {
      "~": "/app",
    },
  },
  test: {
    environment: "jsdom",
  },
});

