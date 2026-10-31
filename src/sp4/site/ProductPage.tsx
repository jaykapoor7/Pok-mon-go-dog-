import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { Close, Faq, S4Page, SecHead, Tiles, TwoTone, type TileSpec } from "@/sp4/site/kit";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import "@/sp4/home/home4.css";

/* ════════════════════════════════════════════════════════════════════
   One template for every StrayPaw 4 product and solution page:
   hero (optionally dark) over a textured product tile · pillars ·
   alternating feature splits · a dark module grid · tiles · an honesty
   note · FAQ · closing call to action. Each page is a spec.
   ════════════════════════════════════════════════════════════════════ */

type Pair = [ReactNode, ReactNode?];
type L = { href: string; label: string };

export type ProductSpec = {
  id: string;
  dark?: boolean;
  eyebrow?: ReactNode;
  title: Pair;
  lede: ReactNode;
  primary?: L;
  secondary?: L;
  hero: ReactNode;
  heroV?: number;
  strip?: ReactNode;
  pillars?: { title: Pair; lede?: ReactNode; items: { t: string; d: ReactNode }[] };
  steps?: { title: Pair; lede?: ReactNode; items: { t: string; d: ReactNode }[] };
  splits?: { id?: string; tag?: ReactNode; title: Pair; body: ReactNode; points?: ReactNode[]; link?: L; ui: ReactNode; v?: number }[];
  modules?: { title: Pair; lede?: ReactNode; items: { label: string; t: string; d: ReactNode; href: string; cta: string }[] };
  tiles?: { id?: string; title: Pair; link?: L; items: TileSpec[] };
  note?: ReactNode;
  extra?: ReactNode;
  faq?: [string, ReactNode][];
  close?: { a: ReactNode; b: ReactNode; primary?: L; secondary?: L | null };
};

export function ProductPage({ s }: { s: ProductSpec }) {
  return (
    <S4Page close={false}>
      <section className={`s4-pp-hero${s.dark ? " is-dark" : ""}`} aria-labelledby={`${s.id}-title`}>
        <div className="s4-wrap">
          {s.eyebrow && <span className="s4-eyebrow">{s.eyebrow}</span>}
          <h1 id={`${s.id}-title`} className="s4-h1" style={{ maxWidth: 940 }}><TwoTone a={s.title[0]} b={s.title[1]} /></h1>
          <p className="s4-lede">{s.lede}</p>
          {(s.primary || s.secondary) && (
            <div className="s4-actions">
              {s.primary && <Link href={s.primary.href} className="s4-btn is-primary">{s.primary.label} <ArrowRight size={17} aria-hidden /></Link>}
              {s.secondary && <Link href={s.secondary.href} className={`s4-btn ${s.dark ? "is-ghost-d" : "is-line"}`}>{s.secondary.label}</Link>}
            </div>
          )}
          <Grain v={s.heroV ?? 0} id={`${s.id}-hero`} dark={false} className="s4-pp-art">{s.hero}</Grain>
          {s.strip && <div className="s4-pp-strip">{s.strip}</div>}
        </div>
      </section>

      {s.pillars && (
        <section className="s4-sec" aria-labelledby={`${s.id}-pil`}>
          <div className="s4-wrap">
            <SecHead id={`${s.id}-pil`} title={<TwoTone a={s.pillars.title[0]} b={s.pillars.title[1]} />} lede={s.pillars.lede} />
            <div className="s4-pillars">{s.pillars.items.map((p) => <Rise key={p.t}><h3>{p.t}</h3><p>{p.d}</p></Rise>)}</div>
          </div>
        </section>
      )}

      {s.steps && (
        <section className="s4-sec" aria-labelledby={`${s.id}-steps`}>
          <div className="s4-wrap">
            <SecHead id={`${s.id}-steps`} title={<TwoTone a={s.steps.title[0]} b={s.steps.title[1]} />} lede={s.steps.lede} />
            <ol className="s4-steps">{s.steps.items.map((p) => <li key={p.t}><b>{p.t}</b><p>{p.d}</p></li>)}</ol>
          </div>
        </section>
      )}

      {s.splits?.map((f, n) => (
        <section key={n} id={f.id} className="s4-sec" aria-labelledby={`${s.id}-sp${n}`} style={{ scrollMarginTop: 80 }}>
          <div className={`s4-wrap s4-split${n % 2 ? " is-flip" : ""}`}>
            <Rise className="s4-split-copy">
              {f.tag && <span style={{ justifySelf: "start" }}>{f.tag}</span>}
              <h2 id={`${s.id}-sp${n}`} className="s4-h2" style={{ fontSize: "clamp(31px, 3.4vw, 44px)" }}><TwoTone a={f.title[0]} b={f.title[1]} /></h2>
              <p className="s4-lede">{f.body}</p>
              {f.points && <ul>{f.points.map((p, i) => <li key={i}><Check size={18} aria-hidden />{p}</li>)}</ul>}
              {f.link && <Link href={f.link.href} className="s4-link">{f.link.label} <ArrowRight size={18} aria-hidden /></Link>}
            </Rise>
            <Grain v={f.v ?? n + 1} id={`${s.id}-art${n}`} className="s4-split-art">{f.ui}</Grain>
          </div>
        </section>
      ))}

      {s.modules && (
        <section className="s4-dark" id="modules" aria-labelledby={`${s.id}-mod`} style={{ scrollMarginTop: 72 }}>
          <div className="s4-wrap">
            <div style={{ textAlign: "center", display: "grid", justifyItems: "center", gap: 20 }}>
              <h2 id={`${s.id}-mod`} className="s4-h2"><TwoTone a={s.modules.title[0]} b={s.modules.title[1]} /></h2>
              {s.modules.lede && <p className="s4-lede">{s.modules.lede}</p>}
            </div>
            <div className="s4-modules">
              {s.modules.items.map((m, i) => (
                <Rise key={m.t} className="s4-module" delay={(i % 3) * 60}>
                  <span>{m.label}</span><h3>{m.t}</h3><p>{m.d}</p>
                  <Link href={m.href}>{m.cta} <ArrowRight size={14} aria-hidden /></Link>
                </Rise>
              ))}
            </div>
          </div>
        </section>
      )}

      {s.tiles && (
        <section className="s4-sec" id={s.tiles.id} aria-labelledby={`${s.id}-tiles`} style={{ scrollMarginTop: 80 }}>
          <div className="s4-wrap">
            <SecHead id={`${s.id}-tiles`} title={<TwoTone a={s.tiles.title[0]} b={s.tiles.title[1]} />} link={s.tiles.link} />
            <Tiles items={s.tiles.items} />
          </div>
        </section>
      )}

      {s.extra}

      {s.note && (
        <section className="s4-sec"><div className="s4-wrap"><Rise className="s4-note"><Info size={20} aria-hidden /><div>{s.note}</div></Rise></div></section>
      )}

      {s.faq && <Faq items={s.faq} />}
      <Close a={s.close?.a} b={s.close?.b} primary={s.close?.primary} secondary={s.close?.secondary} />
    </S4Page>
  );
}

/** A status tag for capabilities: say what is live and what is not. */
export function Status({ s }: { s: "live" | "staging" | "off" | "planned" }) {
  const map = { live: ["is-green", "Live"], staging: ["is-blue", "In staging · pilot next"], off: ["is-amber", "Not connected"], planned: ["", "Planned"] } as const;
  const [c, t] = map[s];
  return <span className={`s4-tag ${c}`}>{t}</span>;
}
