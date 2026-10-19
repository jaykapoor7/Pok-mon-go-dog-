import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getRegisterTotals } from "@/lib/register/totals";
import { getMapCities } from "@/lib/livingmap/server";

export const revalidate = 300;
export const metadata = {
  title: "Product, StrayPaw",
  description: "Reporting on WhatsApp and the web, owned rescue cases, animal identities, the NGO workspace, the living map, city briefs and evidence reports. One platform.",
};

/* ════════════════════════════════════════════════════════════════════
   The product: how one request moves through StrayPaw, what each part
   does, what is on the record today, and the rules it keeps. Figures
   are read live; nothing here describes software that does not exist.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

const FLOW = [
  { t: "A report arrives", d: "On WhatsApp or the web: a photo, a place and what was seen. The reporter is never shown publicly." },
  { t: "It becomes a case", d: "An organisation accepts it, and from then on someone owns it. The reporter sees when it is accepted." },
  { t: "Care is recorded once", d: "Treatment, sterilisation, vaccination and follow-ups are written to the case as the work happens." },
  { t: "The animal keeps its history", d: "Everything done lands on one StrayPaw ID, so the next team starts where the last one stopped." },
  { t: "The map updates", d: "The area the animal lives in reflects the record, with unknowns drawn as unknown." },
  { t: "The city sees the pattern", d: "Requests, care and gaps add up area by area into a brief a municipal team can act on." },
  { t: "The work becomes evidence", d: "Reports for partners and funders that name their sources and separate imported history from live work." },
];

const CAPS = [
  { i: "Residents", t: "Reporting", d: "Report an animal in about a minute, on WhatsApp or the web, and follow what happens next.", li: ["Photo, place and condition", "Location shown to about 0.7 km²", "Updates when an organisation accepts"], href: "/community/report", cta: "Report an animal" },
  { i: "NGOs", t: "Rescue cases", d: "One inbox for every request, each with an owner, a state and a next step.", li: ["Queue by urgency and age", "Assign, accept, close with an outcome", "Follow-ups that do not slip"], href: "/for-ngos", cta: "StrayPaw for NGOs" },
  { i: "Everyone", t: "Animal identities", d: "A profile per animal with its photographs, place and full history across teams.", li: ["One ID across organisations", "Imported history labelled apart", "Sensitive photos blurred by default"], href: "/explore", cta: "Find an animal" },
  { i: "NGOs", t: "The workspace", d: "Today's work beside the map of where it is, with the depth of a spreadsheet when you need it.", li: ["Search, filters and exports", "Bring your existing register", "Team roles and invite codes"], href: "/for-ngos", cta: "See the workspace" },
  { i: "Everyone", t: "The living map", d: "India on the record, from the whole country down to one dot per recorded animal.", li: ["Cities, areas and animals", "Lenses for animals, care, cases, evidence", "Unknown is never drawn as zero"], href: "/explore", cta: "Explore the map" },
  { i: "Cities", t: "City intelligence", d: "A brief per city: where help is requested, what care is recorded and what is not known.", li: ["Concentration by locality", "Recorded, not recorded and unknown", "Limits stated beside every figure"], href: "/for-governments", cta: "StrayPaw for cities" },
  { i: "Funders", t: "Evidence reports", d: "Outcomes you can check, exported for partners with every figure's source named.", li: ["Live work and history kept apart", "PDF exports", "Method published"], href: "/for-funders", cta: "StrayPaw for funders" },
  { i: "Everyone", t: "Academy", d: "Short courses on first aid, reporting, ABC and community care, with workshops and resources.", li: ["Lessons and interactives", "Workshops for schools and groups"], href: "/learn", cta: "Open the Academy" },
];

const RULES = [
  { t: "Unknown is not zero", d: "A place with no records is not recorded, never no animals." },
  { t: "Not examined is an answer", d: "Sterilisation and vaccination have three states, not two." },
  { t: "Someone owns every case", d: "A report reaches a queue only when an organisation takes it on." },
  { t: "Every figure names its source", d: "Where a number does not exist, the page says so." },
  { t: "Reporters stay private", d: "The animal is public. The person who reported it never is." },
];

export default async function ProductPage() {
  const [totals, cities] = await Promise.all([getRegisterTotals().catch(() => null), getMapCities().catch(() => [])]);
  const areas = cities.reduce((n, c) => n + (c.cells ?? 0), 0);

  return (
    <CoShell seed={2}
      kicker="Product"
      title={<>One platform. <em>From a report to the record.</em></>}
      lede="StrayPaw connects animal reports, WhatsApp rescue workflows and care records, so residents, NGOs and cities work from the same information."
      actions={<>
        <Link href="/app?choose=1" className="co3-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
        <Link href="/solutions" className="co3-btn is-line">Find your solution</Link>
      </>}
    >
      <CoSec n="01" title={<>How one request <em>moves.</em></>}>
        <p className="is-lead">Every part of StrayPaw is a step in one chain. A message on WhatsApp is where it starts.</p>
        <ol className="co3-list">{FLOW.map((s) => <li key={s.t}><b>{s.t}</b><span>{s.d}</span></li>)}</ol>
      </CoSec>

      <CoSec n="02" title={<>What it <em>does.</em></>}>
        <div className="co3-caps">
          {CAPS.map((c) => (
            <article key={c.t} className="co3-cap">
              <i>{c.i}</i>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
              <ul>{c.li.map((x) => <li key={x}>{x}</li>)}</ul>
              <Link href={c.href}>{c.cta} <ArrowUpRight size={14} aria-hidden /></Link>
            </article>
          ))}
        </div>
      </CoSec>

      {totals && (
        <CoSec n="03" title={<>On the record <em>today.</em></>}>
          <dl className="co3-figs">
            <div><dt>Animal records</dt><dd>{fmt(totals.animals)}</dd><small>Mostly historical registers organisations brought with them. Not a census.</small></div>
            <div><dt>Cities</dt><dd>{fmt(totals.cities)}</dd><small>With at least one record on the map.</small></div>
            {areas > 0 && <div><dt>Mapped areas</dt><dd>{fmt(areas)}</dd><small>Analysis areas of about 0.7 km², not wards.</small></div>}
            <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}</dd><small>On the record, open and closed.</small></div>
          </dl>
          <p>Read live from the public record. <Link href="/evidence">How each source was checked</Link>.</p>
        </CoSec>
      )}

      <CoSec n="04" title={<>The rules <em>it keeps.</em></>}>
        <ol className="co3-list">{RULES.map((r) => <li key={r.t}><b>{r.t}</b><span>{r.d}</span></li>)}</ol>
        <p>Free for verified organisations. <Link href="/data-governance">Data policy</Link> · <Link href="/privacy">Privacy</Link></p>
      </CoSec>
    </CoShell>
  );
}
