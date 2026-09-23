import Link from "next/link";
import "./atlas.css";
import { LAB, fmt, featured, veeraEntries, dateLabel } from "../data";
import { Masthead, ContourSVG, cbePoints, Fig } from "./parts";
import { HeroPlate } from "./HeroPlate";
import { IndiaLocator } from "../India";
import { RecordScale } from "./RecordScale";

export function AtlasLanding() {
  const t = LAB.totals;
  const v = veeraEntries();
  const vr = LAB.records.veerakeralam;
  const figs = featured(5);
  const heights = [420, 300, 360, 300, 400];
  return (
    <main className="la night">
      <section className="la-hero" aria-label="Plate I">
        <Masthead over current="/lab/atlas/landing" />
        <HeroPlate events={LAB.cbe.events} box={LAB.cbe.box} total={t.fieldEvents}>
          <figure className="la-india">
            <figcaption>The register across India · {fmt(t.animals)} animals</figcaption>
            <IndiaLocator width={176} ink="#efe7da" accent="#f05b40" font="var(--la-mono)" size={10} />
          </figure>
        </HeroPlate>
        <div className="la-hero-copy">
          <span className="cap">Plate I — sample city: Coimbatore · {fmt(LAB.cbe.events.length)} field records · 2024–26</span>
          <h1><span className="ln">Every stray</span> <span className="ln">animal.</span> <span className="it ln">Seen. Tracked.</span> <span className="it ln">Cared for.</span></h1>
          <p className="lead">StrayPaw keeps one record for every street animal in India — where it was seen, what was done, by whom — so every city can see its animals the way this plate shows one of them: one at a time, and all at once.</p>
          <div className="la-actions">
            <Link href="/lab/atlas/home"><span className="dot" />Report an animal</Link>
            <Link href="/lab/atlas/map">Open the atlas</Link>
            <Link href="/lab/atlas/ngo">For organisations</Link>
          </div>
        </div>
      </section>

      <figure className="la-india-m" aria-label="The register across India">
        <figcaption>The register across India · {fmt(t.animals)} animals. The plate above is the sample city, Coimbatore.</figcaption>
        <IndiaLocator width={240} ink="#efe7da" accent="#f05b40" font="var(--la-mono)" size={11} />
      </figure>
      <section className="la-plate2" aria-label="Plate II">
        <div className="la-plate2-head">
          <div>
            <span className="cap" style={{ display: "block", marginBottom: 18, color: "#5c6a7f" }}>Plate II — one record, complete</span>
            <h2>One animal,<br /><span className="it">twenty-nine days.</span></h2>
          </div>
          <p>A dog found with a maggot wound in {v.place} on {dateLabel(v.start)}. The scale below is its StrayPaw record, every entry, unedited. Sterilised the day it was found; five vaccinations over four weeks; the case closed on day 29.</p>
        </div>
        <RecordScale entries={v.entries} start={v.start} />
        <dl className="la-rec-foot">
          <div><dt>Register</dt><dd>StrayPaw · India</dd></div>
          <div><dt>Sterilisation · vaccination</dt><dd>Recorded · recorded</dd></div>
          <div><dt>What the atlas holds, India</dt><dd>{fmt(t.animals)} animals, {fmt(t.fieldEvents)} field records, {fmt(t.resolved)} cases resolved</dd></div>
        </dl>
        <figure className="la-inset">
          <ContourSVG points={cbePoints()} box={LAB.cbe.box} width={190} height={190} mark={{ lng: vr.lng ?? 76.91, lat: vr.lat ?? 11.02 }} />
          <figcaption>Locator. Veerakeralam, west Coimbatore; the lines are the city&apos;s recorded care.</figcaption>
        </figure>
      </section>

      <section className="la-figs" aria-label="Figures">
        <div className="la-figs-head">
          <h2>The atlas is made of <span className="it">photographs</span>, not pins.</h2>
          <p>Each figure is a resident&apos;s report, filed from a phone on the street. {fmt(t.sightingPhotos)} of them are on the public record so far; every one became, or joined, an animal&apos;s record.</p>
        </div>
        <div className="la-figrow">
          {figs.map((s, i) => <Fig key={s.id} s={s} n={i + 1} height={heights[i]} />)}
        </div>
      </section>
    </main>
  );
}
