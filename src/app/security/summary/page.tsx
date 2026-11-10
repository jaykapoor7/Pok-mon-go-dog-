import Link from "next/link";
import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Security summary, StrayPaw", description: "A plain security summary of StrayPaw for procurement and IT review: architecture, access control, data handling, and what is not in place yet." };

/* One printable page for an IT or procurement reviewer. Every statement is something the product does today;
   the last section lists what it does not. Update both together. */
export default function SecuritySummaryPage() {
  return (
    <InfoPage title="Security summary" eyebrow="For procurement and IT review" updated="November 2026">
      <p>This page answers the questions a municipal IT cell, a funder or an NGO board usually asks before records are placed in StrayPaw. It can be printed or saved as a PDF from your browser.</p>

      <H2>Architecture</H2>
      <p>StrayPaw is a web application. The application runs on Vercel; data, files and sign-in are held in a managed Postgres database on Supabase. All connections use TLS. There is no software to install: it runs in a browser and can be added to a phone&apos;s home screen.</p>

      <H2>Access control</H2>
      <ul>
        <li><b>Enforced in the database.</b> Row-level security decides every read and write by organisation and role. The interface hiding a button is never the control.</li>
        <li><b>Organisation isolation.</b> An organisation&apos;s records are readable only by its own members. A reviewing office sees only packages submitted to it.</li>
        <li><b>Roles.</b> Admin, coordinator, veterinarian and field member. Only a veterinarian&apos;s own account can authorise a procedure; only an admin or lead can add or remove people.</li>
        <li><b>Sign-in.</b> An email address and a six-character code sent to that address. No passwords are stored. The sign-in screen does not reveal whether an address has an account, and attempts are rate limited per address and per connection.</li>
        <li><b>New organisations.</b> An organisation that registers itself is unverified, unlisted and absent from every public page until StrayPaw has checked it.</li>
      </ul>

      <H2>Integrity and audit</H2>
      <ul>
        <li>Every change records who made it and when. Deletions are archived and can be restored by an admin.</li>
        <li>A signed-off procedure is not edited silently: it is returned, corrected and authorised again, and each step stays in the history.</li>
        <li>Imported historical records are labelled as imported and are not counted as verified work until a person confirms them.</li>
        <li>Report packages record every acceptance, query and return with the reviewer and the time.</li>
      </ul>

      <H2>The assistant (Kaju)</H2>
      <ul>
        <li>Kaju reads with the signed-in person&apos;s own access and can see nothing they cannot.</li>
        <li>Kaju prepares; a person confirms. It cannot approve a procedure, accept a claim or save a change on its own.</li>
        <li>Today Kaju answers from your records with built-in tools. No record is sent to an AI model provider. Model-backed answers are off, can be switched on only by the owner with a spending limit, and organisations will be told first.</li>
        <li>Records are never used to train AI models.</li>
      </ul>

      <H2>Privacy</H2>
      <ul>
        <li>Public pages show areas, never an animal&apos;s exact point. Reporter identity and veterinary notes are private.</li>
        <li>Photos that may show an injury start blurred. Community reports are checked before publication.</li>
        <li>Offline field records are stored encrypted on the phone until they are sent.</li>
        <li>Usage counting is first-party only, with an opt-out; there is no advertising or cross-site tracking.</li>
      </ul>

      <H2>Data ownership and exit</H2>
      <p>An organisation owns its records. Registers, evidence and reports export to Excel, CSV and PDF at any time, and a workspace can be deleted on request. See <Link href="/data-processing">Data processing</Link> for sub-processors, retention and incident notice.</p>

      <H2>Operations</H2>
      <ul>
        <li>Changes are deployed from version control after automated checks; database changes are applied deliberately and one at a time, never concurrently.</li>
        <li>The database provider takes managed backups. A restore has not been rehearsed against a recovery-time target; see below.</li>
        <li>Current availability is shown live on the <Link href="/status">Status page</Link>.</li>
      </ul>

      <H2>What is not in place yet</H2>
      <p>These are stated plainly so that no tender or review is misled.</p>
      <ul>
        <li>No ISO 27001, SOC 2 or government empanelment.</li>
        <li>No independent penetration test or external audit has been completed.</li>
        <li>The database is not hosted in an Indian region today. Ask us if your contract requires it.</li>
        <li>No published uptime history or service-level commitment outside a written programme agreement.</li>
        <li>No documented, rehearsed recovery-time or recovery-point objective.</li>
        <li>No single sign-on (SAML or OIDC) for organisations.</li>
      </ul>

      <H2>Reporting a vulnerability</H2>
      <p>Write to us through the <Link href="/contact">Contact page</Link> with the details. We reply, fix and, if you wish, credit you.</p>
    </InfoPage>
  );
}
