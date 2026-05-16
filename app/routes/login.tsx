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
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? `Unknown error: ${errorKey}`) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>JobTalk AI</h1>
      <p className={styles.subtitle}>AI-powered email for job seekers</p>

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}

      {email ? (
        <div className={styles.connectedState}>
          <p className={styles.connectedText}>
            Connected as <strong>{email}</strong> via {provider}
          </p>
          <form method="post" action="/auth/logout">
            <button type="submit" className={styles.signOutBtn}>
              Sign Out
            </button>
          </form>
          <Link to="/" className={styles.backBtn}>
            Back to Inbox
          </Link>
        </div>
      ) : (
        <div className={styles.providerList}>
          <Link to="/auth/google" className={styles.providerBtn}>
            Connect with Google
          </Link>
          <Link to="/auth/microsoft" className={styles.providerBtn}>
            Connect with Microsoft
          </Link>
        </div>
      )}
    </div>
  );
}
