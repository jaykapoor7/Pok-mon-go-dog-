import Link from "next/link";
import { DocPage } from "@/sp4/site/kit";

export const metadata = { title: "Security summary, StrayPaw", description: "A plain security summary of StrayPaw for procurement and IT review: architecture, access control, data handling, and what is not in place yet." };

/* One printable page for an IT or procurement reviewer. Every statement is something the product does today;
   the last section lists what it does not. Update both together. */
export default function SecuritySummaryPage() {
  return (
    <DocPage title="Security summary" eyebrow="For procurement and IT review" updated="November 2026">
      <p>This page answers the questions a municipal IT cell, a funder or an NGO board usually asks before records are placed in StrayPaw. It can be printed or saved as a PDF from your browser.</p>

      <h2>Architecture</h2>
      <p>StrayPaw is a web application. The application runs on Vercel; data, files and sign-in are held in a managed Postgres database on Supabase. All connections use TLS. There is no software to install: it runs in a browser and can be added to a phone&apos;s home screen.</p>

      <h2>Access control</h2>
      <ul>
        <li><b>Enforced in the database.</b> Row-level security decides every read and write by organisation and role. The interface hiding a button is never the control.</li>
        <li><b>Organisation isolation.</b> An organisation&apos;s records are readable only by its own members. A reviewing office sees only packages submitted to it.</li>
        <li><b>Roles.</b> Admin, coordinator, veterinarian and field member. Only a veterinarian&apos;s own account can authorise a procedure; only an admin or lead can add or remove people.</li>
        <li><b>Sign-in.</b> An email address and a six-character code sent to that address. No passwords are stored. The sign-in screen does not reveal whether an address has an account, and attempts are rate limited per address and per connection.</li>
        <li><b>New organisations.</b> An organisation that registers itself is unverified, unlisted and absent from every public page until StrayPaw has checked it.</li>
      </ul>

      <h2>Integrity and audit</h2>
      <ul>
        <li>Every change records who made it and when. Deletions are archived and can be restored by an admin.</li>
        <li>A signed-off procedure is not edited silently: it is returned, corrected and authorised again, and each step stays in the history.</li>
        <li>Imported historical records are labelled as imported and are not counted as verified work until a person confirms them.</li>
        <li>Report packages record every acceptance, query and return with the reviewer and the time.</li>
      </ul>

      <h2>The assistant (Kaju)</h2>
      <ul>
        <li>Kaju reads with the signed-in person&apos;s own access and can see nothing they cannot.</li>
        <li>Kaju prepares; a person confirms. It cannot approve a procedure, accept a claim or save a change on its own.</li>
        <li>Today Kaju answers from your records with built-in tools. No record is sent to an AI model provider. Model-backed answers are off, can be switched on only by the owner with a spending limit, and organisations will be told first.</li>
        <li>Records are never used to train AI models.</li>
      </ul>

      <h2>Privacy</h2>
      <ul>
        <li>Public pages show areas, never an animal&apos;s exact point. Reporter identity and veterinary notes are private.</li>
        <li>Photos that may show an injury start blurred. Community reports are checked before publication.</li>
        <li>Offline field records are stored encrypted on the phone until they are sent.</li>
        <li>Usage counting is first-party only, with an opt-out; there is no advertising or cross-site tracking.</li>
      </ul>

      <h2>Patient data in One Health programmes</h2>
      <ul>
        <li>Bite exposures, treatment courses, doses and reminder calls live in a separate <code>health</code> schema that the web API cannot reach. They are read and written only through functions that check the person&apos;s facility and role.</li>
        <li>A person is identified by the facility&apos;s own register number. There is no field for a name. A phone number is kept only when the person agreed to reminder calls.</li>
        <li>NGOs, the programme lead and Kaju never open an individual bite record. When a facility refers someone, the receiving facility sees the bite code, its category and what is needed, never who the person is.</li>
        <li>Programme figures under five are shown as &quot;fewer than 5&quot;, never exactly.</li>
        <li>Opening a bite record, and every change to it, is written to an audit trail that the database refuses to edit or delete.</li>
      </ul>
      <h2>How these statements are checked</h2>
      <ul>
        <li>Every change runs the same automated gate before it can be merged: type checks, the production build, regression scripts and about 250 browser tests.</li>
        <li>A permission suite signs in as each kind of person on the staging demonstration and confirms who can and cannot read or change what: today 25 checks, covering patient records, other cities&apos; programmes, referrals and small counts.</li>
        <li>A separate suite confirms that Kaju&apos;s tools read only what the person may read and never touch patient records.</li>
        <li>These are our own tests, not an independent audit; see below.</li>
      </ul>
      <h2>Data ownership and exit</h2>
      <p>An organisation owns its records. Registers, evidence and reports export to Excel, CSV and PDF at any time, and a workspace can be deleted on request. See <Link href="/data-processing">Data processing</Link> for sub-processors, retention and incident notice.</p>

      <h2>Operations</h2>
      <ul>
        <li>Changes are deployed from version control after automated checks; database changes are applied deliberately and one at a time, never concurrently.</li>
        <li>The database provider takes managed backups. A restore has not been rehearsed against a recovery-time target; see below.</li>
        <li>Current availability is shown live on the <Link href="/status">Status page</Link>.</li>
      </ul>

      <h2>What is not in place yet</h2>
      <p>These are stated plainly so that no tender or review is misled.</p>
      <ul>
        <li>No ISO 27001, SOC 2 or government empanelment.</li>
        <li>No independent penetration test or external audit has been completed.</li>
        <li>The database is not hosted in an Indian region today. Ask us if your contract requires it.</li>
        <li>No published uptime history or service-level commitment outside a written programme agreement.</li>
        <li>No documented, rehearsed recovery-time or recovery-point objective.</li>
        <li>No single sign-on (SAML or OIDC) for organisations.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>Write to us through the <Link href="/contact">Contact page</Link> with the details. We reply, fix and, if you wish, credit you.</p>
    </DocPage>
  );
}
