import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, Camera, MessageSquareText, ClipboardList, Download, FileSpreadsheet, FileText, Fingerprint, History,
  KeyRound, Landmark, Mail, MapPin, MessageCircle, ScanSearch, ShieldCheck, Smartphone, Sparkles, UserCheck, Plus,
} from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { Cards, S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import { AiBand, UseCases, type Step } from "@/sp4/home/Interactive";
import {
  AskUi, CaptureUi, DuplicateUi, EvidenceUi, ExtractUi, GovUi, OvernightUi, ProposeUi, ReportUi, ReviewUi, RingUi, VetUi,
} from "@/sp4/home/ui";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Blueprint } from "@/sp4/home/Blueprint";
import { HeroRotator } from "@/sp4/home/HeroRotator";
import { VideoCard } from "@/sp4/home/VideoCard";
import { Stories } from "@/sp4/home/Stories";
import { CountUp } from "@/sp4/site/Live";
import { KajuPresence } from "@/kaju/Presence";
import "@/sp4/home/home4.css";
import "@/sp4/home/landing.css";

/** Headline words that rise one after another (CSS only; static without motion). */
function Words({ lines, mark }: { lines: string[]; mark?: string }) {
  let i = 0;
  return <>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{l.split(" ").map((w) => <Fragment key={i}><span style={{ ["--i" as string]: i++ }} className={mark && w.replace(/[^\w]/g, "") === mark ? "s6-mark" : undefined}>{w}</span>{" "}</Fragment>)}</Fragment>)}</>;
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

/* The five-step journey, as it works today. Illustrative names and dates;
   direct WhatsApp is labelled as not connected until Meta approval. */
const STEPS: Step[] = [
  { tab: "1 · Receive", title: <>7:52 am, Ward 14 market gate:<br />a photo, a pin and one line.</>, body: "A field worker sends the dog's photo and location on WhatsApp. Today the team pastes or forwards those messages into Intake; the direct WhatsApp connection waits for Meta approval.", kaju: "Splits the chat into reports, masks phone numbers, reads place and urgency, and checks the register for the animal and any open case.", you: "One tap confirms each report, or all the clear ones together.", href: "/whatsapp", cta: "How intake works", ui: <ExtractUi v={0} /> },
  { tab: "2 · Register", title: <>SP-1042 or a new dog?<br />A person decides.</>, body: "An exact tag links the report to the existing profile. Anything less, such as the same locality, is shown for comparison and the new animal stays provisional until a coordinator confirms it.", kaju: "Shows likely matches side by side, with the reason for each.", you: "A coordinator confirms the identity. Nothing is merged automatically.", href: "/abc-operations#capture", cta: "Explore the register", ui: <DuplicateUi v={0} /> },
  { tab: "3 · Veterinary", title: <>Dr. Rao records Thursday&rsquo;s<br />surgeries in one sitting.</>, body: "Each procedure arrives with its capture evidence already on the animal's record. The vet records the surgery, treatment and anti-rabies vaccination.", kaju: "Lines up what each surgery still needs before it can be authorised.", you: "Only the vet authorises a procedure, in their own name.", href: "/abc-operations#vet", cta: "Explore vet sign-off", ui: <VetUi v={0} /> },
  { tab: "4 · Release", title: <>SP-1067 has no release photo.<br />You know today, not at month end.</>, body: "Recovery notes, follow-ups, the release date and a photo taken at the release spot go on the same profile and timeline, with no retyping between screens.", kaju: "Flags missing release evidence and promised reviews nobody scheduled, with the follow-up ready to confirm.", you: "The team records the release; the coordinator reviews the evidence.", href: "/abc-operations#evidence", cta: "Explore evidence", ui: <EvidenceUi v={0} /> },
  { tab: "5 · Reports & bills", title: <>October&rsquo;s claim and bill, built<br />from the records, not retyped.</>, body: "What can be claimed, what is blocked and why, and a draft bill from the contract's own rate, with PDF and Excel registers that link back to each animal.", kaju: "Prepares the month's package and checks every claim's evidence, sign-offs and arithmetic.", you: "The operator submits. The municipal office decides each claim; StrayPaw does not process payments.", href: "/for-governments", cta: "Explore municipal review", ui: <GovUi v={1} /> },
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
    <S4Page className="s6-home" announce={<Link href="/whatsapp"><b>New</b>Kaju intake: paste WhatsApp reports, get prepared records <span className="s4-announce-note">direct WhatsApp connection awaits Meta approval</span> <ArrowRight size={14} aria-hidden /></Link>} close={<div className="s4-wrap s6-closecard"><section className="s6-closecard-in s6-cta s4-close" aria-labelledby="cta-title"><Blueprint tone="dark" /><span className="s6-cta-kaju" aria-hidden><KajuPresence sequence="perch" loop size={84} /></span><div className="s6-cta-copy"><h2 id="cta-title">Put Kaju to work on your programme.</h2><p>See what Kaju would check, prepare and report on a programme like yours.</p></div><div className="s6-cta-act"><Link href="/platform" className="s4-btn is-primary">Explore the platform</Link><Link href="/contact" className="s4-btn is-line">Talk to the team</Link></div></section></div>}>
      <PageView name="landing_view" />
      <VideoCard />

      {/* 1 · hero: the copy on clean paper, the product on a blueprint of a ward */}
      <section className="s4-hero s6-hero s6-hero-tight" aria-labelledby="hero-title">
        <div className="s4-wrap s6-center">
          <h1 id="hero-title" className="s4-h1 s6-h1"><span className="sr-only">Meet Kaju, the AI agent for animal welfare programmes</span><span aria-hidden><span className="s4-words"><Words lines={["Meet Kaju, the AI agent for"]} mark="Kaju" /></span><br /><HeroRotator /></span></h1>
          <div className="s4-actions"><Link href="/demo" className="s4-btn is-primary">Book a demo</Link><Link href="#workflow" className="s4-btn is-line">See how it works</Link></div>
          <div className="s6-canvas">
            <Blueprint tone="dark" />
            <div className="s4-hero-stage s6-stage">
              {/* Kaju rests on the product window: the agent lives inside the work. */}
              <span className="s4-hero-perch" aria-hidden><KajuPresence sequence="perch" loop size={112} /></span>
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* 2 · field partners */}
      <section className="s4-wrap s4-proof" aria-labelledby="proof-title">
        <div className="s4-sechead" style={{ marginBottom: 40 }}>
          <h2 id="proof-title" className="s4-h2">Animal-welfare teams working with StrayPaw</h2>
          <Link href="/customers" className="s4-link is-ink">Hear from our partners <ArrowRight size={18} aria-hidden /></Link>
        </div>
        <div className="s4-wall s6-wall">
          {partners.map((p) => {
            const s = STORIES.find((x) => x.name === p.name);
            const tint = TINTS[[...p.name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % TINTS.length];
            const inner = <>{p.logo
              ? <span className="s6-pt-logo"><img src={p.logo} alt={`${p.name} logo`} loading="lazy" decoding="async" /></span>
              : <span className="s6-pt-av" aria-hidden style={{ ["--pt" as string]: tint }}>{p.name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(the|of|and|for)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}</span>}<span className="s6-pt-txt"><b>{p.name}</b><small><MapPin size={12} aria-hidden />{p.city}</small></span>{s && <span className="s4-cs">Case study <ArrowUpRight size={11} /></span>}</>;
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
            { title: "Knows your programme", body: "Ask for a tag, a place, a case or a task. Kaju answers from your records and names each one it used.", ui: <AskUi v={1} />, v: 2 },
            { title: "Prepares, never approves", body: "Kaju drafts cases, notes and follow-ups. Nothing is saved until a person confirms.", ui: <ProposeUi v={0} />, v: 4 },
          ]} />
          <div className="s6-three"><Cards idp="mate3" cols={3} items={[
            { title: "Notices what went quiet", body: "Kaju finds critical cases with no update, reviews promised in care notes but never scheduled, and one place spelled five ways. Follow-ups are ready to confirm.", ui: <OvernightUi v={1} />, v: 1 },
            { title: "Reads field messages", body: "Paste WhatsApp messages or a whole exported chat. Kaju checks the register for the animal and any open case, then prepares the record.", ui: <ExtractUi v={1} />, v: 3 },
            { title: "Keeps reports ready", body: "Kaju tracks evidence completion for the month, so the package is never a surprise.", ui: <RingUi />, v: 5 },
          ]} /></div>
        </div>
      </section>

      {/* 5 · recurring checks for Kaju */}
      <section className="s4-dark" aria-labelledby="ai-title">
        <div className="s4-wrap">
          <AiBand />
        </div>
      </section>

      {/* 6 · integrations */}
      <section className="s4-sec" aria-labelledby="int-title" id="integrations">
        <div className="s4-wrap s4-int-wrap">
          <div className="s4-int-head">
            <h2 id="int-title" className="s4-h2"><TwoTone blue a="Kaju works with" b="the tools your team uses." /></h2>
            <Link href="/platform#integrations" className="s4-link is-ink">Every integration and its status <ArrowRight size={18} aria-hidden /></Link>
          </div>
          <div className="s4-int s6-int-color" aria-label="Integrations and their status">
            {INT_COLS.map((col, c) => (
              <div key={c} className="s4-int-col">
                {col.map((t) => <div key={t.n} className={`s4-int-t is-${t.s === "Live" ? "live" : t.s === "Setup pending" ? "setup" : "plan"}`} style={{ ["--ic" as string]: t.c }}><span className="s6-int-ic" aria-hidden>{t.i}</span><b>{t.n}</b><small><i className={t.s === "Live" ? "is-live" : t.s === "Not connected" ? "is-off" : t.s === "Setup pending" ? "is-setup" : ""} />{t.s}</small></div>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · customer results (figures and stories; quotes appear only once a partner approves one in writing) */}
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

      {/* 8 · security */}
      <section className="s4-sec s6-security" id="security" aria-labelledby="sec-title">
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
      <section className="s6-faq2" aria-labelledby="faq-title">
        <div className="s4-wrap"><div className="s6-faq2-panel">
          <div className="s6-faq2-head">
            <h2 id="faq-title" className="s4-h2">Questions, answered</h2>
            <p>Plain answers about Kaju, your data and getting started. Something else? <Link href="/contact">Ask us</Link></p>
          </div>
          <div className="s6-faq2-grid">
            {[FAQ.slice(0, Math.ceil(FAQ.length / 2)), FAQ.slice(Math.ceil(FAQ.length / 2))].map((col, c) => (
              <div key={c} className="s6-faq2-col">
                {col.map(([q, a]) => <details key={q}><summary>{q}<Plus size={18} aria-hidden /></summary><p>{a}</p></details>)}
              </div>
            ))}
          </div>
        </div></div>
      </section>
    </S4Page>
  );
}

/* Integrations as they really stand (docs/CONNECTIONS.md). Providers use plain letter marks in their own colour, not
   their logos. "Setup pending": built and tested, waiting for the administrator's OAuth keys. "Planned": not built yet.
   Nothing here is shown as live before it is. */
const TINTS = ["#2457ce", "#0f7b8a", "#c2532d", "#6b4fd8", "#1f8a52", "#b4590f"];
type IntTile = { n: string; s: "Live" | "Setup pending" | "Not connected" | "Planned"; c: string; i: ReactNode };
const Mark = ({ l }: { l: string }) => <span className="s4-int-mark">{l}</span>;
const INT_COLS: IntTile[][] = [
  [{ n: "Google Workspace", s: "Setup pending", c: "#1a73e8", i: <Mark l="G" /> }, { n: "Excel & CSV", s: "Live", c: "#1f8a52", i: <FileSpreadsheet /> }, { n: "Email", s: "Live", c: "#2457ce", i: <Mail /> }],
  [{ n: "Microsoft 365", s: "Setup pending", c: "#0f6cbd", i: <Mark l="M" /> }, { n: "Slack", s: "Setup pending", c: "#4a154b", i: <Mark l="S" /> }, { n: "Phone field mode", s: "Live", c: "#2457ce", i: <Smartphone /> }],
  [{ n: "Zoho Mail", s: "Setup pending", c: "#c8202f", i: <Mark l="Z" /> }, { n: "Photos & GPS", s: "Live", c: "#6b4fd8", i: <Camera /> }],
  [{ n: "SMS (MSG91)", s: "Setup pending", c: "#b4590f", i: <MessageSquareText /> }, { n: "Government e-Office", s: "Planned", c: "#5b6b8c", i: <Landmark /> }],
  [{ n: "WhatsApp (direct)", s: "Not connected", c: "#1f9d55", i: <MessageCircle /> }, { n: "WhatsApp paste intake", s: "Live", c: "#1f9d55", i: <MessageCircle /> }, { n: "Map exports", s: "Live", c: "#0f7b8a", i: <MapPin /> }],
  [{ n: "PDF · Word · PowerPoint", s: "Live", c: "#c2532d", i: <FileText /> }, { n: "Reviewer access", s: "Live", c: "#0f7b8a", i: <UserCheck /> }],
  [{ n: "Record search", s: "Live", c: "#2457ce", i: <ScanSearch /> }, { n: "Report packages", s: "Live", c: "#6b4fd8", i: <ClipboardList /> }],
];
