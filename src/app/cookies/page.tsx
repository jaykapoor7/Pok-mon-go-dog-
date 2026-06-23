import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Cookies — StrayPaw Delhi" };

export default function CookiesPage() {
  return (
    <InfoPage title="Cookies & Local Storage" updated="June 2026">
      <p>
        StrayPaw keeps its use of browser storage minimal and does not run
        third-party advertising trackers.
      </p>
      <H2>What we store locally</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Theme</strong> — your light/dark preference.
        </li>
        <li>
          <strong>Display name</strong> — so you stay &ldquo;signed in&rdquo; on
          this device.
        </li>
        <li>
          <strong>Sighting tokens</strong> — secret keys that let you delete
          your own posts.
        </li>
      </ul>
      <H2>Essential services</H2>
      <p>
        We use Supabase for data storage and, when enabled, Cloudflare Turnstile
        to prevent spam. These may set essential cookies needed for the service
        to function. You can clear all local data at any time from your
        browser settings.
      </p>
    </InfoPage>
  );
}
