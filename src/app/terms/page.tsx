import Link from "next/link";
import { InfoPage, H2 } from "@/components/info/InfoPage";

export const metadata = { title: "Terms, StrayPaw", description: "The terms for using StrayPaw: reporting animals, personal accounts, organisation workspaces, reviewing offices and Kaju." };

/* NOTE FOR THE OWNER: these terms describe how the product actually behaves and were written without a
   lawyer. Before they are relied on in a contract or a tender (governing law, liability caps, indemnities,
   DPDP Act obligations), have them reviewed by counsel. Programme customers sign a separate agreement. */
export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" updated="November 2026">
      <p>These terms cover everyone who uses StrayPaw: people who report or follow street animals, people with a personal account, organisations with a workspace, and reviewing offices. By using StrayPaw you agree to them. Organisations running a funded programme also sign a written agreement with us; where that agreement says something different, it applies.</p>

      <H2>1. What StrayPaw is</H2>
      <p>StrayPaw is software for recording and coordinating street-animal care: reports, animal records, cases, sterilisation and vaccination records, evidence, monthly report packages and their review. It is a record and coordination tool. It is not a rescue, veterinary or emergency service, and it does not guarantee that any report will be acted on. In an emergency, contact a local veterinary or rescue service directly.</p>

      <H2>2. Accounts and sign-in</H2>
      <p>Reporting an animal needs no account. An account is an email address and a six-character code that we send to it; there is no password. Keep the code private: anyone with your email and code can sign in as you. Tell us at once if you think someone else has used it, and ask your organisation&apos;s admin or us to turn it off.</p>
      <p>You must give a real email address that you control, and accurate details about yourself and your organisation.</p>

      <H2>3. Organisation workspaces</H2>
      <p>An organisation can register itself and start at once. The person who registers becomes its admin and decides who else has access and in which role. A newly registered organisation is unverified: its workspace works fully, but it is not listed publicly, its records do not appear on public pages, and claiming public cases and fundraising stay off until we have checked its details. We may ask for documents and may decline or withdraw verification.</p>
      <p>The organisation is responsible for what its members record, for having the right to record it, and for removing access from people who leave.</p>

      <H2>4. Your records</H2>
      <p>Records an organisation creates belong to that organisation. We store and process them to provide the service, and do not sell them, share them with another organisation, or use them to train AI models. You can export registers, evidence and reports to Excel, CSV and PDF at any time, and ask us to delete your workspace. See the <Link href="/privacy">Privacy Policy</Link> and <Link href="/data-governance">Data governance</Link>.</p>
      <p>Some information is public by design: approved community reports, an animal&apos;s public profile, and figures an organisation chooses to publish. Public pages show areas, not exact points.</p>

      <H2>5. What you may not do</H2>
      <p>Do not upload content you have no right to share; content that is abusive, false or misleading; or content that exposes private information about a person, such as a face, a number plate or a home address. Do not record a procedure, sign-off or piece of evidence that did not happen. Do not try to access another organisation&apos;s records, probe or overload the service, or use it to harass anyone. We may remove content and suspend accounts that break these rules or our <Link href="/community-guidelines">Community Guidelines</Link>.</p>

      <H2>6. Kaju, the assistant</H2>
      <p>Kaju reads the records you are allowed to see and prepares work: summaries, drafts, checks and documents. Kaju does not approve procedures, certify fieldwork, accept claims or authorise payments, and nothing Kaju prepares is saved until a person confirms it. You remain responsible for what you confirm. Kaju can be wrong; check its output against the records it cites.</p>

      <H2>7. Sign-offs, claims and review</H2>
      <p>A veterinary sign-off is the veterinarian&apos;s own professional statement, made in their name. A report package is the organisation&apos;s statement to its reviewing office. An office&apos;s acceptance is that office&apos;s decision on the evidence; it is not payment and StrayPaw is not a party to it. StrayPaw records these statements; it does not make or guarantee them.</p>

      <H2>8. Figures</H2>
      <p>Figures in StrayPaw are counts of what has been recorded. They are not estimates of a street-animal population, and an unknown status is not a negative result. Imported historical registers are labelled as imported until someone confirms them.</p>

      <H2>9. Availability and changes</H2>
      <p>We work to keep StrayPaw available and your records safe, but the service is provided as it is, without a guarantee of uninterrupted availability unless a written agreement says otherwise. We may change or withdraw features; we will give reasonable notice before removing something an organisation relies on, and your records remain exportable.</p>

      <H2>10. Fees</H2>
      <p>Reporting, personal accounts and an organisation&apos;s own workspace are free to start. Funded programmes are priced per programme and agreed in writing before any work begins. Nothing is charged without that agreement.</p>

      <H2>11. Liability</H2>
      <p>To the extent the law allows, StrayPaw is not liable for actions taken on the basis of information recorded by others, for decisions made by veterinarians, organisations or offices, or for indirect losses. Nothing in these terms limits liability that cannot lawfully be limited.</p>

      <H2>12. Ending use</H2>
      <p>You can stop using StrayPaw at any time and ask us to delete your account or workspace. We may suspend or end access for a serious or repeated breach of these terms. Records that others rely on, such as a submitted package and its decision, are kept as part of the audit trail for as long as the law or the programme agreement requires.</p>

      <H2>13. Changes to these terms and contact</H2>
      <p>We will post changes here and change the date above; for significant changes we will tell organisation admins by email. Questions go to us through the <Link href="/contact">Contact page</Link>.</p>
    </InfoPage>
  );
}
