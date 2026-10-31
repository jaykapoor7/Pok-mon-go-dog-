import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, FileSpreadsheet, Inbox, Map as MapIcon, PawPrint, ShieldCheck, Sparkles, Users } from "lucide-react";
import { DemoWindow, PlatformScreens } from "@/sp3/home/Demos";
import { CtaBand, Integrations, PageHead, S3Page, SecHead, Security } from "@/sp3/site/Sections";

export const metadata = { title: "Platform · StrayPaw", description: "StrayPaw Operations, StrayPaw AI and CareOS: one system of record for street-animal programmes." };

const LAYERS = [
  { t: "StrayPaw Operations", d: "The system of record. Programmes, animals, cases, medical interventions, evidence, fieldwork, review, reports, geography and organisation management.", href: "#operations", chip: "Live" },
  { t: "StrayPaw AI", d: "The intelligence and action layer. Searches authorised records, cites them, finds gaps and prepares records and reports for you to confirm.", href: "/ai", chip: "Live · record tools" },
  { t: "CareOS", d: "The field channel. Messages, photos and locations from a phone, structured into the same records for review.", href: "/whatsapp", chip: "WhatsApp not connected" },
];

const MODULES = [
  { icon: <ClipboardList size={18} />, t: "Programmes", d: "ABC, ARV, rescue and survey programmes with their registers and figures.", href: "/ngo/programmes" },
  { icon: <PawPrint size={18} />, t: "Animals & records", d: "One history per animal, with identity, place, care and evidence.", href: "/ngo/animals" },
  { icon: <Inbox size={18} />, t: "Cases & fieldwork", d: "Inbox, work queue, follow-ups and a phone field mode.", href: "/ngo" },
  { icon: <ShieldCheck size={18} />, t: "Evidence review", d: "Missing evidence, duplicates and historical statuses resolved with a reason.", href: "/ngo/review" },
  { icon: <BarChart3 size={18} />, t: "Reports", d: "Programme, city and evidence reports built from accepted records.", href: "/ngo/proof" },
  { icon: <MapIcon size={18} />, t: "Contextual map", d: "Coverage and gaps by area, when geography helps the decision.", href: "/city" },
  { icon: <FileSpreadsheet size={18} />, t: "Imports", d: "Excel and CSV registers matched to animals with source kept.", href: "/ngo/import" },
  { icon: <Users size={18} />, t: "Organisation & access", d: "Members, roles, invitation codes and partner access.", href: "/ngo/team" },
  { icon: <Sparkles size={18} />, t: "StrayPaw AI", d: "In every workspace: ask, search, summarise, prepare.", href: "/ai" },
];

export default function PlatformPage() {
  return (
    <S3Page>
      <PageHead eyebrow="Platform" title="One system of record for street-animal operations." lede="Three connected layers over the same records. No duplicate databases, no separate AI store, no disconnected apps.">
        <div className="s3-actions"><Link href="/demo" className="s3-btn is-primary">Book a demo <ArrowRight size={16} /></Link><Link href="/app" className="s3-btn is-line">Open the app</Link></div>
      </PageHead>
      <section className="s3-wrap" style={{ paddingBottom: 56 }}>
        <div className="s3-grid-3">{LAYERS.map((l) => <Link key={l.t} href={l.href} className="s3-card s3-feature"><span className={`s3-chip ${l.chip.startsWith("Live") ? "is-live" : "is-off"}`}><i />{l.chip}</span><h3 style={{ fontSize: 21 }}>{l.t}</h3><p>{l.d}</p></Link>)}</div>
      </section>
      <section className="s3-sec is-line" id="operations"><div className="s3-wrap">
        <SecHead eyebrow="Operations" title="Everything a programme records, in one place." />
        <PlatformScreens />
      </div></section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Modules" title="Built from the work, not a template." />
        <div className="s3-grid-3">{MODULES.map((m) => <Link key={m.t} href={m.href} className="s3-card s3-feature"><span className="s3-ico" aria-hidden>{m.icon}</span><h3>{m.t}</h3><p>{m.d}</p></Link>)}</div>
      </div></section>
      <section className="s3-sec is-line" id="review"><div className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48, alignItems: "center" }} data-stack>
        <div style={{ display: "grid", gap: 16 }}><span className="s3-eyebrow">Evidence review</span><h2 className="s3-h2">Nothing counts until a person accepts it.</h2><p className="s3-lede">Incomplete records, possible duplicates and imported statuses wait in a review queue. Each decision is kept with its reason.</p></div>
        <DemoWindow view="review" title="Review queue" />
      </div></section>
      <section className="s3-sec is-line" id="reports"><div className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, alignItems: "center" }} data-stack>
        <DemoWindow view="reports" title="Monthly report" />
        <div style={{ display: "grid", gap: 16 }}><span className="s3-eyebrow">Reports</span><h2 className="s3-h2">Reports you can trace.</h2><p className="s3-lede">City and programme reports, and an Excel evidence workbook, built from the record with sources and method attached.</p><Link className="s3-link" href="/city/report">See a city report <ArrowRight size={14} /></Link></div>
      </div></section>
      <section className="s3-sec is-line" id="integrations"><div className="s3-wrap"><SecHead eyebrow="Integrations" title="Connected where it is real." /><Integrations /></div></section>
      <section className="s3-sec is-line" id="security"><div className="s3-wrap"><SecHead eyebrow="Security & trust" title="Permissions, provenance and review, by design." /><Security /></div></section>
      <CtaBand title="See it with your own programme's records." />
    </S3Page>
  );
}
