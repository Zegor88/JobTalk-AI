import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/api/sync", "routes/api.sync.ts"),
  route("/thread/:threadId", "routes/thread.$threadId.tsx"),  // ← Story 1.3
  route("/api/score", "routes/api.score.ts"),
] satisfies RouteConfig;
