import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "JobTalk AI" },
    { name: "description", content: "AI-powered email client for job seekers" },
  ];
}

export default function Home() {
  return <main style={{ padding: "var(--space-4)" }}>JobTalk AI App Shell</main>;
}
