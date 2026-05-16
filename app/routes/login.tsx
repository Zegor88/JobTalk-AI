import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { getSession } from "~/services/session.server";
import styles from "./login.module.css";

const ERROR_MESSAGES: Record<string, string> = {
  config: "OAuth is not configured. Check server environment variables.",
  missing_params: "Invalid callback — missing required parameters.",
  invalid_provider: "Unknown OAuth provider.",
  invalid_state: "Security check failed. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

// Inline SVG logos to avoid external img requests
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
    </svg>
  );
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "JobTalk AI — Connect Account" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const email = session.get("email") ?? null;
  const provider = session.get("provider") ?? null;
  return { email, provider };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { email, provider } = loaderData;
  const [searchParams] = useSearchParams();
  const errorKey = searchParams.get("error");
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? `Unknown error: ${errorKey}`)
    : null;

  return (
    <div className={styles.page}>
      {/* Brand block */}
      <div className={styles.brand}>
        <div className={styles.logo} aria-hidden="true">JT</div>
        <h1 className={styles.title}>JobTalk AI</h1>
        <p className={styles.subtitle}>AI-powered email for job seekers</p>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}

      {email ? (
        <div className={styles.connectedState}>
          <div className={styles.connectedCard}>
            <div className={styles.connectedAvatar} aria-hidden="true">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className={styles.connectedInfo}>
              <p className={styles.connectedEmail}>{email}</p>
              <p className={styles.connectedProvider}>via {provider}</p>
            </div>
          </div>

          <Link to="/" className={styles.inboxBtn}>
            Open Inbox
          </Link>

          <form method="post" action="/auth/logout">
            <button type="submit" className={styles.signOutBtn}>
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.providerList}>
          <Link to="/auth/google" className={styles.providerBtn}>
            <span className={styles.providerIcon}><GoogleLogo /></span>
            Continue with Google
          </Link>
          <Link to="/auth/microsoft" className={styles.providerBtn}>
            <span className={styles.providerIcon}><MicrosoftLogo /></span>
            Continue with Microsoft
          </Link>
        </div>
      )}
    </div>
  );
}
