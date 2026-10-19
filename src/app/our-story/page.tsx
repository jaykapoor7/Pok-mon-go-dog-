import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getSupabase } from "@/lib/supabase";
import { getRegisterTotals } from "@/lib/register/totals";
import { getOperationalPartners } from "@/lib/partners";
import { getMapCities, getNationalCells } from "@/lib/livingmap/server";
import type { Cell } from "@/components/bindu/mapkit";

export const revalidate = 300;
export const metadata = {
  title: "Our Story, StrayPaw",
  description: "How StrayPaw began, from a community reporting tool with about 50 dogs reported to a shared record for street-animal care in India: its mission, vision and progress.",
};

/* ════════════════════════════════════════════════════════════════════
   Our Story: why StrayPaw exists, what it is for, how it is run and
   what is real today. /about, /company, /mission and /what-we-do send
   their visitors here. Facts only: no team biography is given because
   none is on the record; questions go to the contact form.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

/* The kinds of source, in the words the record uses. */
const SOURCE_KIND: Record<string, string> = {
  organisation_register: "Organisations' own registers",
  research_dataset: "Research datasets",
  municipal_dataset: "Municipal surveys",
  government_dataset: "Government census",
  public_api: "Public observation platforms",
  media_repository: "Open photo archives",
};

async function getSources() {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("data_sources").select("source_type,organization_name,published_record_count");
  const by = new Map<string, { kind: string; sources: number; records: number; orgs: Set<string> }>();
  for (const r of (data ?? []) as { source_type: string; organization_name: string; published_record_count: number }[]) {
    const g = by.get(r.source_type) ?? { kind: SOURCE_KIND[r.source_type] ?? r.source_type, sources: 0, records: 0, orgs: new Set<string>() };
    g.sources++; g.records += r.published_record_count ?? 0; g.orgs.add(r.organization_name); by.set(r.source_type, g);
  }
  return [...by.values()].sort((a, b) => b.records - a.records).map((g) => ({ ...g, orgs: [...g.orgs].sort((a, b) => a.localeCompare(b)) }));
}

const RULES = [
  { t: "Unknown is not zero", d: "A place with no records is not recorded, never no animals." },
  { t: "Not examined is an answer", d: "Sterilisation and vaccination have three states, not two." },
  { t: "A rate names its base", d: "Shares are shown against the animals checked, and against all on record." },
  { t: "Someone owns every case", d: "A report reaches a queue only when an organisation takes it on." },
  { t: "Every figure names its source", d: "Where a number does not exist, the page says so." },
  { t: "Independent of the field", d: "StrayPaw runs no programmes and competes for no grants. Free for verified organisations." },
];

const LIVE = [
  { t: "The map of India", href: "/explore" },
  { t: "Reporting on WhatsApp and the web", href: "/community/report" },
  { t: "The NGO workspace", href: "/for-ngos" },
  { t: "City briefs", href: "/for-governments" },
  { t: "Evidence reports", href: "/for-funders" },
  { t: "The Academy", href: "/learn" },
];

export default async function OurStoryPage() {
  const [sources, totals, partners, national, cities] = await Promise.all([
    getSources().catch(() => []),
    getRegisterTotals().catch(() => null),
    getOperationalPartners().catch(() => []),
    getNationalCells().catch(() => null),
    getMapCities().catch(() => []),
  ]);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  const records = totals ? `${fmt(totals.animals)} animal records across ${fmt(totals.cities)} cities` : "tens of thousands of animal records across India";
  const partner = partners[0] ?? null;

  return (
    <CoShell seed={4}
      kicker="Our Story"
      title={<>Every street animal deserves a history. <em>So we are building one.</em></>}
      lede="StrayPaw is a technology company building the shared information and coordination infrastructure for street-animal care in India."
      actions={<>
        <Link href="/app?choose=1" className="co3-btn is-flame">Explore the platform <ArrowUpRight size={17} aria-hidden /></Link>
        <Link href="/contact?subject=Our%20story" className="co3-btn is-line">Contact us</Link>
      </>}
    >
      <CoSec n="01" title={<>The problem, <em>in one number.</em></>}>
        <p className="is-lead">One rescue register brought into StrayPaw held 169 open requests, and no column for who was responsible for them.</p>
        <p>Every request had been seen by someone; none had an owner. Care is repeated or missed. Funders cannot see what worked. Cities plan sterilisation and response without knowing where help is needed.</p>
      </CoSec>

      <CoSec n="02" title={<>Mission and <em>vision.</em></>}>
        <dl className="co3-figs is-words">
          <div><dt>Mission</dt><dd>Make street-animal care more coordinated, accountable and informed, through technology anyone can use.</dd></div>
          <div><dt>Vision</dt><dd>The shared information and coordination infrastructure connecting animals, communities, care organisations and cities.</dd></div>
        </dl>
      </CoSec>

      <CoSec n="03" title={<>Six rules <em>the software keeps.</em></>}>
        <ol className="co3-list">{RULES.map((r) => <li key={r.t}><b>{r.t}</b><span>{r.d}</span></li>)}</ol>
      </CoSec>

      <CoSec n="04" title={<>Progress, <em>so far.</em></>}>
        {totals && (
          <dl className="co3-figs">
            <div><dt>Animal records</dt><dd>{fmt(totals.animals)}</dd><small>Mostly historical registers organisations brought with them. Not a census.</small></div>
            <div><dt>Cities</dt><dd>{fmt(totals.cities)}</dd><small>With records on the map.</small></div>
            <div><dt>Requests for help</dt><dd>{fmt(totals.cases)}</dd><small>On the record, open and closed.</small></div>
          </dl>
        )}
        {partner && <p><b>Field partner.</b> {partner.name}{partner.city ? `, ${partner.city}` : ""}: the organisation StrayPaw works alongside in the field.</p>}
        <ul className="co3-names">{LIVE.map((l) => <li key={l.t}><b><Link href={l.href}>{l.t}</Link></b><small>Live</small></li>)}</ul>
        <p className="is-lead">Still to build</p>
        <ol className="co3-list">
          <li><b>More field partners</b><span>Today one organisation works on StrayPaw in the field, in Coimbatore.</span></li>
          <li><b>Live reporting in every city</b><span>Most cities on the map hold imported history; each needs residents and teams adding to it.</span></li>
          <li><b>Ward boundaries</b><span>City briefs use analysis areas of about 0.7 km², not wards. Matching municipal boundaries comes next.</span></li>
          <li><b>Every Indian language</b><span>Reporting should work in the language each resident speaks.</span></li>
        </ol>
      </CoSec>

      {sources.length > 0 && (
        <CoSec n="05" title={<>Where the records <em>come from.</em></>}>
          <p>Live reports and imported history are labelled apart on every profile. Each organisation owns its records; imported sources keep their licence and credit.</p>
          <ul className="co3-names">
            <li><b>Residents&rsquo; reports</b><small>Live, on WhatsApp and the web</small></li>
            <li><b>Organisations&rsquo; field records</b><small>Live, private until published</small></li>
            {sources.map((g) => <li key={g.kind}><b>{g.kind}</b><small>{g.records > 0 ? `${fmt(g.records)} records · ` : ""}{g.orgs.slice(0, 3).join(", ")}{g.orgs.length > 3 ? ` and ${g.orgs.length - 3} more` : ""}</small></li>)}
          </ul>
          <p><Link href="/evidence">How each source was checked</Link> · <Link href="/art-credits">Illustration credits</Link></p>
        </CoSec>
      )}

      <CoSec n="06" title={<>The company, <em>and how to reach us.</em></>}>
        <p className="is-lead">StrayPaw is built in India, independent of the organisations it serves.</p>
        <p>It runs no programmes and competes for no grants. It is free for verified organisations. Reporters are never named, places are shown to about 0.7 km², and nothing tracks you across sites.</p>
        <ul className="co3-names">
          <li><b><Link href="/contact?subject=Our%20story">Contact form</Link></b><small>Read by the team building StrayPaw</small></li>
          <li><b><Link href="/partner-apply">Work with us</Link></b><small>Organisations and partners</small></li>
          <li><b><Link href="/data-governance">Data and privacy requests</Link></b><small>Corrections, exports, removal</small></li>
        </ul>
      </CoSec>
    </CoShell>
  );
}
