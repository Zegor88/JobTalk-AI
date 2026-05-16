// app/root.tsx
import { Links, Meta, Outlet, Scripts, useLocation } from "react-router";
import { BottomNav } from "~/components/ui/BottomNav";
import { FAB } from "~/components/ui/FAB";
import "~/index.css";

const AUTH_PREFIXES = ["/login", "/auth/"];
const THREAD_PREFIXES = ["/thread/"];
const FAB_PATHS = ["/", "/search"];

function isAuth(pathname: string): boolean {
  return AUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

function isThread(pathname: string): boolean {
  return THREAD_PREFIXES.some((p) => pathname.startsWith(p));
}

function getShellClass(auth: boolean, thread: boolean): string {
  if (auth) return "app-shell app-shell--auth";
  if (thread) return "app-shell app-shell--thread";
  return "app-shell";
}

export default function App() {
  const { pathname } = useLocation();
  const auth = isAuth(pathname);
  const thread = isThread(pathname);
  const showNav = !auth && !thread;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className={getShellClass(auth, thread)}>
          <Outlet />
          {showNav && <BottomNav />}
          {showNav && FAB_PATHS.includes(pathname) && <FAB />}
        </div>
        <Scripts />
      </body>
    </html>
  );
}
