import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, Camera, ClipboardList, Download, FileSpreadsheet, FileText, Fingerprint, History,
  KeyRound, Mail, MapPin, MessageCircle, ScanSearch, ShieldCheck, Smartphone, Sparkles, Upload, UserCheck,
} from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { Cards, Faq, S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import { AiBand, UseCases, type Step } from "@/sp4/home/Interactive";
import {
  AskUi, CaptureUi, DuplicateUi, EvidenceUi, ExtractUi, GovUi, OvernightUi, ProposeUi, ReportUi, ReviewUi, RingUi, VetUi,
} from "@/sp4/home/ui";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Stories } from "@/sp4/home/Stories";
import { CountUp } from "@/sp4/site/Live";
import "@/sp4/home/home4.css";

/** Headline words that rise one after another (CSS only; static without motion). */
function Words({ lines }: { lines: string[] }) {
  let i = 0;
  return <>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{l.split(" ").map((w) => <Fragment key={i}><span style={{ ["--i" as string]: i++ }}>{w}</span>{" "}</Fragment>)}</Fragment>)}</>;
}

export const metadata = {
  title: "StrayPaw · The platform for animal welfare programmes",
  description: "One platform for the organisations and public bodies that care for street animals: field work, veterinary care, evidence and reporting, with Kaju built in. First product: ABC and anti-rabies Operations & Verification.",
};

/* ════════════════════════════════════════════════════════════════════
   Homepage (StrayPaw 4). Twelve parts, in order:
   1 hero + product · 2 field partners · 3 the workflow (sticky tabs) ·
   4 Kaju as a teammate · 5 dark band: routine checks ·
   6 WhatsApp field intake · 7 operator now, government next ·
   8 integrations · 9 results · 10 security · 11 FAQ · 12 closing CTA.
   Operator-first: the buyer is the funded ABC operator; government
   oversight is the stage the record is built to reach.
   ════════════════════════════════════════════════════════════════════ */

const STEPS: Step[] = [
  { tab: "Capture", title: <>Every animal on the record<br />from the moment it is caught.</>, body: "Photos, sex, coat, ear notch and the exact place, captured on a phone in the field. Each record says who created it and how.", href: "/abc-operations#capture", cta: "Explore capture", ui: <CaptureUi v={0} /> },
  { tab: "Vet treatment", title: <>Procedures a veterinarian<br />actually authorised.</>, body: "Surgery, ear notch and anti-rabies vaccination are recorded against the animal and signed off by the registered vet who did the work.", href: "/abc-operations#treatment", cta: "Explore treatment", ui: <VetUi v={0} /> },
  { tab: "Evidence", title: <>Know what is missing<br />before anyone asks.</>, body: "Each animal carries an evidence checklist: capture, surgery, ear notch, release photo and release place. Gaps show up the day they happen.", href: "/abc-operations#evidence", cta: "Explore evidence", ui: <EvidenceUi v={0} /> },
  { tab: "Checks", title: <>Catch duplicates<br />and mismatches early.</>, body: "Possible duplicates, releases far from the capture ward and records without a vet sign-off are flagged for a person to decide.", href: "/abc-operations#checks", cta: "Explore checks", ui: <DuplicateUi v={0} /> },
  { tab: "Operator review", title: <>Review the week<br />in one queue.</>, body: "Your coordinator sees every record and every open exception for the week, and approves what is ready for the report.", href: "/abc-operations#review", cta: "Explore review", ui: <ReviewUi v={0} /> },
  { tab: "Report package", title: <>A report package<br />that holds up.</>, body: "Totals by ward and week, the evidence index, vet authorisations and an exceptions log, generated from the records themselves.", href: "/abc-operations#report", cta: "Explore reports", ui: <ReportUi v={2} /> },
  { tab: "Government review", title: <>The reviewing office<br />checks, then accepts.</>, body: "A municipal reviewer gets read-only access to the package, can query any exception, and records their acceptance on the same record.", href: "/for-governments", cta: "Explore government review", ui: <GovUi v={1} /> },
];

const FAQ: [string, string][] = [
  ["Who is StrayPaw for?", "Organisations and public bodies that run animal welfare programmes: NGOs, veterinary teams, contractors and the municipal offices that fund them. Our first product is for funded animal birth control (ABC) and anti-rabies vaccination programmes, where the record has to stand up to review. Rescue, care, community reporting and education already run on the same record."],
  ["Is StrayPaw only for ABC?", "No. ABC and anti-rabies drives are where we start because the need for verified records is sharpest there. The same platform holds rescue and treatment cases, feeding and community reports, research archives kept apart from operations, and education, and more programme types follow."],
  ["How do we start?", "With a scoped pilot on one programme. You tell us your wards, team and current registers; we set up the workspace, import what you have and train the team. Nothing is promised that we have not agreed in writing."],
  ["What does it cost?", "Pricing is agreed per programme before any work begins, and we do not publish a price list yet. Small community and welfare groups can ask about an accessible plan."],
  ["Is WhatsApp intake live?", "Not yet. Field intake is built against the Meta WhatsApp Cloud API, but the number is not verified and Meta approval is pending, so nothing is sent or received over WhatsApp today. Teams use the web and phone field mode meanwhile."],
  ["Does Kaju approve anything?", "No. Kaju searches, summarises and prepares records with citations. Anything that changes a record is shown to a person first and saved only when they confirm. It cannot authorise a procedure, accept a report or approve a payment."],
  ["Can we bring our existing registers?", "Yes. Excel and CSV registers import as they are. Imported rows stay labelled as historical records, and uncertain matches go to review."],
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
          <h1 id="hero-title" className="s4-h1 s4-words"><Words lines={["Meet Kaju, the AI agent for", "animal welfare programmes"]} /></h1>
          <p className="s4-lede">Capture animals, record care, check evidence, prepare reports, and more. We start with ABC and anti-rabies programmes, where every procedure is recorded, signed off and ready for the office that funds it.</p>
          <div className="s4-actions"><Link href="/demo" className="s4-btn is-primary">Book a demo</Link><Link href="#workflow" className="s4-btn is-line">Take a tour</Link></div>
          <div className="s4-hero-stage"><HeroDemo /></div>
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
        <UseCases title="Use cases" kicker="First product · ABC and anti-rabies Operations & Verification" steps={STEPS} />
      </div>

      {/* 4 · Kaju as a teammate */}
      <section className="s4-sec" aria-labelledby="mate-title">
        <div className="s4-wrap">
          <SecHead id="mate-title" title="Kaju, your team's most reliable teammate" lede="Kaju reads the programme record you are allowed to read, finds what needs attention and prepares the paperwork. People make the decisions." link={{ href: "/ai", label: "Meet Kaju" }} />
          <Cards idp="mate2" cols={2} items={[
            { title: "Knows your programme", body: "Ask in plain words. Every answer names the records it read, so anyone can check it.", ui: <AskUi v={1} />, v: 2 },
            { title: "Prepares, never approves", body: "New cases, notes and follow-ups are drafted for you and saved only when a person confirms, with their name on the record.", ui: <ProposeUi v={0} />, v: 4 },
          ]} />
          <div style={{ height: 48 }} />
          <Cards idp="mate3" cols={3} items={[
            { title: "Works through the backlog", body: "Missing evidence, duplicates and unsigned procedures, found before the weekly report.", ui: <OvernightUi v={1} />, v: 0 },
            { title: "Reads field messages", body: "A message from the field becomes a structured draft record for review.", ui: <ExtractUi v={1} />, v: 5 },
            { title: "Keeps the report ready", body: "See how complete your evidence is for the period, at any time.", ui: <RingUi />, v: 1 },
          ]} />
        </div>
      </section>

      {/* 5 · dark band */}
      <section className="s4-dark" aria-labelledby="ai-title">
        <div className="s4-wrap"><AiBand /></div>
      </section>

      {/* 8 · integrations */}
      <section className="s4-sec" aria-labelledby="int-title" id="integrations">
        <div className="s4-wrap s4-int-wrap">
          <div className="s4-int-head">
            <h2 id="int-title" className="s4-h2"><TwoTone blue a="StrayPaw works with" b="the tools your team uses." /></h2>
            <Link href="/platform#integrations" className="s4-link is-ink">Every integration and its status <ArrowRight size={18} aria-hidden /></Link>
          </div>
          <div className="s4-int" aria-label="Integrations and their status">
            {INT_COLS.map((col, c) => (
              <div key={c} className="s4-int-col">
                {col.map((t) => <div key={t.n} className="s4-int-t">{t.i}<b>{t.n}</b><small><i className={t.s === "Live" ? "is-live" : t.s === "Not connected" ? "is-off" : ""} />{t.s}</small></div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9 · results */}
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

      {/* 10 · security */}
      <section className="s4-sec" id="security" aria-labelledby="sec-title">
        <div className="s4-wrap">
          <SecHead id="sec-title" title={<TwoTone a="Built for records" b="someone has to defend" />} link={{ href: "/security", label: "Explore security" }} />
          <Tiles items={[
            { icon: <ShieldCheck size={20} />, title: "Organisation isolation", body: "Database row-level security keeps each organisation's records to its own members." },
            { icon: <KeyRound size={20} />, title: "Roles and permissions", body: "Owners, coordinators, field staff and reviewers see and change only what their role allows." },
            { icon: <History size={20} />, title: "Audit history", body: "Every change to a case writes a dated line naming who made it." },
            { icon: <Fingerprint size={20} />, title: "Provenance on every record", body: "Historical import, community report or operator-created, and whether a vet authorised it." },
            { icon: <Sparkles size={20} />, title: "Kaju cannot approve", body: "Kaju prepares; a named person confirms. It reads only what that person can read." },
            { icon: <Download size={20} />, title: "Your data, exportable", body: "Registers, evidence indexes and reports export to XLSX and CSV whenever you need them." },
          ]} />
        </div>
      </section>

      {/* 11 · FAQ */}
      <Faq items={FAQ} title="FAQs" />
      {/* 12 · closing CTA is rendered by S4Page */}
    </S4Page>
  );
}

type IntTile = { n: string; s: "Live" | "Not connected" | "Planned"; i: ReactNode };
const INT_COLS: IntTile[][] = [
  [{ n: "Excel registers", s: "Live", i: <FileSpreadsheet /> }, { n: "Email", s: "Live", i: <Mail /> }],
  [{ n: "CSV import", s: "Live", i: <Upload /> }, { n: "Phone field mode", s: "Live", i: <Smartphone /> }],
  [{ n: "Photos", s: "Live", i: <Camera /> }],
  [{ n: "WhatsApp", s: "Not connected", i: <MessageCircle /> }],
  [{ n: "Maps", s: "Live", i: <MapPin /> }],
  [{ n: "XLSX export", s: "Live", i: <ClipboardList /> }, { n: "PDF reports", s: "Live", i: <FileText /> }],
  [{ n: "Record search", s: "Live", i: <ScanSearch /> }, { n: "Reviewer access", s: "Planned", i: <UserCheck /> }],
];
