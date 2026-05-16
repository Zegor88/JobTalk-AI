import { Link } from "react-router";
import type { Route } from "./+types/login";
import { getSession } from "~/services/session.server";
import styles from "./login.module.css";

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

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>JobTalk AI</h1>
      <p className={styles.subtitle}>AI-powered email for job seekers</p>

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
