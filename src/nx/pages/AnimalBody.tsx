"use client";

import Link from "next/link";
import { ArrowUpRight, Check as Tick, FileText, Info, Sparkles } from "lucide-react";
import { Chip, TrustChip } from "../ui";
import { FILES, OPEN_WORK, RELATED, THREAD, TIMELINE, type Animal } from "../fixtures";

const tone = (v: string) => (/^(Sterilised|Vaccinated|Verified)$/.test(v) ? "ok" : /Due|review/i.test(v) ? "warn" : "plain") as "ok" | "warn" | "plain";

/** An animal's record: what is known on the left, what happened in the middle, what is open on the right.
    The same parts stack in one column inside the drawer. */
export function AnimalBody({ a, drawer }: { a: Animal; drawer?: boolean }) {
  return (
    <div className={`nx-rec ${drawer ? "is-drawer" : ""}`}>
      <section aria-label="Details">
        <h3 className="nx-h3">Details</h3>
        <dl className="nx-props">
          <div><dt>Animal ID</dt><dd className="num">{a.id}</dd></div>
          <div><dt>Species</dt><dd>{a.species}</dd></div>
          <div><dt>Sex</dt><dd>{a.sex}</dd></div>
          <div><dt>Est. age</dt><dd>{a.age}</dd></div>
          <div><dt>Place</dt><dd>{a.ward}</dd></div>
          <div><dt>Marks</dt><dd style={{ fontWeight: 400 }}>{a.mark}</dd></div>
          <div><dt>Sterilisation</dt><dd><Chip tone={tone(a.abc)}>{a.abc}</Chip></dd></div>
          <div><dt>Vaccination</dt><dd><Chip tone={tone(a.arv)}>{a.arv}</Chip></dd></div>
          <div><dt>Identity</dt><dd><Chip tone={tone(a.identity)}>{a.identity}</Chip></dd></div>
          <div><dt>Record</dt><dd><TrustChip trust={a.trust} /></dd></div>
          <div><dt>Next</dt><dd style={{ fontWeight: 400 }}>{a.next}</dd></div>
        </dl>
        <h3 className="nx-h3">Related</h3>
        <div className="nx-rel">{RELATED.map((r) => <a key={r.ref} href="#"><ArrowUpRight size={13} /><span className="num">{r.ref}</span><span style={{ color: "var(--ink-3)" }}>{r.what}</span><small>{r.state}</small></a>)}</div>
      </section>

      <section aria-label="Activity and medical history">
        <h3 className="nx-h3">Activity and medical history</h3>
        <ol className="nx-tl">
          {TIMELINE.map((e) => (
            <li key={e.title}>
              <span className={`nx-tl-d ${e.tone === "ok" ? "t-ok" : e.tone === "accent" ? "t-accent" : ""}`}>{e.tone === "ok" ? <Tick size={10} strokeWidth={3} /> : null}</span>
              <div><b>{e.title}</b><small>{e.when} · {e.by}</small><p>{e.body}</p><div className="nx-tl-c">{e.chips.map(([c, t]) => <Chip key={c} tone={t}>{c}</Chip>)}</div></div>
            </li>
          ))}
        </ol>
        <p className="nx-note"><Info size={13} /><span>A field record, a clinician&apos;s signature and a municipal verification are three separate steps. Each chip says which one it is.</span></p>
      </section>

      <section aria-label="Open work, conversation and files">
        <h3 className="nx-h3">Open work <span className="nx-count">{OPEN_WORK.length}</span></h3>
        <ul className="nx-feed">{OPEN_WORK.map((w) => <li key={w.title} style={{ gridTemplateColumns: "16px minmax(0,1fr)" }}><span className="nx-check" aria-hidden /><div><b>{w.title}</b><small>{w.note}</small></div></li>)}</ul>
        <h3 className="nx-h3">Conversation</h3>
        <ul className="nx-feed">
          {THREAD.map((m) => <li key={m.text}><span className={`nx-feed-i ${m.who === "Kaju" ? "is-kaju" : ""}`} style={{ fontSize: 9, fontWeight: 700 }}>{m.who === "Kaju" ? <Sparkles size={12} /> : m.who.split(" ").map((w) => w[0]).join("")}</span><div><p><b style={{ display: "inline", color: "var(--ink)" }}>{m.who}</b> <small>{m.when}</small></p><p>{m.text}</p></div></li>)}
        </ul>
        <h3 className="nx-h3">Files <span className="nx-count">{FILES.length}</span></h3>
        <div className="nx-rel">{FILES.map((f) => <a key={f} href="#"><FileText size={13} />{f}</a>)}</div>
        {drawer ? <p style={{ marginTop: 18 }}><Link href={`/next/ngo/animals/${a.id}`} className="nx-btn is-quiet">Open full record</Link></p> : null}
      </section>
    </div>
  );
}
