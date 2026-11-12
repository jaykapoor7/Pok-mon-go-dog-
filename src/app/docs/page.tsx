import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHead, S4Page } from "@/sp4/site/kit";
import { HOW } from "@/sp3/ai/understand";

export const metadata = { title: "Documentation, StrayPaw", description: "How StrayPaw works: access, workspaces, imports, programmes, evidence review, reports, Kaju and CareOS." };

const DOCS: { id: string; t: string; body: React.ReactNode; links: [string, string][] }[] = [
  { id: "access", t: "Getting access", body: <>StrayPaw has no self-chosen roles. An organisation admin invites you with your email and a six-character code; you sign in with that pair on any device. Signing in joins you to the organisation the code belongs to. Residents need no account to report an animal or use the map. No code yet? Request one from <Link className="s4-blue" href="/sign-in">Access</Link>, or apply for an organisation workspace.</>, links: [["Sign in", "/sign-in"], ["Join with a code", "/join"], ["Apply to partner", "/partner-apply"]] },
  { id: "workspaces", t: "Workspaces", body: <><b>Open app</b> sends you to the workspace your account can use: NGO members to their organisation&apos;s work queue; everyone else to the public tools. The <b>NGO workspace</b> holds the inbox, cases, animals, programmes, field mode, imports, reports and team. The <b>municipal workspace</b> shows programme evidence, coverage by area and city reports. <b>Community</b> and the <b>Academy</b> are public.</>, links: [["Open app", "/app"], ["NGO workspace", "/ngo"], ["Municipal workspace", "/city"]] },
  { id: "import", t: "Importing registers", body: <>Upload the Excel or CSV you already keep. StrayPaw reads the columns, matches rows to animals already on the record, and sends uncertain matches to review. Every imported row keeps its source file and batch, and imported history is always labelled as imported, never as today&apos;s work.</>, links: [["Import a register", "/ngo/import"], ["Historical review", "/ngo/review"]] },
  { id: "programmes", t: "Programmes", body: <>A programme is an ABC drive, a vaccination round, a rescue register or a survey. File reports and animals into it, record interventions with evidence, and its figures update from the record.</>, links: [["NGO programmes", "/ngo/programmes"], ["Public programmes", "/city/programmes"]] },
  { id: "review", t: "Evidence review", body: <>Records missing evidence, possible duplicates and imported statuses are resolved by a person with a reason. Decisions stay in the record&apos;s history. Recorded counts are never presented as population estimates.</>, links: [["Review queue", "/ngo/review"], ["Data quality", "/ngo/quality"]] },
  { id: "reports", t: "Reports and downloads", body: <>Programme reports, the government submission, package reconciliations, the city report and the Excel evidence workbook are built from the record and share one StrayPaw template: title, organisation, period and date on the cover, method and limits at the end, page numbers throughout. Spreadsheets open on an About sheet; CSV files begin with two lines saying what they are. Everything is read with the downloading account&apos;s own access.</>, links: [["Reports & proof", "/ngo/proof"], ["City report", "/city/report"]] },
  { id: "automations", t: "Kaju automations", body: <>The Kaju home lists what Kaju is doing for your role. For organisations: the morning record check, a weekly digest of what changed and who acts next, overdue follow-ups prepared for rescheduling, a draft of this month&apos;s claim with every blocked record, a duplicate check and ward watch. For reviewing offices: a morning brief that pre-checks every waiting package, ward watch and a draft monthly note. Every figure is read from the record; an unreadable source says unknown. Kaju prepares and a person confirms.</>, links: [["Open Kaju", "/assistant"], ["Kaju agents", "/kaju-agents"]] },
  { id: "ai", t: "Kaju", body: <>Open it from any workspace with the sparkle button or ⌘J, or full screen at <Link className="s4-blue" href="/assistant">/assistant</Link>. It reads with your own session, so database permissions apply. It answers with links to the records it used. Any change it prepares (a case, a note, a follow-up, a care event) is shown first and saved only when you press Confirm, through the same actions as the manual screens, and is marked in the history as prepared with Kaju. Without a language model configured on the deployment, the record tools still work and the assistant says free-form answers are off.</>, links: [["Kaju", "/ai"], ["Open assistant", "/assistant"]] },
  { id: "careos", t: "CareOS and WhatsApp", body: <>CareOS is the field channel: authorised members send text, photos and locations that become drafts for review. It is <b>not connected to WhatsApp in production</b>; the webhook refuses all traffic until Meta credentials are configured. Use field mode on a phone, or paste a forwarded message into Kaju.</>, links: [["CareOS status", "/whatsapp"], ["Field mode", "/ngo/field"]] },
  { id: "one-health", t: "Programmes across institutions", body: <>A One Health programme joins hospitals and health centres, laboratories, NGOs, the municipal office and a coordination cell. Each works in its own place: a facility records bites and courses against its own register number and never stores a name; a laboratory receives samples and records results with their method; an NGO answers requests to find, observe or vaccinate animals. Requests, results and referrals move between them; patient details never do. A bell lists what needs each person across their places.</>, links: [["See it in the live demo", "/try"], ["For hospitals", "/for-hospitals"]] },
  { id: "setup", t: "Setting up a programme, step by step", body: <>In the order the screens ask for it: <b>1.</b> On Today, <b>Start a programme</b> with its name, city and areas; you become its lead. <b>2.</b> In <b>Programme setup</b>, choose the modules (bite care, laboratory, follow-ups, vaccination, services, training). <b>3.</b> Add the partners and what each is responsible for. <b>4.</b> Invite their people: each invite is a link or a code, for one role in one organisation, valid for 14 days. <b>5.</b> Each facility confirms the services it offers today (vaccine, immunoglobulin, wound washing); confirmations lapse unless renewed. <b>6.</b> In <b>Care network</b>, set where each facility refers people for each service. <b>7.</b> Add dog population estimates by area, with their method and source, so coverage can be shown against them. Nothing here needs engineering.</>, links: [["Talk to us about a pilot", "/demo"]] },
  { id: "data", t: "Data, privacy and permissions", body: <>Row-level security in the database decides every read and write. Public views show round area cells, never exact locations. Reporter identity and veterinary notes are private to authorised members.</>, links: [["Data governance", "/data-governance"], ["Research standards", "/research-standards"], ["Privacy", "/privacy"]] },
];

export default function DocsPage() {
  return (
    <S4Page>
      <PageHead eyebrow="Documentation" title="How StrayPaw works." lede="Short, accurate answers about the product as it is today." />
      <section className="s4-wrap s4-docs">
        <nav aria-label="On this page" style={{ position: "sticky", top: 96, alignSelf: "start", display: "grid", gap: 4 }}>
          {DOCS.map((d) => <a key={d.id} href={`#${d.id}`} style={{ padding: "6px 0", fontSize: 14.5, color: "var(--s4-grey)" }}>{d.t}</a>)}
        </nav>
        <div style={{ display: "grid", gap: 0 }}>
          {DOCS.map((d) => (
            <section key={d.id} id={d.id} style={{ padding: "28px 0", borderTop: "1px solid var(--s4-line)", scrollMarginTop: 90, display: "grid", gap: 12 }}>
              <h2 className="s4-h4">{d.t}</h2>
              <p className="s4-body" style={{ fontSize: 16.5, lineHeight: 1.65, maxWidth: 720 }}>{d.body}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>{d.links.map(([l, h]) => <Link key={h} href={h} className="s4-link is-sm">{l} <ArrowRight size={13} /></Link>)}</div>
            </section>
          ))}
        </div>
      </section>
      {/* The same steps Kaju gives when asked "how do I…", from one list, so the two never disagree. */}
      <section className="s4-wrap s4-howto" aria-labelledby="howto-h">
        <h2 id="howto-h" className="s4-h3">How do I…</h2>
        <p className="s4-body">The steps Kaju gives when you ask it, on the screens you will see.</p>
        <div className="s4-howto-grid">
          {HOW.map((h) => (
            <details key={h.title} className="s4-howto-item">
              <summary>{h.title}</summary>
              <ol>{h.steps.map((s, i) => <li key={i}>{bold(s)}</li>)}</ol>
              {h.note ? <p>{bold(h.note)}</p> : null}
            </details>
          ))}
        </div>
      </section>
    </S4Page>
  );
}

/** Kaju writes screen names in **bold**; the page shows them the same way. */
function bold(s: string) { return s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part)); }
