import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardPen, FileSearch, Lock, MessageSquareQuote, Route, ScanText, ShieldAlert, Sparkles } from "lucide-react";
import { AiShowcase } from "@/sp3/home/Demos";
import { CtaBand, PageHead, S3Page, SecHead } from "@/sp3/site/Sections";

export const metadata = { title: "StrayPaw AI · StrayPaw", description: "A tool-using assistant inside every StrayPaw workspace: search authorised records, answer with citations, find missing evidence, prepare records and reports for your confirmation." };

const TOOLS: [string, string, string][] = [
  ["search_records", "Search animals, cases and programmes you are allowed to read.", "Read"],
  ["work_summary", "Summarise your team's queue: new requests, open cases, follow-ups due.", "Read"],
  ["find_missing_evidence", "Records without a photo, place or date that should have one.", "Read"],
  ["find_duplicates", "Possible duplicate animals in the same area, for a person to compare.", "Read"],
  ["programme_report", "Recorded figures for a programme, with its sources.", "Read"],
  ["extract_field_message", "Turn a pasted field update or register row into a structured draft.", "Prepare"],
  ["propose_case / propose_followup / propose_note / propose_care", "Prepare a change you confirm before it is saved through the normal workflow.", "Write, after confirmation"],
  ["navigate", "Open the right screen for what you asked.", "Navigate"],
];

export default function AiPage() {
  return (
    <S3Page>
      <PageHead eyebrow={<><Sparkles size={14} /> StrayPaw AI</>} title="The admin work, done in the record." lede="StrayPaw AI is built into every workspace. It searches the records you can see, answers with citations, finds what is missing and prepares records and reports. You confirm every change.">
        <div className="s3-actions"><Link href="/assistant" className="s3-btn is-primary">Open StrayPaw AI <ArrowRight size={16} /></Link><Link href="/demo" className="s3-btn is-line">Book a demo</Link></div>
      </PageHead>
      <section className="s3-wrap" style={{ paddingBottom: 72 }}><AiShowcase /></section>

      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="What it does" title="Less navigating. Less re-typing." />
        <div className="s3-grid-3">
          {[
            [<FileSearch key="1" size={18} />, "Answers with sources", "Every answer links the records it used, so you can check it in one click."],
            [<ScanText key="2" size={18} />, "Reads field updates", "Paste a field message or register rows. It drafts the structured record and asks for what is missing."],
            [<ClipboardPen key="3" size={18} />, "Prepares the change", "Open a case, add a note, schedule a follow-up, record care. You see a preview and confirm."],
            [<ShieldAlert key="4" size={18} />, "Finds the gaps", "Missing evidence, likely duplicates, overdue follow-ups and inconsistencies."],
            [<MessageSquareQuote key="5" size={18} />, "Summarises", "A case, a queue, a programme month, in plain language."],
            [<Route key="6" size={18} />, "Takes you there", "Ask for a screen and it opens it, filtered to what you asked."],
          ].map(([i, t, d]) => <div key={t as string} className="s3-card s3-feature"><span className="s3-ico" aria-hidden>{i}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div></section>

      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Tools" title="A real assistant, not a chatbot." lede="StrayPaw AI works through named tools over the same database the rest of the app uses. These are the tools it has today." />
        <div className="s3-card" style={{ overflowX: "auto" }}>
          <table className="s3-table" style={{ fontSize: 14 }}>
            <thead><tr><th scope="col">Tool</th><th scope="col">What it does</th><th scope="col">Access</th></tr></thead>
            <tbody>{TOOLS.map(([t, d, a]) => <tr key={t}><td className="is-id" style={{ whiteSpace: "normal" }}>{t}</td><td style={{ whiteSpace: "normal" }}>{d}</td><td><span className={`s3-chip ${a === "Read" ? "is-blue" : a === "Navigate" ? "" : "is-flame"}`}>{a}</span></td></tr>)}</tbody>
          </table>
        </div>
      </div></section>

      <section className="s3-sec is-line"><div className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }} data-stack>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}><span className="s3-eyebrow"><Lock size={14} /> Guardrails</span><h2 className="s3-h2">It can only do what you are allowed to do.</h2></div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14, fontSize: 16, color: "var(--s3-ink-2)" }}>
          <li><b>Your permissions, enforced by the database.</b> The assistant reads with your own signed-in session, so row-level security applies to every query.</li>
          <li><b>Confirm before change.</b> Every write is shown as a preview and saved only when you press Confirm, through the same server-checked actions as the manual screens.</li>
          <li><b>No autonomous approvals.</b> It cannot approve medical procedures, certify fieldwork, authorise payments or invent evidence.</li>
          <li><b>An audit trail.</b> Changes prepared with the assistant are marked as such in the record&apos;s history.</li>
          <li><b>Manual always works.</b> Everything the assistant does has a normal screen too.</li>
          <li><b>Honest status.</b> Without a language model configured, StrayPaw AI still runs its record tools and says that free-form answers are off.</li>
        </ul>
      </div></section>
      <CtaBand title="Try StrayPaw AI on your own records." lede="Sign in to your workspace and open the assistant from any screen, or press ⌘J." primary={{ href: "/assistant", label: "Open StrayPaw AI" }} secondary={{ href: "/docs#ai", label: "Read the documentation" }} />
      <p className="s3-wrap s3-small" style={{ paddingBottom: 24 }}><BookOpenCheck size={12} style={{ verticalAlign: -1 }} /> Demo conversations on this page use illustrative record IDs.</p>
    </S3Page>
  );
}
