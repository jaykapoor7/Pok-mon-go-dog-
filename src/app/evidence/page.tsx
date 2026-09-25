import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SitePage } from "@/components/site/SitePage";
import { StateExplorer, type StateRow } from "@/components/app/StateExplorer";
import { ShareBand } from "@/components/system/ShareBand";
import { buildStateRows } from "@/lib/platform/stateRows";
import { BARRIER_META, UNKNOWNS } from "@/lib/platform/network";
import { RESEARCH } from "@/lib/platform/research";
import "./evidence.css";

export const metadata: Metadata = {
  title: "Why StrayPaw exists, StrayPaw",
  description: "India publishes a street-dog population for most states and almost nothing else. The published evidence, state by state, and what is missing.",
};

/* ════════════════════════════════════════════════════════════════════
   The one place on the site for published data and research.

   Every other page describes the product and the record it keeps. This
   page says why that record has to exist: the public evidence stops at a
   population estimate, and the numbers a programme is judged by have not
   been collected, have not been released, or were released as a single
   city total. Every figure is cited; where none exists, it says so.
   ════════════════════════════════════════════════════════════════════ */

export default function EvidencePage() {
  const rows: StateRow[] = buildStateRows();
  const total = rows.length;
  const withPop = rows.filter((r) => r.population !== null).length;
  const withAbc = rows.filter((r) => r.abcCoverage !== null).length;
  const bites = rows.reduce((a, r) => a + (r.bites2024 ?? 0), 0);
  const deaths = rows.reduce((a, r) => a + (r.deaths2024 ?? 0), 0);
  const kinds = (["never-measured", "held-not-published", "published-unusable"] as const).map((k) => ({
    k, meta: BARRIER_META[k], items: UNKNOWNS.filter((u) => u.barrier === k),
  })).filter((x) => x.items.length);

  return (
    <SitePage
      kicker="Evidence"
      title={<>Why this exists: <em>the data doesn&rsquo;t.</em></>}
      lede="India publishes a street-dog population for most states and almost nothing else. The numbers a programme is judged by are missing, and a missing number looks the same as a zero."
      actions={<Link href="/map" className="product-primary">See what the record holds <ArrowUpRight size={16} /></Link>}
    >
      <div className="ev">
        <section className="ev-pair" aria-label="What is published">
          <div>
            <ShareBand height={14} total={total} legend={false} parts={[
              { key: "y", n: withPop, color: "var(--sp-blue)", label: "Population published" },
              { key: "u", n: total - withPop, hatch: true, label: "Not published" },
            ]} />
            <p><b className="sys-mono">{withPop}/{total}</b> states and union territories publish a dog population.</p>
          </div>
          <div>
            <ShareBand height={14} total={total} legend={false} parts={[
              { key: "y", n: withAbc, color: "var(--sp-flame)", label: "Sterilisation coverage published" },
              { key: "u", n: total - withAbc, hatch: true, label: "Not published" },
            ]} />
            <p><b className="sys-mono">{withAbc}/{total}</b> publish sterilisation coverage, the number that says whether a programme works.</p>
          </div>
        </section>

        <section className="ev-figs" aria-label="The public health picture, 2024">
          <div><b>{(bites / 100_000).toFixed(1)} lakh</b><span>dog bites reported in 2024</span></div>
          <div><b>{deaths}</b><span>suspected rabies deaths caught by surveillance; modelling puts the real toll near 19,000</span></div>
        </section>

        <section className="ev-sec" aria-labelledby="ev-states">
          <h2 id="ev-states">What each state <em>publishes.</em></h2>
          <StateExplorer rows={rows} />
        </section>

        <section className="ev-sec" aria-labelledby="ev-missing">
          <h2 id="ev-missing">Three kinds <em>of missing.</em></h2>
          <div className="ev-kinds">
            {kinds.map(({ k, meta, items }) => (
              <div key={k}>
                <p className="ev-kind">{meta.label}</p>
                <ul>{items.map((u) => <li key={u.id}>{u.question}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="ev-why" aria-labelledby="ev-memory">
          <h2 id="ev-memory">A dog is treated, released, and <em>becomes anonymous again.</em></h2>
          <p>
            The ear notch says a surgery happened. It cannot say when, by whom, or whether the vaccination is still in
            date. The next team starts from nothing. StrayPaw is the record that outlives the rescue, so the numbers
            this page is missing can finally be counted, street by street.
          </p>
        </section>

        <details className="ev-sources">
          <summary>Sources <span className="sys-mono">{RESEARCH.length}</span></summary>
          <ol>
            {RESEARCH.map((r) => (
              <li key={r.id}>
                {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer"><b>{r.title}</b></a> : <b>{r.title}</b>}
                <span>{r.org}{r.year ? `, ${r.year}` : ""}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </SitePage>
  );
}
