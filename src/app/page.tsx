import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Camera, MessageSquareText, ClipboardList, Download, FileSpreadsheet, FileText, Fingerprint, History, KeyRound, Landmark, Mail, MapPin, MessageCircle, ScanSearch, ShieldCheck, Smartphone, Sparkles, UserCheck } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Blueprint } from "@/sp4/home/Blueprint";
import { HeroRotator } from "@/sp4/home/HeroRotator";
import { Announce } from "@/sp4/home/v7/Announce";
import { Welcome } from "@/sp4/home/v7/Welcome";
import { FiveSteps } from "@/sp4/home/v7/FiveSteps";
import { CloseAndQuestions, Recurring, Results, Teammate, ToolsAccordion } from "@/sp4/home/v7/Sections";
import "@/sp4/home/v7/landing7.css";
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
    <S4Page className="s6-home s7-home" announce={<Announce />} close={false}>
      <PageView name="landing_view" />
      <Welcome />

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

      {/* 3 · use cases: the five steps, each a full product screen with what Kaju does in it */}
      <FiveSteps />

      {/* 4 · Kaju as a teammate */}
      <Teammate />

      {/* 5 · recurring work, with Kaju agents */}
      <Recurring />

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

      {/* 6b · Kaju inside each tool: one open, the others expand on hover */}
      <ToolsAccordion />

      {/* 7 · customer results: recorded figures, no quotes until a partner approves one in writing */}
      <Results
        stats={[
          { n: (story.results[0]?.n ?? 0).toLocaleString("en-IN"), label: "rescue requests on one record, Coimbatore" },
          { n: (kh.results[0]?.n ?? 0).toLocaleString("en-IN"), label: "rescue and treatment requests, Lucknow" },
          { n: String(partners.length), label: "field partners across India" },
        ]}
        cards={partners.slice(0, 6).map((p, i) => {
          // Partners with a case study first; quotes appear only once a partner approves one in writing.
          const s = STORIES.find((x) => x.name === p.name);
          return {
            slug: s?.slug, name: p.name, city: p.city, logo: p.logo, color: TINTS[i % TINTS.length],
            figure: s ? (s.results[0]?.n ?? 0).toLocaleString("en-IN") : undefined, figureLabel: s ? ` ${s.results[0]?.label}` : undefined,
            line: s ? s.summary : `${p.name} works with StrayPaw in ${p.city}.`,
            note: s ? "From imported historical registers, not work entered live in StrayPaw." : undefined,
          };
        })}
      />

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

      {/* 9 · put Kaju to work, then common questions */}
      <CloseAndQuestions faq={FAQ} />
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
