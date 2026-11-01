import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, Camera, MessageSquareText, ClipboardList, Download, FileSpreadsheet, FileText, Fingerprint, History,
  KeyRound, Mail, MapPin, MessageCircle, ScanSearch, ShieldCheck, Smartphone, Sparkles, UserCheck,
} from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { Cards, Faq, S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import { AiBand, MateTabs, UseCases, type Step } from "@/sp4/home/Interactive";
import {
  AskUi, CaptureUi, DuplicateUi, EvidenceUi, ExtractUi, GovUi, OvernightUi, ProposeUi, ReportUi, ReviewUi, RingUi, VetUi,
} from "@/sp4/home/ui";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Stories } from "@/sp4/home/Stories";
import { CountUp } from "@/sp4/site/Live";
import { KajuPresence } from "@/kaju/Presence";
import "@/sp4/home/home4.css";

/** Headline words that rise one after another (CSS only; static without motion). */
function Words({ lines }: { lines: string[] }) {
  let i = 0;
  return <>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{l.split(" ").map((w) => <Fragment key={i}><span style={{ ["--i" as string]: i++ }}>{w}</span>{" "}</Fragment>)}</Fragment>)}</>;
}

export const metadata = {
  title: "StrayPaw · Meet Kaju, the AI for animal welfare programmes",
  description: "StrayPaw runs animal welfare programmes on one shared record: field capture, veterinary sign-off, evidence and municipal reporting. Kaju does the checking and drafting; your team approves.",
};

/* ════════════════════════════════════════════════════════════════════
   Homepage, in order:
   1 hero (Meet Kaju) · 2 partner wall · 3 use cases · 4 Kaju as a
   teammate · 5 recurring checks for Kaju (dark) · 6 customer results ·
   7 integrations · 8 security · 9 FAQ · 10 closing call to action.
   Buyer: the municipal office that funds ABC and anti-rabies work, and
   the operators it funds. Kaju is the agent; StrayPaw is the platform.
   ════════════════════════════════════════════════════════════════════ */

const STEPS: Step[] = [
  { tab: "Capture", title: <>Capture: Every animal on the record<br />from the street.</>, body: "Kaju turns field photos, GPS and notes into a complete animal record, with who caught it and when.", href: "/abc-operations#capture", cta: "Explore capture", ui: <CaptureUi v={0} /> },
  { tab: "Vet sign-off", title: <>Vet sign-off: Surgeries signed<br />by the vet who did them.</>, body: "Each procedure and anti-rabies dose is recorded against the animal. Kaju shows each vet what still needs their signature.", href: "/abc-operations#treatment", cta: "Explore vet sign-off", ui: <VetUi v={0} /> },
  { tab: "Evidence", title: <>Evidence: Find what is missing<br />before month end.</>, body: "Kaju checks every animal against the five evidence items and lists the gaps the day they appear.", href: "/abc-operations#evidence", cta: "Explore evidence", ui: <EvidenceUi v={0} /> },
  { tab: "Quality checks", title: <>Quality checks: Catch duplicates<br />and wrong-ward releases early.</>, body: "Kaju flags possible duplicates, releases outside the capture ward and unsigned procedures for a person to decide.", href: "/abc-operations#checks", cta: "Explore quality checks", ui: <DuplicateUi v={0} /> },
  { tab: "Review", title: <>Review: Close the week<br />in one queue.</>, body: "Your coordinator approves ready records and answers exceptions in one place, with Kaju's summary of what changed.", href: "/abc-operations#review", cta: "Explore review", ui: <ReviewUi v={0} /> },
  { tab: "Reporting", title: <>Reporting: A monthly package<br />built from the records.</>, body: "Totals by ward, the evidence index, vet authorisations and exceptions, assembled by Kaju and checked by your team.", href: "/abc-operations#report", cta: "Explore reporting", ui: <ReportUi v={2} /> },
  { tab: "Municipal review", title: <>Municipal review: Check the work<br />before you pay for it.</>, body: "Your office opens the package, queries any animal and records its acceptance on the same record.", href: "/for-governments", cta: "Explore municipal review", ui: <GovUi v={1} /> },
];

const FAQ: [string, string][] = [
  ["What is Kaju?", "Kaju is StrayPaw's AI agent for animal welfare programmes. It works across capture, vet sign-off, evidence, reports and municipal review, using your organisation's own records."],
  ["How is Kaju different from ChatGPT or Claude?", "Kaju works inside StrayPaw, on your programme's records, with your permissions. Every answer names the records it used, and every change is prepared for a person to confirm."],
  ["Which parts of StrayPaw does Kaju work across?", "Animals, cases, follow-ups, evidence, programmes and reports. Kaju reads only what the signed-in person is allowed to read."],
  ["Can Kaju approve a procedure or a bill?", "No. Kaju prepares; people decide. Vets authorise procedures, coordinators approve evidence and the municipal office accepts the package, each in their own name."],
  ["Does Kaju train on our data?", "No. Your records are not used to train models and are never shared with other organisations."],
  ["Who is StrayPaw for?", "Municipal offices that fund ABC and anti-rabies programmes, and the NGOs and operators that run them."],
  ["How do we get started?", "With a scoped pilot on one programme. We import your current registers, set up your team and agree the scope in writing first."],
  ["Can we bring our existing registers?", "Yes. Excel and CSV registers import as they are. Imported rows stay labelled as historical until checked through the workflow."],
  ["How does pricing work?", "Pricing is agreed per programme before work begins. NGOs and small welfare groups can ask about an accessible plan."],
];

export default function HomePage() {
  const partners = fieldPartnerStrip();
  const story = STORIES[0];
  const kh = STORIES[1];
  return (
    <S4Page>
      <PageView name="landing_view" />

      {/* 1 · hero */}
      <section className="s4-hero" aria-labelledby="hero-title">
        <div className="s4-wrap">
          <Link href="/ai" className="s4-hero-eyebrow"><span>New</span>Kaju is in every workspace <ArrowRight size={14} aria-hidden /></Link>
          <h1 id="hero-title" className="s4-h1 s4-words"><Words lines={["Meet Kaju, the AI agent for", "animal welfare programmes"]} /></h1>
          <p className="s4-lede">StrayPaw runs animal welfare programmes on one shared record: field capture, veterinary sign-off, evidence and municipal reporting. Kaju does the checking and drafting. Your team approves.</p>
          <div className="s4-actions"><Link href="/demo" className="s4-btn is-primary">Book a demo</Link><Link href="#workflow" className="s4-btn is-line">See how it works</Link></div>
          <div className="s4-hero-stage">
            {/* Kaju rests on the product window: the agent lives inside the work. */}
            <span className="s4-hero-perch" aria-hidden><KajuPresence sequence="perch" loop size={112} /></span>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* 2 · field partners */}
      <section className="s4-wrap s4-proof" aria-labelledby="proof-title">
        <div className="s4-sechead" style={{ marginBottom: 40 }}>
          <h2 id="proof-title" className="s4-h2">Animal-welfare teams working with StrayPaw</h2>
          <Link href="/customers" className="s4-link is-ink">Hear from our partners <ArrowRight size={18} aria-hidden /></Link>
        </div>
        <div className="s4-wall">
          {partners.map((p) => {
            const s = STORIES.find((x) => x.name === p.name);
            const inner = <>{s && <span className="s4-cs">Case study <ArrowUpRight size={11} /></span>}{s?.logo ? <><img src={s.logo} alt={p.name} /></> : <span><b>{p.name}</b><small>{p.city}</small></span>}</>;
            return s ? <Link key={p.name} href={`/customers/${s.slug}`} aria-label={`${p.name} case study`}>{inner}</Link> : <div key={p.name}>{inner}</div>;
          })}
        </div>
      </section>

      {/* 3 · the workflow */}
      <div id="workflow" className="s4-sec">
        <UseCases title="Use cases" steps={STEPS} />
      </div>

      {/* 4 · Kaju as a teammate */}
      <section className="s4-sec" aria-labelledby="mate-title">
        <div className="s4-wrap">
          <SecHead id="mate-title" title="Kaju works with your records" lede="Kaju reads available records, links its sources and prepares changes for your team to confirm." link={{ href: "/ai", label: "Meet Kaju" }} />
          <Cards idp="mate2" cols={2} items={[
            { title: "Knows your programme", body: "Ask in plain words. Kaju answers from your records and names each one it used.", ui: <AskUi v={1} />, v: 2 },
            { title: "Prepares, never approves", body: "Kaju drafts cases, notes and follow-ups. Nothing is saved until a person confirms.", ui: <ProposeUi v={0} />, v: 4 },
          ]} />
          <MateTabs items={[
            { title: "Clears the backlog", body: "Kaju finds missing evidence, duplicates and unsigned procedures before the weekly report.", ui: <OvernightUi v={1} /> },
            { title: "Reads field messages", body: "Paste a message from the field. Kaju turns it into a draft record.", ui: <ExtractUi v={1} /> },
            { title: "Keeps reports ready", body: "Kaju tracks evidence completion for the month, so the package is never a surprise.", ui: <RingUi /> },
          ]} />
        </div>
      </section>

      {/* 5 · recurring checks for Kaju */}
      <section className="s4-dark" aria-labelledby="ai-title">
        <div className="s4-wrap"><AiBand /></div>
      </section>

      {/* 6 · customer results */}
      <section className="s4-sec" aria-labelledby="res-title">
        <div className="s4-wrap">
          <h2 id="res-title" className="s4-h2" style={{ marginBottom: 48 }}>Customer results</h2>
          <div className="s4-nums">
            <Rise><b><CountUp n={story.results[0]?.n ?? 0} /></b><small>rescue requests documented by<br />The Pawsome People Project</small></Rise>
            <Rise delay={60}><b><CountUp n={kh.results[0]?.n ?? 0} /></b><small>rescue and treatment requests<br />by The Kind Hour Foundation</small></Rise>
            <Rise delay={120}><b><CountUp n={partners.length} /></b><small>confirmed field partners<br />across India</small></Rise>
            <Link href="/customers" className="s4-link is-ink">Read customer stories <ArrowRight size={18} aria-hidden /></Link>
          </div>
          <Stories stories={[
            { slug: story.slug, name: story.name, city: story.city, logo: story.logo, line: "Coimbatore's rescue, sterilisation and vaccination registers, brought onto one record for every animal.", note: "Figures come from imported historical registers, not from work entered live in StrayPaw. No customer quote is shown until one is approved in writing.", registers: [["Rescue register", "2024–2026"], ["ABC drive register", "Jan–Aug 2026"], ["Vaccination records", "2024–2026"]] },
            { slug: kh.slug, name: kh.name, city: kh.city, logo: kh.logo, line: "A Lucknow rescue and treatment register, with each animal's condition and outcome kept together.", note: "A historical register import. The foundation does not yet run its day-to-day work in StrayPaw, and its records are not independently verified.", registers: [["Rescue and treatment register", "Jan 2024 – Aug 2026"]] },
          ]} />
        </div>
      </section>

      {/* 7 · integrations */}
      <section className="s4-sec" aria-labelledby="int-title" id="integrations">
        <div className="s4-wrap s4-int-wrap">
          <div className="s4-int-head">
            <h2 id="int-title" className="s4-h2"><TwoTone blue a="Kaju works with" b="the tools your team uses." /></h2>
            <Link href="/platform#integrations" className="s4-link is-ink">Every integration and its status <ArrowRight size={18} aria-hidden /></Link>
          </div>
          <div className="s4-int" aria-label="Integrations and their status">
            {INT_COLS.map((col, c) => (
              <div key={c} className="s4-int-col">
                {col.map((t) => <div key={t.n} className="s4-int-t">{t.i}<b>{t.n}</b><small><i className={t.s === "Live" ? "is-live" : t.s === "Not connected" ? "is-off" : t.s === "Setup pending" ? "is-setup" : ""} />{t.s}</small></div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 · security */}
      <section className="s4-sec" id="security" aria-labelledby="sec-title">
        <div className="s4-wrap">
          <SecHead id="sec-title" title={<TwoTone a="Built for public money," b="with audit-ready controls" />} link={{ href: "/security", label: "Explore security" }} />
          <Tiles items={[
            { icon: <ShieldCheck size={20} />, title: "Data isolation", body: "Each organisation's records are separated in the database and never shared across accounts." },
            { icon: <KeyRound size={20} />, title: "Role-based access", body: "Leads, coordinators, vets, field staff and reviewers see and change only what their role allows." },
            { icon: <History size={20} />, title: "Full audit trail", body: "Every change records who made it and when, including changes prepared by Kaju." },
            { icon: <Fingerprint size={20} />, title: "Record provenance", body: "Every record shows where it came from: field capture, community report or historical import." },
            { icon: <Sparkles size={20} />, title: "No automatic approvals", body: "Kaju prepares; a named person confirms. It reads only what that person can read." },
            { icon: <Download size={20} />, title: "Your data, exportable", body: "Registers, evidence and reports export to XLSX and CSV at any time." },
          ]} />
        </div>
      </section>

      {/* 9 · FAQ */}
      <Faq items={FAQ} title="FAQs" />
      {/* 10 · closing call to action is rendered by S4Page */}
    </S4Page>
  );
}

type IntTile = { n: string; s: "Live" | "Setup pending" | "Not connected" | "Planned"; i: ReactNode };
/* Connectors use plain letter marks, not the providers' logos. "Setup pending": built and tested, waiting for the
   administrator's OAuth keys (docs/CONNECTIONS.md). Nothing here is shown as live before it is. */
const Mark = ({ l, c }: { l: string; c: string }) => <span className="s4-int-mark" style={{ background: c }} aria-hidden>{l}</span>;
const INT_COLS: IntTile[][] = [
  [{ n: "Google Workspace", s: "Setup pending", i: <Mark l="G" c="#1a73e8" /> }, { n: "Excel & CSV", s: "Live", i: <FileSpreadsheet /> }, { n: "Email", s: "Live", i: <Mail /> }],
  [{ n: "Microsoft 365", s: "Setup pending", i: <Mark l="M" c="#0f6cbd" /> }, { n: "Slack", s: "Setup pending", i: <Mark l="S" c="#4a154b" /> }, { n: "Phone field mode", s: "Live", i: <Smartphone /> }],
  [{ n: "Zoho Mail", s: "Setup pending", i: <Mark l="Z" c="#c8202f" /> }, { n: "Photos & GPS", s: "Live", i: <Camera /> }],
  [{ n: "SMS (MSG91)", s: "Setup pending", i: <MessageSquareText /> }],
  [{ n: "WhatsApp", s: "Not connected", i: <MessageCircle /> }, { n: "Map exports", s: "Live", i: <MapPin /> }],
  [{ n: "PDF · Word · PowerPoint", s: "Live", i: <FileText /> }, { n: "Reviewer access", s: "Live", i: <UserCheck /> }],
  [{ n: "Record search", s: "Live", i: <ScanSearch /> }, { n: "Report packages", s: "Live", i: <ClipboardList /> }],
];
