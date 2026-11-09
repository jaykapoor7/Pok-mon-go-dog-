import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, PawPrint, Camera, MessageSquareText, ClipboardList, FileText, Landmark, Mail, MapPin, ScanSearch, Smartphone, UserCheck } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { Cards, S4Page, SecHead, TwoTone } from "@/sp4/site/kit";
import { HeroDemo } from "@/sp4/home/HeroDemo";
import { Blueprint } from "@/sp4/home/Blueprint";
import { Announce, DemoAnnounce } from "@/sp4/home/v7/Announce";
import { DEMO_SITE, LIVE_DEMO_PUBLIC, LIVE_DEMO_URL } from "@/lib/demo-site";
import { FiveSteps } from "@/sp4/home/v7/FiveSteps";
import { CloseAndQuestions, Results } from "@/sp4/home/v7/Sections";
import { AskUi, OvernightUi, ProposeUi } from "@/sp4/home/ui";
import { Pilot, Problem, Sides } from "@/sp5/home/Story";
import { AuditTrail, HeroScroll, Reveal } from "@/sp4/home/v7/Extras";
import "@/sp4/home/v7/landing7.css";
import { KajuPresence } from "@/kaju/Presence";
import "@/sp4/home/home4.css";
import "@/sp4/home/landing.css";

/** Headline words that rise one after another (CSS only; static without motion). */
function Words({ lines, mark, start = 0 }: { lines: string[]; mark?: string; start?: number }) {
  let i = start;
  return <>{lines.map((l, li) => <Fragment key={li}>{li > 0 && <br />}{l.split(" ").map((w) => <Fragment key={i}><span style={{ ["--i" as string]: i++ }} className={mark && w.replace(/[^\w]/g, "") === mark ? "s6-mark" : undefined}>{w}</span>{" "}</Fragment>)}</Fragment>)}</>;
}

export const metadata = {
  title: "StrayPaw · One verifiable record for animal welfare programmes",
  description: "StrayPaw connects field teams, vets, NGOs and municipal offices on one shared record, from the first report to the accepted monthly claim. Kaju, its AI agent, prepares the work; people approve it.",
};

/* ════════════════════════════════════════════════════════════════════
   Homepage (StrayPaw 5), told in the order a new visitor needs it:

   1 hero        what StrayPaw is, on the real product window
   2 partners    who works with it
   3 problem     the record lives in five places
   4 workflow    one record, five steps (pinned scroller)
   5 two sides   the operator prepares, the office decides
   6 evidence    every change has a name and a time
   7 intelligence  Kaju reads the record; integrations as they stand
   8 results     recorded figures from imported registers
   9 pilot       start with one programme
   10 questions and close

   Buyer: the municipal office that funds ABC and anti-rabies work, and
   the operators it funds. StrayPaw is the platform; Kaju is its agent.
   Everything shown is the product's own interface with illustrative,
   labelled records.
   ════════════════════════════════════════════════════════════════════ */

const FAQ: [string, string][] = [
  ["What is StrayPaw?", "One shared record for animal welfare programmes. Field teams capture, vets sign, coordinators approve evidence and the municipal office reviews the monthly package, all on the same animals."],
  ["What is Kaju?", "Kaju is StrayPaw's AI agent. It works across capture, vet sign-off, evidence, reports and municipal review, using your organisation's own records."],
  ["How is Kaju different from ChatGPT or Claude?", "Kaju works inside StrayPaw, on your programme's records, with your permissions. Every answer names the records it used, and every change is prepared for a person to confirm."],
  ["Can Kaju approve a procedure or a bill?", "No. Kaju prepares; people decide. Vets authorise procedures, coordinators approve evidence and the municipal office accepts the package, each in their own name."],
  ["Does Kaju train on our data?", "No. Your records are not used to train models and are never shared with other organisations."],
  ["How do we get started?", "With a scoped pilot on one programme. We import your current registers, set up your team and agree the scope in writing first."],
  ["Can we bring our existing registers?", "Yes. Excel and CSV registers import as they are. Imported rows stay labelled as historical until checked through the workflow."],
  ["How does pricing work?", "Pricing is agreed per programme before work begins. NGOs and small welfare groups can ask about an accessible plan."],
];

export default function HomePage() {
  const partners = fieldPartnerStrip();
  const story = STORIES[0];
  const kh = STORIES[1];
  return (
    <S4Page className="s6-home s7-home s8-home" announce={DEMO_SITE ? <DemoAnnounce /> : <Announce />} close={false}>
      <PageView name="landing_view" />
      <Reveal />

      {/* 1 · hero: what it is in one sentence, then the product itself */}
      <section className="s4-hero s6-hero s6-hero-tight" aria-labelledby="hero-title">
        <div className="s4-wrap s6-center">
          <h1 id="hero-title" className="s4-h1 s6-h1"><span className="sr-only">Every street animal on one record. Every step verified.</span><span aria-hidden><span className="s4-words"><Words lines={["Every street animal", "on one record."]} /></span><br /><span className="s4-words s8-h1-b"><Words lines={["Every step verified."]} start={6} /></span></span></h1>
          <p className="s7-hero-sub">StrayPaw connects field teams, vets, NGOs and municipal offices on one shared record, from the first report to the accepted monthly claim. Kaju, its AI agent, prepares the work. People approve it.</p>
          <div className="s4-actions">{DEMO_SITE
            ? <><Link href="/try?go=1" className="s4-btn is-primary">Start the live demo</Link><Link href="/try" className="s4-btn is-line">Explore as a role</Link></>
            : <><Link href="/demo" className="s4-btn is-primary">Book a demo</Link>{LIVE_DEMO_PUBLIC ? <a href={LIVE_DEMO_URL} className="s4-btn is-line">Try the live demo</a> : <Link href="#workflow" className="s4-btn is-line">See how it works</Link>}</>}</div>
          <ul className="s8-roles" aria-label="Who works in StrayPaw"><li>Field teams</li><li>Veterinarians</li><li>NGO coordinators</li><li>Municipal reviewers</li></ul>
          <HeroScroll />
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
            const inner = <>{p.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <span className="s6-pt-logo"><img src={p.logo} alt={`${p.name} logo`} loading="lazy" decoding="async" /></span>
              : <span className="s6-pt-logo s6-pt-word" aria-hidden><PawPrint size={22} /><b>{p.name}</b></span>}<span className="s6-pt-txt"><b>{p.name}</b><small><MapPin size={12} aria-hidden />{p.city}</small></span>{s && <span className="s4-cs">Case study <ArrowUpRight size={11} /></span>}</>;
            return s ? <Link key={p.name} href={`/customers/${s.slug}`} aria-label={`${p.name} case study`}>{inner}</Link> : <div key={p.name}>{inner}</div>;
          })}
        </div>
        {/* Phones: one calm moving row of partner logos instead of a long wall of uneven cards. */}
        <div className="s7-pmarq" aria-label="Partner organisations">
          <div className="s7-pmarq-track">
            {[0, 1].map((copy) => partners.map((p) => (
              <span key={`${copy}-${p.name}`} className="s7-pmarq-t" aria-hidden={copy === 1 || undefined}>
                {p.logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logo} alt={copy === 0 ? p.name : ""} loading="lazy" decoding="async" />
                  : <span className="s7-pmarq-word"><PawPrint size={16} aria-hidden />{p.name}</span>}
              </span>
            )))}
          </div>
        </div>
      </section>

      {/* 3 · the problem */}
      <Problem />

      {/* 4 · how it works: the five steps, each a full product screen */}
      <FiveSteps title="One record, five steps." />

      {/* 5 · connected workflows: operator and office on the same package */}
      <Sides />

      {/* 6 · evidence and verification */}
      <section className="s4-sec s6-security" id="security" aria-labelledby="sec-title">
        <div className="s4-wrap">
          <SecHead id="sec-title" title={<TwoTone a="Every change has a name" b="and a time." />} lede="Built for public money: nothing is deleted, nothing is approved by software, and every figure opens the records behind it." link={{ href: "/security", label: "Explore security" }} />
          <AuditTrail />
        </div>
      </section>

      {/* 7 · intelligence: Kaju on the record, then the tools it reaches */}
      <section className="s4-sec s8-intel" id="kaju" aria-labelledby="intel-title">
        <div className="s4-wrap">
          <SecHead id="intel-title" title={<TwoTone blue a="Kaju reads the record," b="so your team can act on it." />} lede="Kaju is StrayPaw's AI agent. It answers from your own records, names the rows it used and prepares the next step for a person to confirm." link={{ href: "/kaju-agents", label: "See what Kaju does" }} />
          <Cards idp="intel" items={[
            { title: "Ask in plain words", body: "Which releases are missing a photo? Kaju answers with the records it read.", ui: <AskUi />, v: 0 },
            { title: "Checks while you sleep", body: "Overnight checks find duplicates, gaps and late follow-ups before the morning brief.", ui: <OvernightUi />, v: 3 },
            { title: "Prepares, never approves", body: "Every change is a card that says exactly what will be saved. A named person confirms it.", ui: <ProposeUi />, v: 1 },
          ]} />
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="int-title" id="integrations">
        <div className="s4-wrap s4-int-wrap">
          <div className="s4-int-head">
            <h2 id="int-title" className="s4-h2"><TwoTone blue a="Works with" b="the tools your team uses." /></h2>
            <Link href="/platform#integrations" className="s4-link is-ink">Every integration and its status <ArrowRight size={18} aria-hidden /></Link>
          </div>
          <div className="s4-int s6-int-color" aria-label="Integrations and their status">
            {INT_COLS.map((col, c) => (
              <div key={c} className="s4-int-col">
                {col.map((t) => <div key={t.n} className={`s4-int-t is-${t.s === "Live" ? "live" : t.s === "Setup pending" ? "setup" : "plan"}`} style={{ ["--ic" as string]: t.c }}><span className="s6-int-ic" aria-hidden>{t.i}</span><b>{t.n}</b><small><i className={t.s === "Live" ? "is-live" : t.s === "Not connected" ? "is-off" : t.s === "Setup pending" ? "is-setup" : ""} />{t.s}</small></div>)}
              </div>
            ))}
          </div>
          <p className="s7-int-key" aria-hidden><span><i className="is-live" />Live</span><span><i className="is-setup" />Setup pending</span></p>
        </div>
      </section>

      {/* 8 · results: recorded figures, no quotes until a partner approves one in writing */}
      <Results
        stats={[
          { n: story.results[0]?.n ?? 0, label: "rescue requests on one record, Coimbatore" },
          { n: story.results[1]?.n ?? 0, label: "sterilisations in one drive register, Coimbatore" },
          { n: kh.results[0]?.n ?? 0, label: "rescue and treatment requests, Lucknow" },
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

      {/* 9 · why explore a pilot */}
      <Pilot demoHref={DEMO_SITE ? "/try?go=1" : "/demo"} />

      {/* 10 · common questions, then the close */}
      <CloseAndQuestions faq={FAQ} />

    </S4Page>
  );
}

/* Integrations as they really stand (docs/CONNECTIONS.md). Providers use plain letter marks in their own colour, not
   their logos. "Setup pending": built and tested, waiting for the administrator's OAuth keys. "Planned": not built yet.
   Nothing here is shown as live before it is. */
const TINTS = ["#1e3a6e", "#2f4a63", "#2c4f8f", "#3b4a5e", "#25507a", "#344868"];
type IntTile = { n: string; s: "Live" | "Setup pending" | "Not connected" | "Planned"; c: string; i: ReactNode };
/* Real brand marks for the tools Kaju connects to (gilbarbara/logos, CC0); generic tools keep an icon. */
// eslint-disable-next-line @next/next/no-img-element
const Logo = ({ src }: { src: string }) => <img className="s4-int-logo" src={`/brand/tools/${src}.svg`} alt="" width={34} height={34} />;
const INT_COLS: IntTile[][] = [
  [{ n: "Google Workspace", s: "Setup pending", c: "#1a73e8", i: <Logo src="google-icon" /> }, { n: "Excel & CSV", s: "Live", c: "#1f8a52", i: <Logo src="excel" /> }, { n: "Email", s: "Live", c: "#2457ce", i: <Logo src="google-gmail" /> }],
  [{ n: "Microsoft 365", s: "Setup pending", c: "#0f6cbd", i: <Logo src="microsoft-icon" /> }, { n: "Slack", s: "Setup pending", c: "#4a154b", i: <Logo src="slack-icon" /> }, { n: "Phone field mode", s: "Live", c: "#2457ce", i: <Smartphone /> }],
  [{ n: "Zoho Mail", s: "Setup pending", c: "#c8202f", i: <Logo src="zoho" /> }, { n: "Photos & GPS", s: "Live", c: "#6b4fd8", i: <Camera /> }],
  [{ n: "SMS (MSG91)", s: "Setup pending", c: "#b4590f", i: <MessageSquareText /> }, { n: "Government e-Office", s: "Planned", c: "#5b6b8c", i: <Landmark /> }],
  [{ n: "WhatsApp (direct)", s: "Not connected", c: "#1f9d55", i: <Logo src="whatsapp-icon" /> }, { n: "WhatsApp paste intake", s: "Live", c: "#1f9d55", i: <Logo src="whatsapp-icon" /> }, { n: "Map exports", s: "Live", c: "#0f7b8a", i: <MapPin /> }],
  [{ n: "PDF · Word · PowerPoint", s: "Live", c: "#c2532d", i: <FileText /> }, { n: "Reviewer access", s: "Live", c: "#0f7b8a", i: <UserCheck /> }],
  [{ n: "Record search", s: "Live", c: "#2457ce", i: <ScanSearch /> }, { n: "Report packages", s: "Live", c: "#6b4fd8", i: <ClipboardList /> }],
];
