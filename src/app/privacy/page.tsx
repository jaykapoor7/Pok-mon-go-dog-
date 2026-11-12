import Link from "next/link";
import { DocPage } from "@/sp4/site/kit";

export const metadata = { title: "Privacy Policy, StrayPaw", description: "What StrayPaw collects, why, who processes it, how long it is kept and the choices you have." };

/* NOTE FOR THE OWNER: written to match what the product does today. Have counsel review it against the
   Digital Personal Data Protection Act, 2023 (notice, consent, grievance officer, retention) before it is
   relied on in a tender or a data-processing agreement. */
export default function PrivacyPage() {
  return (
    <DocPage title="Privacy Policy" updated="November 2026">
      <p>This policy says what StrayPaw collects, why, who handles it and what you can do about it. It is written in plain language and covers the public site, personal accounts, organisation workspaces and reviewing offices.</p>

      <h2>What we collect</h2>
      <p><b>When you report an animal:</b> the photo you upload, the place you attach, what you describe and the display name you choose. No account is needed. You may leave an email address so we can tell you when your report is approved.</p>
      <p><b>When you have an account:</b> your name, your email address and the six-character code that signs you in. There is no password. For organisation members we also hold your role and which organisation you belong to.</p>
      <p><b>What organisations record:</b> animal records, cases, procedures, vaccinations, photos, places, notes, sign-offs and report packages, together with who recorded each change and when. An organisation may record the name and phone number of a person who reported or keeps an animal; these are visible only inside that organisation.</p>
      <p><b>Usage:</b> one random value stored in your browser so a repeat visit is not counted as a new person, and counts of pages and actions. No advertising identifiers, no fingerprinting, and no third-party analytics that follow you to other sites. You can turn this off from the notice shown on your first visit.</p>

      <h2>What stays on your device</h2>
      <p>Your display name, the token that lets you delete your own reports, your sign-in session and, in field mode, records saved while offline (stored encrypted until they are sent). Clearing your browser data removes them.</p>

      <h2>Location</h2>
      <p>Your device&apos;s location is read only when you ask for it, for example to place a report or a field record, and only after your browser asks you. It is not tracked in the background. Public pages show an approximate area or locality for an animal, never a precise point. Please do not use a private home as a landmark.</p>

      <h2>What is public and what is private</h2>
      <p>Approved community reports, an animal&apos;s public profile and figures an organisation chooses to publish are public. An organisation&apos;s workspace is private to its members. A reviewing office sees only the packages submitted to it and the evidence inside them. An organisation that has registered but is not yet verified is not listed publicly and none of its records appear on public pages.</p>

      <h2>How we use it</h2>
      <p>To run the service: showing records to the people entitled to see them, sending sign-in codes and notifications about your own reports, checking reports before they are published, and keeping an audit trail. We do not sell personal data, do not share it with advertisers, and do not use organisations&apos; records to train AI models.</p>

      <h2>Kaju</h2>
      <p>Kaju, the assistant, reads records with the same access as the person asking and currently works from those records with built-in tools; no record is sent to an AI model provider. If model-backed answers are switched on for a workspace, its admin will be told first and this policy will name the provider.</p>

      <h2>Who processes data for us</h2>
      <p>We use a small number of providers to run StrayPaw: Supabase (database, file storage and sign-in), Vercel (hosting), Resend (email delivery), Mapbox and OpenStreetMap-based services (maps) and Cloudflare Turnstile (protecting forms from abuse). They process data on our instructions. An organisation that connects its own Google, Microsoft, Slack or Zoho account allows StrayPaw to use that account only for what it has allowed.</p>

      <h2>How long we keep it</h2>
      <p>Records are kept for as long as the account or workspace exists. When an organisation deletes a record it is archived so an admin can restore it, and audit entries are kept so the history stays honest. When a workspace is closed we delete or return its records on request, except where a programme agreement or the law requires a record, such as a submitted package and its decision, to be kept.</p>

      <h2>Security</h2>
      <p>Access is checked by the database on every read and write, organisations are isolated from one another, connections are encrypted in transit, and every change records who made it. Details are on the <Link href="/security">Security page</Link>.</p>

      <h2>Your choices</h2>
      <p>You can delete a report you created from the device that created it; ask us to correct or delete your personal data; ask your organisation&apos;s admin or us to turn off your sign-in; opt out of visit counting; and ask what we hold about you. An organisation can export everything it has recorded at any time. Requests go through the <Link href="/contact">Contact page</Link>; to report content that should be removed, use <Link href="/report-content">Report content</Link>.</p>

      <h2>Children</h2>
      <p>StrayPaw is not directed at children. Classroom material in the Academy needs no account.</p>

      <h2>Changes</h2>
      <p>We will post changes here and change the date above. Significant changes are emailed to organisation admins.</p>
    </DocPage>
  );
}
