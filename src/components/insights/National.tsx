/* ════════════════════════════════════════════════════════════════════
   India: what the country publishes, beside what StrayPaw records.

   The same sourced figures /insights has always carried, drawn in the
   register's language: what is published is solid, what is missing is
   hatched. The rabies gap is drawn to scale — one reported death against
   the deaths modelling says go unrecorded — because the size of that gap
   is the finding.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { pointsForMetric, nationalPoints, ranked, coverageOf } from "@/lib/platform/datasets";
import { METRICS } from "@/lib/platform/geography";
import { SOURCE_META, type SourceType } from "@/lib/platform/types";

const nf = (v: number) => v.toLocaleString("en-IN");

function Source({ type, children }: { type: SourceType; children: React.ReactNode }) {
  return <p className="an-src"><i style={{ background: SOURCE_META[type].dot }} aria-hidden />{SOURCE_META[type].label} · {children}</p>;
}

export function National() {
  const pop = ranked("dog_population", "desc");
  const abc = pointsForMetric("abc_coverage");
  const rabies = nationalPoints("human_rabies_deaths");
  const reported = rabies.find((p) => p.confidence === "high");
  const modelled = rabies.find((p) => p.confidence === "low");
  const ratio = reported && modelled ? Math.round(modelled.value / reported.value) : null;
  const gaps = METRICS.filter((m) => m.id !== "community_reports").map((m) => ({ m, ...coverageOf(m.id) })).sort((a, b) => a.withData - b.withData);
  const popMax = Math.max(1, ...pop.map((p) => p.value));
  const units = ratio ? Math.min(400, ratio) : 0;

  return (
    <section className="an-ch an-india" id="india" aria-labelledby="india-q">
      <header className="an-ch-head">
        <p className="an-ch-n sys-mono">07</p>
        <h2 id="india-q">How does this compare with what India publishes?</h2>
        <p className="an-ch-answer">
          {reported && modelled && ratio
            ? <>Officially, <b>{nf(reported.value)}</b> people died of rabies in {reported.year}. Independent modelling puts the real number near <b>{nf(modelled.value)}</b> a year — about {ratio} deaths for every one reported.</>
            : <>What India publishes about its street animals is thin, and most of it is old.</>}
        </p>
      </header>

      {ratio && reported && modelled && (
        <figure className="an-fig an-rabies">
          <div className="an-rabies-grid" role="img" aria-label={`One reported rabies death against about ${ratio} modelled deaths`}>
            <i className="is-on" />
            {Array.from({ length: units - 1 }, (_, i) => <i key={i} />)}
          </div>
          <figcaption>
            One solid square: a death that reached the surveillance system. Every hatched square beside it: a death the community survey says happened and was never reported.
            {ratio > 400 ? " Drawn to 400; the real ratio is larger." : ""}
          </figcaption>
          <Source type="government">NCDC, reported to Parliament ({reported.year})</Source>
          <Source type="research">peer-reviewed burden modelling, 2024 — 18,000–20,000 a year</Source>
        </figure>
      )}

      <div className="an-split">
        <div>
          <h3 className="an-h3">Street-dog population, where it was counted</h3>
          {pop.length ? (
            <ol className="an-ranks">
              {pop.slice(0, 8).map((p) => (
                <li key={p.geo.code}><span>{p.geo.name}</span><i style={{ width: `${Math.max(2, (p.value / popMax) * 100)}%` }} /><b className="sys-mono">{nf(p.value)}</b></li>
              ))}
            </ol>
          ) : <p className="an-empty">No state has a published count.</p>}
          <p className="an-note">From the 20th Livestock Census (2019), the last time anybody counted. {pop.length} of India&rsquo;s 36 states and union territories have a figure.</p>
          <Source type="government">20th Livestock Census (2019), Department of Animal Husbandry &amp; Dairying</Source>
        </div>
        <div>
          <h3 className="an-h3">Sterilisation coverage, where it is citable</h3>
          <p className="an-big"><b>{abc.length}</b> places in the country</p>
          <ol className="an-ranks">
            {abc.map((p) => <li key={p.geo.code}><span>{p.geo.name}</span><i style={{ width: `${p.value}%` }} className="is-blue" /><b className="sys-mono">{p.value}%</b></li>)}
          </ol>
          <p className="an-note">Delhi&rsquo;s 2022–23 survey found fewer than half of about ten lakh community dogs sterilised; Lucknow reported 83% in late 2024. In October 2025 the Supreme Court found only 2 of 28 states and union territories had filed the sterilisation reports it ordered.</p>
          <Source type="research">Delhi survey (2022–23)</Source>
          <Source type="government">Lucknow Municipal Corporation (2024)</Source>
        </div>
      </div>

      <div>
        <h3 className="an-h3">What the states publish at all</h3>
        <ol className="an-gaps">
          {gaps.map(({ m, withData, total }) => (
            <li key={m.id}>
              <span>{m.short}</span>
              <span className="an-gaps-cells" role="img" aria-label={`${withData} of ${total} states publish ${m.short}`}>
                {Array.from({ length: total }, (_, i) => <i key={i} className={i < withData ? "is-on" : ""} />)}
              </span>
              <b className="sys-mono">{withData}/{total}</b>
            </li>
          ))}
        </ol>
        <p className="an-note">Each square is a state or union territory. Hatched: no published figure. The biggest gap is the data itself.</p>
      </div>

      <div className="an-india-acts">
        <Link href="/explore" className="an-onmap">Explore the national data <ArrowUpRight size={14} /></Link>
        <Link href="/take-action" className="an-onmap">Act on this <ArrowUpRight size={14} /></Link>
      </div>
    </section>
  );
}
