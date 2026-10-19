import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { Audiences } from "@/components/solutions/Audiences";
import type { Loc } from "@/components/ecosystem/Commons";
import { getLandingStory } from "@/lib/landing/story";
import { getMapCities } from "@/lib/livingmap/server";
import { getListedOrganisations, getOperationalPartners } from "@/lib/partners";
import "@/components/ecosystem/commons.css";
import "@/components/solutions/solutions.css";

export const revalidate = 300;
export const metadata = {
  title: "Solutions, StrayPaw",
  description: "StrayPaw for residents and volunteers, animal welfare organisations, municipal teams, and partners and funders: one shared record, four ways to use it.",
};

/* ════════════════════════════════════════════════════════════════════
   Solutions: who StrayPaw is for and what each of them does with it.
   One interactive view per audience (problem, workflow, live glimpse,
   way in), then who is on it today and how an organisation starts.
   Listing is never described as a partnership.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function SolutionsPage() {
  const [story, cities, partners, listed] = await Promise.all([
    getLandingStory().catch(() => null),
    getMapCities().catch(() => []),
    getOperationalPartners().catch(() => []),
    getListedOrganisations().catch(() => ({ members: [], sources: [] })),
  ]);
  const sample = story?.hero.city ?? null, c = cities.find((x) => x.city === sample) ?? null;
  const brief = c ? { city: c.city, animals: c.animals, cells: c.cells, sterilised: c.sterilised, ster_unknown: c.ster_unknown, cases: c.cases } : null;
  const locs: Loc[] = (() => { const by = new Map<string, number>(); for (const a of story?.desk.cells ?? []) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open); return [...by.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open); })();

  return (
    <CoShell seed={3}
      kicker="Solutions"
      title={<>One shared record. <em>Four ways to use it.</em></>}
      lede="For the resident who sees an animal in need, the organisation that rescues it, the city that plans for it, and the partner who funds the work."
      actions={<>
        <Link href="#residents" className="co3-btn is-flame">Find your way in <ArrowUpRight size={17} aria-hidden /></Link>
        <Link href="/product" className="co3-btn is-line">See the product</Link>
      </>}
    >
      <section className="co3-sol" aria-label="Solutions by audience">
        <Audiences queue={story?.desk.queue ?? []} brief={brief} locs={locs} />
      </section>

      <CoSec n="02" title={<>How organisations <em>start.</em></>}>
        <ol className="co3-list">
          <li><b>Apply</b><span>Tell us who you are and where you work. It takes a few minutes.</span></li>
          <li><b>Verification</b><span>We check the organisation before any access is given. Free for verified organisations.</span></li>
          <li><b>Join with a code</b><span>Your team signs in with an invite code and gets its own workspace and roles.</span></li>
          <li><b>Bring your records</b><span>Import your existing register. It stays yours and is credited on every record.</span></li>
        </ol>
        <div className="co3-acts">
          <Link href="/partner-apply" className="co3-btn is-flame">Apply to join</Link>
          <Link href="/join" className="co3-btn is-line">Sign in with your code</Link>
        </div>
      </CoSec>

      <CoSec n="03" title={<>Who is on it <em>today.</em></>}>
        {partners.length > 0 && <>
          <p className="is-lead">Field partner</p>
          <ul className="co3-names">{partners.map((p) => <li key={p.id}><b>{p.name}</b><small>{[p.city, p.state].filter(Boolean).join(", ")}</small></li>)}</ul>
        </>}
        {listed.members.length > 0 && <>
          <p>{fmt(listed.members.length)} organisations are listed on StrayPaw. Listing is not a partnership.</p>
          <ul className="co3-names">{listed.members.map((o) => <li key={o.id}><b>{o.name}</b><small>{[o.city, o.state].filter(Boolean).join(", ") || "India"}</small></li>)}</ul>
        </>}
        {listed.sources.length > 0 && <p>Published records from {fmt(listed.sources.length)} organisations are imported under their licence and credited on every record. No relationship is implied. <Link href="/evidence">Sources</Link>.</p>}
        <p><Link href="/community/organisations">The full directory</Link> · <Link href="/contact?subject=Partnership">Talk to us about a partnership</Link></p>
      </CoSec>
    </CoShell>
  );
}
