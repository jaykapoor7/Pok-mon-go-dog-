import Link from "next/link";
import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Data processing, StrayPaw", description: "How StrayPaw processes data for organisations and reviewing offices: roles, purposes, sub-processors, retention, incident notice and exit." };

/* NOTE FOR THE OWNER: this is the operational basis for a data-processing agreement, not the agreement itself.
   A signed DPA for a municipal or funded programme must be drafted or reviewed by counsel (DPDP Act, 2023). */
export default function DataProcessingPage() {
  return (
    <InfoPage title="Data processing" eyebrow="For organisations and reviewing offices" updated="November 2026">
      <p>This page sets out how StrayPaw handles the records an organisation or a reviewing office places in it. It is the working basis for the data-processing terms in a programme agreement. It is not itself a signed agreement; a programme that needs one receives it in writing.</p>

      <H2>Who is responsible for what</H2>
      <p>The organisation decides what is recorded and why, and is responsible for having the right to record it. StrayPaw processes those records on the organisation&apos;s behalf to provide the service. For community reports and personal accounts, StrayPaw itself decides how the data is used, as described in the <Link href="/privacy">Privacy Policy</Link>.</p>

      <H2>What is processed</H2>
      <ul>
        <li><b>About animals:</b> identity, photos, places, health, procedures, vaccinations, cases, follow-ups and outcomes.</li>
        <li><b>About people:</b> members&apos; names, email addresses and roles; the name and phone number of a person who reported or keeps an animal, where the organisation records it; reviewers&apos; names on their decisions.</li>
        <li><b>About the work:</b> evidence, sign-offs, report packages, contract rates and an audit history of every change.</li>
      </ul>

      <H2>Purposes</H2>
      <p>Only to provide the service to that organisation: storing and showing its records to the people it has authorised, preparing reports and packages, sending sign-in codes and notices, and keeping the audit trail. Records are not sold, not shared with another organisation, and not used to train AI models. Aggregate, non-identifying figures are published only where the organisation chooses to publish them.</p>

      <H2>Sub-processors</H2>
      <ul>
        <li><b>Supabase:</b> database, file storage and sign-in.</li>
        <li><b>Vercel:</b> application hosting.</li>
        <li><b>Resend:</b> delivery of sign-in codes and notices by email.</li>
        <li><b>Mapbox and OpenStreetMap-based services:</b> map tiles and place search. Animal records are not sent to them.</li>
        <li><b>Cloudflare Turnstile:</b> protecting public forms from automated abuse.</li>
      </ul>
      <p>No AI model provider is a sub-processor today. If model-backed answers are switched on, the provider will be added here and organisations told beforehand. We will tell organisation admins before adding or replacing a sub-processor that handles their records.</p>

      <H2>Where data is held</H2>
      <p>With the providers above. The database is not hosted in an Indian region today, and we do not claim otherwise. If your programme requires hosting in India, raise it before the agreement so it can be scoped.</p>

      <H2>Security measures</H2>
      <p>Database-enforced permissions by organisation and role, isolation between organisations, encryption in transit, an audit history of every change, archived deletions, and sign-in that stores no passwords. The full list, and what is not yet in place, is in the <Link href="/security/summary">Security summary</Link>.</p>

      <H2>Retention and deletion</H2>
      <p>Records are kept while the workspace exists. A deleted record is archived so an admin can restore it. When a workspace closes, its records are exported to the organisation and deleted on request, except records that a programme agreement or the law requires to be kept, such as a submitted package and the office&apos;s decision on it.</p>

      <H2>People&apos;s requests</H2>
      <p>If a person asks to see, correct or delete data about them that an organisation recorded, we pass the request to that organisation and help it respond.</p>

      <H2>Incidents</H2>
      <p>If personal data in a workspace is accessed, lost or disclosed without authority, we tell that organisation&apos;s admins without undue delay, with what is known, what was affected and what has been done, and we keep them informed as more is learned.</p>

      <H2>Exit</H2>
      <p>Registers, evidence and reports export to Excel, CSV and PDF at any time, without our involvement. Nothing about leaving requires a fee.</p>

      <H2>Questions</H2>
      <p>Write to us through the <Link href="/contact">Contact page</Link>. For the controls themselves, see <Link href="/security">Security</Link> and <Link href="/data-governance">Data governance</Link>.</p>
    </InfoPage>
  );
}
