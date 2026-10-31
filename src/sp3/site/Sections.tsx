import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Eye, FileSpreadsheet, Fingerprint, Globe2, History, KeyRound, Lock, Mail, MessageCircle, MonitorSmartphone, ScanSearch, ShieldCheck, TriangleAlert, UserCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RELATIONSHIP_LABEL, STORIES, fieldPartnerStrip } from "@/sp3/customers";
import "@/sp3/sp3.css";
import "@/sp3/home/home.css";

/** A complete public page in the 3.0 system: nav, content, footer. */
export function S3Page({ children, cta = true }: { children: ReactNode; cta?: boolean }) {
  return (
    <div className="s3">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter cta={cta} />
    </div>
  );
}

export function PageHead({ eyebrow, title, lede, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="s3-wrap s3-page-head">
      {eyebrow && <span className="s3-eyebrow">{eyebrow}</span>}
      <h1 className="s3-h1">{title}</h1>
      {lede && <p className="s3-lede">{lede}</p>}
      {children}
    </header>
  );
}

export function SecHead({ eyebrow, title, lede, center = false }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; center?: boolean }) {
  return (
    <div className={`s3-head${center ? " is-center" : ""}`}>
      {eyebrow && <span className="s3-eyebrow">{eyebrow}</span>}
      <h2 className="s3-h2">{title}</h2>
      {lede && <p className="s3-lede">{lede}</p>}
    </div>
  );
}

export function TrustStrip() {
  const list = fieldPartnerStrip();
  return (
    <div className="s3-wrap">
      <div className="s3-trust">
        <p>Field partners whose records are on StrayPaw. Each label says what the relationship actually is.</p>
        <ul>
          {list.map((p) => (
            <li key={p.name}><b>{p.name}</b><small>{p.city} · {RELATIONSHIP_LABEL[p.relationship]}</small></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const INTEGRATIONS: { name: string; d: string; status: "live" | "off" | "partial"; label: string; icon: ReactNode; href: string }[] = [
  { name: "WhatsApp (CareOS)", d: "Field intake and updates from a phone, prepared as records for review. Built against the Meta Cloud API; awaiting a verified number and Meta approval.", status: "off", label: "Not connected", icon: <MessageCircle size={19} />, href: "/whatsapp" },
  { name: "Web & mobile operations", d: "The NGO workspace, field mode on a phone, and the community report form. Works offline-tolerant on slow networks.", status: "live", label: "Live", icon: <MonitorSmartphone size={19} />, href: "/platform" },
  { name: "Excel & CSV registers", d: "Import the registers teams already keep. Rows are matched to animals, uncertain matches go to review and every row keeps its source.", status: "live", label: "Live", icon: <FileSpreadsheet size={19} />, href: "/docs#import" },
  { name: "Evidence workbook export", d: "An Excel workbook of the records behind a report, for auditors and municipal reviewers.", status: "live", label: "Live", icon: <ScanSearch size={19} />, href: "/platform#reports" },
  { name: "Public map embed", d: "Embed a partner's public programme map on its own website, with attribution and no private data.", status: "live", label: "Live", icon: <Globe2 size={19} />, href: "/explore" },
  { name: "Email notifications", d: "Invitations, access codes and reporter updates by email.", status: "live", label: "Live", icon: <Mail size={19} />, href: "/docs#access" },
];

export function Integrations() {
  return (
    <div className="s3h-int">
      {INTEGRATIONS.map((i) => (
        <Link key={i.name} href={i.href} className="s3-card">
          <header><span className="s3-ico" aria-hidden>{i.icon}</span><b>{i.name}</b><span className={`s3-chip ${i.status === "live" ? "is-live" : "is-off"}`}><i />{i.label}</span></header>
          <p>{i.d}</p>
        </Link>
      ))}
    </div>
  );
}

export function Security() {
  const items: [ReactNode, string, string][] = [
    [<Fingerprint key="p" size={20} />, "Provenance on every record", "Each record keeps where it came from: a field entry, a report, or a named imported register. Imported history is never shown as live work."],
    [<UserCheck key="r" size={20} />, "People approve, not the AI", "Records count only after a person accepts them. StrayPaw AI prepares and suggests; it cannot approve procedures, certify fieldwork or authorise payments."],
    [<KeyRound key="k" size={20} />, "Permissions in the database", "Row-level security decides every read and write by organisation and role. Hiding a button is never the guard, and the AI reads with your own session."],
    [<Eye key="e" size={20} />, "Privacy by default", "Public views show areas, not exact locations. Reporter identity, veterinary notes and organisation data stay private to the people allowed to see them."],
    [<History key="h" size={20} />, "An audit history", "Status changes, notes, follow-ups and reviews are kept on the record with who did them and when, including actions prepared with StrayPaw AI."],
    [<TriangleAlert key="t" size={20} />, "Honest limitations", "Recorded is not the same as true population. Gaps are shown as gaps. Integrations that are not connected say so."],
  ];
  return <div className="s3h-sec">{items.map(([icon, t, d]) => <div key={t}>{icon}<b>{t}</b><p>{d}</p></div>)}</div>;
}

export function StoryCard({ slug }: { slug: string }) {
  const s = STORIES.find((x) => x.slug === slug);
  if (!s) return null;
  return (
    <article className="s3-story">
      <div className="s3-story-copy">
        <div style={{ display: "grid", gap: 14 }}>
          <span className="s3-chip">{s.city} · {RELATIONSHIP_LABEL[s.relationship]}</span>
          <h3>{s.name}: {s.summary.charAt(0).toLowerCase() + s.summary.slice(1)}</h3>
          <p>{s.problem}</p>
        </div>
        <Link className="s3-link" href={`/customers/${s.slug}`}>Read the case study <ArrowRight size={14} /></Link>
      </div>
      <div className="s3-story-figs">
        {s.results.map((r) => <div key={r.label}><b className="s3-num">{r.n.toLocaleString("en-IN")}</b><span>{r.label}</span><small>{r.note}</small></div>)}
        <div><small><Lock size={11} style={{ verticalAlign: -1 }} /> Imported historical register. Time savings not yet measured.</small></div>
      </div>
    </article>
  );
}

export function CtaBand({ title, lede, primary = { href: "/demo", label: "Book a demo" }, secondary }: { title: ReactNode; lede?: ReactNode; primary?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <section className="s3-sec is-tight">
      <div className="s3-wrap">
        <div className="s3-panel" style={{ padding: "44px", display: "grid", gap: 18, justifyItems: "start" }}>
          <h2 className="s3-h2" style={{ maxWidth: 760 }}>{title}</h2>
          {lede && <p className="s3-lede">{lede}</p>}
          <div className="s3-actions">
            <Link href={primary.href} className="s3-btn is-primary">{primary.label} <ArrowRight size={16} /></Link>
            {secondary && <Link href={secondary.href} className="s3-btn is-line">{secondary.label}</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Check3({ children }: { children: ReactNode }) {
  return <li style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10 }}><ShieldCheck size={17} style={{ marginTop: 3, color: "var(--s3-blue)" }} /><span>{children}</span></li>;
}
