import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { PageHead, S4Page, TwoTone } from "@/sp4/site/kit";
import { ACCESS_LABEL, DATASETS } from "@/sp4/research/catalogue";
import { archiveCards, publishedSurveyRows } from "@/sp4/research/server";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";

export const revalidate = 3600;
export const metadata = { title: "Datasets · StrayPaw Research", description: "Datasets with provenance, geography, time span, licence, access level and stated limitations." };

const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "not recorded");

export default async function DatasetsPage() {
  const ids = DATASETS.flatMap((d) => (d.programmeId ? [d.programmeId] : []));
  const [cards, surveys] = await Promise.all([archiveCards(ids), publishedSurveyRows()]);
  return (
    <S4Page close={undefined}>
      <PageHead eyebrow={<Link href="/research">StrayPaw Research</Link>} title={<TwoTone a="Dataset" b="catalogue" />}
        lede="Each entry states who holds the data, where and when it comes from, how you may use it and what it cannot show. Record counts and dates are read from the archive at the time you load this page." />
      <section className="s4-sec"><div className="s4-wrap">
        {DATASETS.map((d) => {
          const card = d.programmeId ? cards?.find((c) => c.id === d.programmeId) : null;
          const live = d.id === "published-surveys" ? (surveys === null ? "Could not be read just now." : `${surveys.length} published survey${surveys.length === 1 ? "" : "s"}.`)
            : d.programmeId ? (card ? `${card.animals_recorded?.toLocaleString("en-IN") ?? "Unknown number of"} records · ${when(card.starts_on)} to ${when(card.ends_on)}` : cards === null ? "Archive figures could not be read just now." : "Archive figures not available.") : null;
          return (
            <article key={d.id} id={d.id} className="rs-ds">
              <header><h2>{d.title}</h2><span className={`rs-pill is-${d.access}`}>{ACCESS_LABEL[d.access]}</span></header>
              <dl>
                <div><dt>Holder</dt><dd>{d.holder}</dd></div>
                <div><dt>Type</dt><dd>{d.kind}</dd></div>
                <div><dt>Geography</dt><dd>{d.geography}</dd></div>
                {live && <div><dt>In the archive</dt><dd>{live}</dd></div>}
                <div><dt>Licence and use</dt><dd>{d.licence}</dd></div>
                <div><dt>Provenance</dt><dd>{d.provenance}</dd></div>
                <div><dt>Limitations</dt><dd><ul>{d.limitations.map((l) => <li key={l}>{l}</li>)}</ul></dd></div>
              </dl>
              {d.access === "open" ? (surveys && surveys.length > 0 ? <a className="s4-btn is-primary" href={d.obtain.href}><Download size={16} aria-hidden /> {d.obtain.label}</a> : <p className="rs-note">No survey has been published yet, so there is nothing to download.</p>)
                : d.access === "request" ? <a className="s4-btn is-line" href={d.obtain.href} rel="noopener noreferrer" target="_blank">{d.obtain.label} <ArrowUpRight size={15} aria-hidden /></a>
                : <Link className="s4-btn is-line" href={d.obtain.href}>{d.obtain.label}</Link>}
            </article>
          );
        })}
      </div></section>
    </S4Page>
  );
}
