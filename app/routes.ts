import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/archive", "routes/archive.tsx"),
  route("/search", "routes/search.tsx"),
  route("/settings", "routes/settings.tsx"),
  route("/thread/:threadId", "routes/thread.$threadId.tsx"),
  route("/api/sync", "routes/api.sync.ts"),
  route("/api/score", "routes/api.score.ts"),
  route("/api/summarize", "routes/api.summarize.ts"),
  route("/api/draft", "routes/api.draft.ts"),
  // ── Epic 3: Auth ──
  route("/login", "routes/login.tsx"),
  route("/auth/google", "routes/auth.google.tsx"),
  route("/auth/microsoft", "routes/auth.microsoft.tsx"),
  route("/auth/callback", "routes/auth.callback.tsx"),
  route("/auth/logout", "routes/auth.logout.tsx"),
  route("/manifest.webmanifest", "routes/manifest[.webmanifest].ts"),
] satisfies RouteConfig;
