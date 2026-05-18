import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), "..");

await build({
  entryPoints: [resolve(root, "server/handler.js")],
  outfile: resolve(root, "api/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  conditions: ["node", "import", "default"],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  banner: {
    js: "import { createRequire as ___createRequire } from 'module'; const require = ___createRequire(import.meta.url);",
  },
  loader: {
    ".node": "file",
  },
  logLevel: "info",
});
