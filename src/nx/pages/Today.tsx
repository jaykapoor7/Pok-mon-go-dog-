"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera, Clock, Plus, Sparkles } from "lucide-react";
import { Shell } from "../Shell";
import { Check, Chip, Sample } from "../ui";
import { FIGS, ME, ORG, PREPARED, TEAM, VISITS, WORK, type Work } from "../fixtures";

const COLS = "22px minmax(0, 1fr) 132px 104px 138px 64px";
const GROUPS: Work["group"][] = ["Now", "Today", "This week"];

function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

export function Today() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const calm = useReducedMotion();
  const toggle = (id: string) => setDone((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const open = WORK.filter((w) => !done.has(w.id)), closed = WORK.filter((w) => done.has(w.id));
  const date = useMemo(() => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }), []);
  const spring = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 42, mass: .7 };

  const row = (w: Work, isDone: boolean) => (
    <motion.li key={w.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={spring}>
      <div className={`nx-tr is-work ${isDone ? "nx-row-done" : ""}`} style={{ gridTemplateColumns: COLS }}>
        <Check done={isDone} onClick={() => toggle(w.id)} label={isDone ? `Reopen: ${w.title}` : `Mark done: ${w.title}`} />
        <Link href={w.animal ? `/next/ngo/animals/${w.animal}` : "/next/ngo/animals"} className="nx-cell-main"><span><b>{w.title}</b><small>{w.ref} · {w.kind}<span className="nx-only-s"> · {w.place}</span></small></span></Link>
        <span className="nx-t2 nx-hide-s">{w.who}</span>
        <span className="nx-t2 nx-hide-s">{w.place}</span>
        <span>{isDone ? <Chip tone="ok">Done</Chip> : <Chip tone={w.tone}>{w.state}</Chip>}</span>
        <span className="nx-t3 nx-hide-s">{w.when}</span>
      </div>
    </motion.li>
  );

  return (
    <Shell crumb={["Today"]}>
      <div className="nx-page">
        <div className="nx-head">
          <div>
            <p className="nx-eyebrow">{date} · {ORG.city}<Sample /></p>
            <h1 className="nx-h1">{greeting()}, {ME.name}</h1>
            <p className="nx-sub"><b className="num">{open.length}</b> {open.length === 1 ? "thing needs" : "things need"} you. Kaju has prepared {PREPARED.length}.</p>
          </div>
          <button type="button" className="nx-btn"><Plus size={14} />New case</button>
        </div>

        <div className="nx-figs">
          {FIGS.map((f) => <Link key={f.label} href={f.href} className="nx-fig"><b>{f.n}{f.note ? <em>{f.note}</em> : null}</b><span>{f.label}<ArrowRight size={12} /></span></Link>)}
        </div>

        <div className="nx-cols">
          <div>
            <section className="nx-sec" aria-labelledby="t-work">
              <div className="nx-sec-h"><h2 id="t-work">My work</h2><span className="nx-count">{open.length}</span><Link href="/next/ngo/animals">All work <ArrowRight size={12} /></Link></div>
              <div className="nx-table">
                <div className="nx-tr nx-th" style={{ gridTemplateColumns: COLS }}><span /><span>Record</span><span>Assigned to</span><span>Place</span><span>State</span><span>Updated</span></div>
                <LayoutGroup>
                  {GROUPS.map((g) => {
                    const rows = open.filter((w) => w.group === g);
                    if (!rows.length) return null;
                    return <div key={g}><motion.div layout="position" transition={spring} className="nx-tr nx-th" style={{ gridTemplateColumns: "1fr", minHeight: 28 }}><span>{g} <span className="nx-count">{rows.length}</span></span></motion.div><ul><AnimatePresence initial={false} mode="popLayout">{rows.map((w) => row(w, false))}</AnimatePresence></ul></div>;
                  })}
                  {closed.length ? <div><motion.div layout="position" transition={spring} className="nx-tr nx-th" style={{ gridTemplateColumns: "1fr", minHeight: 28 }}><span>Done <span className="nx-count">{closed.length}</span></span></motion.div><ul><AnimatePresence initial={false} mode="popLayout">{closed.map((w) => row(w, true))}</AnimatePresence></ul></div> : null}
                </LayoutGroup>
              </div>
            </section>

            <section className="nx-sec" aria-labelledby="t-visits">
              <div className="nx-sec-h"><h2 id="t-visits">Next visits</h2><span className="nx-count">{VISITS.length}</span></div>
              <ul className="nx-table">
                {VISITS.map((v) => <li key={v.what} className="nx-tr is-visit" style={{ gridTemplateColumns: "22px 108px minmax(0, 1fr) auto" }}><Clock size={14} style={{ color: "var(--ink-3)" }} /><span className="nx-t3 nx-hide-s">{v.when}</span><span className="nx-cell-main"><span><b>{v.what}</b><small className="nx-only-s">{v.when}</small></span></span><span className="nx-t2">{v.who}</span></li>)}
              </ul>
            </section>
          </div>

          <aside>
            <section className="nx-sec" aria-labelledby="t-kaju">
              <div className="nx-sec-h"><h2 id="t-kaju">Kaju prepared</h2><span className="nx-count">{PREPARED.length}</span></div>
              <ul className="nx-feed">
                {PREPARED.map((p) => <li key={p.title}><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>{p.title}</b><p>{p.body}</p><div className="nx-feed-a"><button type="button" className="nx-btn is-quiet is-sm">{p.act}</button></div></div></li>)}
              </ul>
            </section>
            <section className="nx-sec" aria-labelledby="t-team">
              <div className="nx-sec-h"><h2 id="t-team">Team</h2></div>
              <ul className="nx-feed">
                {TEAM.map((t) => <li key={t.who + t.what}><span className="nx-feed-i" style={{ fontSize: 9, fontWeight: 700 }}>{t.who.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><p><b style={{ display: "inline", color: "var(--ink)" }}>{t.who}</b> {t.what}</p><time>{t.when} ago</time></div></li>)}
              </ul>
            </section>
          </aside>
        </div>
        <button type="button" className="nx-btn nx-capture"><Camera size={16} />Capture a field update</button>
      </div>
    </Shell>
  );
}
