// app/routes/settings.tsx
import { Link } from "react-router";
import { requireSession } from "~/services/session.server";
import { TopAppBar } from "~/components/ui/TopAppBar";
import { Icon } from "~/components/ui/Icon";
import type { Route } from "./+types/settings";
import styles from "./settings.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "JobTalk AI — Settings" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);
  return { email: session.email, provider: session.provider };
}

function providerInitial(provider: string): string {
  return provider.charAt(0).toUpperCase();
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { email, provider } = loaderData as { email: string; provider: string };

  return (
    <>
      <TopAppBar title="Settings" />

      <main className={styles.page}>
        {/* Account section */}
        <section className={styles.section} aria-labelledby="account-heading">
          <p id="account-heading" className={styles.sectionLabel}>Account</p>

          <div className={styles.card}>
            <div className={styles.accountRow}>
              <div className={styles.providerBadge} aria-hidden="true">
                {providerInitial(provider)}
              </div>
              <div className={styles.accountInfo}>
                <p className={styles.accountEmail}>{email}</p>
                <p className={styles.accountProvider}>{provider}</p>
              </div>
              <span className={styles.connectedBadge} aria-label="Connected">
                <Icon name="check-circle" size={20} />
              </span>
            </div>
          </div>

          <Link to="/login" className={styles.addAccountBtn}>
            + Add another account
          </Link>
        </section>

        {/* About section */}
        <section className={styles.section} aria-labelledby="about-heading">
          <p id="about-heading" className={styles.sectionLabel}>About</p>
          <div className={styles.aboutCard}>
            <p className={styles.aboutName}>JobTalk AI</p>
            <p className={styles.aboutVersion}>Version 1.0.0</p>
          </div>
        </section>

        {/* Sign out */}
        <section className={styles.section}>
          <form method="post" action="/auth/logout">
            <button type="submit" className={styles.signOutBtn}>
              Sign out
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
