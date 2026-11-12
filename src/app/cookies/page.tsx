import { DocPage } from "@/sp4/site/kit";

export const metadata = { title: "Cookies, StrayPaw", description: "The cookies and local storage StrayPaw uses, what each is for, and how to control them." };

export default function CookiesPage() {
  return (
    <DocPage title="Cookies & Local Storage" updated="June 2026">
      <p>
        StrayPaw keeps its use of browser storage minimal and does not run
        third-party advertising trackers.
      </p>
      <h2>What we store locally</h2>
      <ul>
        <li>
          <strong>Theme</strong>, your light/dark preference.
        </li>
        <li>
          <strong>Display name</strong>, so you stay &ldquo;signed in&rdquo; on
          this device.
        </li>
        <li>
          <strong>Sighting tokens</strong>, secret keys that let you delete
          your own posts.
        </li>
      </ul>
      <h2>Essential services</h2>
      <p>
        We use Supabase for data storage and, when enabled, Cloudflare Turnstile
        to prevent spam. These may set essential cookies needed for the service
        to function. You can clear all local data at any time from your
        browser settings.
      </p>
    </DocPage>
  );
}
