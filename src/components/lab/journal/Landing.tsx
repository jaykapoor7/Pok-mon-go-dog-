import Link from "next/link";
import "./journal.css";
import { LAB, fmt, dateLabel, photo, sighting, veeraEntries, shortId, ago } from "../data";
import { Mast, Stamp } from "./parts";
import { CaseCard } from "./CaseCard";

export function JournalLanding() {
  const t = LAB.totals;
  const v = veeraEntries();
  const vr = LAB.records.veerakeralam;
  const hero = sighting("89fd89e1");
  const dateOf = Object.fromEntries(v.entries.map((e) => [e.date, dateLabel(e.date, "short")]));
  // The last entries on the public record: resident reports and the field team's open cases, newest first.
  const log = [
    ...LAB.sightings.slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((s) => ({ at: s.at, text: `${s.zone} · ${s.city} — seen, photographed` })),
    ...LAB.queue.slice(0, 5).map((q) => ({ at: q.at, text: `${q.zone} — ${q.category.toLowerCase()}, case ${q.status === "unverified" ? "to verify" : "in progress"}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const TYPE = 1.5; // seconds the headline takes to type
  return (
    <main className="fj">
      <Mast current="/lab/journal/landing" right={`Entries to ${dateLabel(LAB.snapshot)}`} />
      <div className="fj-spread">
        <section className="fj-page fj-ruled" aria-label="Page 1">
          <div className="fj-pagehead"><span>StrayPaw · India</span><span>p. 1</span></div>
          <h1 className="fj-h1" aria-label="Every stray animal. Seen. Tracked. Cared for.">
            <span className="fj-type" style={{ ["--n" as string]: 11, animationDuration: "0.9s" } as React.CSSProperties} aria-hidden>Every stray</span>
            <span className="fj-type" style={{ ["--n" as string]: 7, animationDuration: "0.6s", animationDelay: "0.9s" } as React.CSSProperties} aria-hidden>animal.<i className="fj-caret" /></span>
          </h1>
          <div className="fj-stamps" aria-hidden>
            <div className="fj-stampbox"><Stamp r={-4} land delay={TYPE + 0.1}>Seen</Stamp><small><b>{fmt(t.animals)}</b>animals on record</small></div>
            <div className="fj-stampbox"><Stamp r={3} land delay={TYPE + 0.45}>Tracked</Stamp><small><b>{fmt(t.fieldEvents)}</b>field entries</small></div>
            <div className="fj-stampbox"><Stamp r={-2} land delay={TYPE + 0.8}>Cared for</Stamp><small><b>{fmt(t.resolved)}</b>cases closed</small></div>
          </div>
          <p className="fj-lede">Every street animal gets one record that the whole neighbourhood writes in: residents report what they see, field teams add what they did, and nothing is written over. Read enough pages and a city&apos;s animals come into view.</p>
          <div className="fj-actions">
            <Link href="/lab/journal/home"><span className="u">Report an animal</span> →</Link>
            <Link href="/lab/journal/map">Read the survey sheets →</Link>
            <Link href="/lab/journal/ngo">For field teams and NGOs →</Link>
          </div>
        </section>
        <section className="fj-page fj-ruled" aria-label="Page 2">
          <div className="fj-pagehead"><span>Filed from the street</span><span>p. 2</span></div>
          <figure className="fj-taped">
            <i className="fj-tape a" aria-hidden /><i className="fj-tape b" aria-hidden />
            <img src={photo(hero.photo, 420)} alt={`A dog photographed by a resident in ${hero.zone}, ${hero.city}`} />
            <figcaption className="fj-cap">{hero.zone}, {hero.city} · {dateLabel(hero.at)} · record {shortId(hero.dog)}<br />A resident&apos;s photograph; the report opened this animal&apos;s record.</figcaption>
          </figure>
          <div className="fj-log">
            <h3>Last entries on the public record</h3>
            <ol>
              {log.map((l, i) => (
                <li key={i} style={{ animationDelay: `${TYPE + 1.2 + i * 0.18}s` }}><span>{dateLabel(l.at, "short")}</span><span>{l.text}</span></li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      <section className="fj-card-sec" aria-label="One record">
        <header>
          <h2>A record is a card that fills&nbsp;up.</h2>
          <p>A dog was found with a maggot wound in {v.place} on {dateLabel(v.start)}. Here is its record as {vr.ngo} kept it — twenty-nine days, from the first entry to the case being closed. Last written {ago(v.entries[v.entries.length - 1].date)}.</p>
        </header>
        <CaseCard id={shortId(vr.id)} ngo={vr.ngo ?? ""} place={v.place} entries={v.entries} dateOf={dateOf} />
      </section>
    </main>
  );
}
