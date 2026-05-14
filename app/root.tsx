// app/root.tsx
import { Links, Meta, Outlet, Scripts } from "react-router";
import { BottomNav } from "~/components/ui/BottomNav";
import "~/index.css"; // ONLY place global styles are imported

export default function App() {
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
        <div className="app-shell">
          <Outlet />
          <BottomNav />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
