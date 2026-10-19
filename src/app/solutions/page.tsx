import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { Audiences } from "@/components/solutions/Audiences";
import type { Loc } from "@/components/ecosystem/Commons";
import { getLandingStory } from "@/lib/landing/story";
import { getMapCities } from "@/lib/livingmap/server";
import { getOperationalPartners } from "@/lib/partners";
import "@/components/ecosystem/commons.css";
import "@/components/solutions/solutions.css";

export const revalidate = 300;
export const metadata = {
  title: "Solutions, StrayPaw",
  description: "Tools for communities, animal welfare organisations, cities and partners.",
};

/* ════════════════════════════════════════════════════════════════════
   Solutions: who StrayPaw is for and what each of them does with it.
   One interactive view per audience (problem, workflow, live glimpse,
   way in), then who is on it today and how an organisation starts.
   Listing is never described as a partnership.
   ════════════════════════════════════════════════════════════════════ */


export default async function SolutionsPage() {
  const [story, cities, partners] = await Promise.all([
    getLandingStory().catch(() => null),
    getMapCities().catch(() => []),
    getOperationalPartners().catch(() => []),
  ]);
  const sample = story?.hero.city ?? null, c = cities.find((x) => x.city === sample) ?? null;
  const brief = c ? { city: c.city, animals: c.animals, cells: c.cells, sterilised: c.sterilised, ster_unknown: c.ster_unknown, cases: c.cases } : null;
  const locs: Loc[] = (() => { const by = new Map<string, number>(); for (const a of story?.desk.cells ?? []) if (a.name) by.set(a.name, (by.get(a.name) ?? 0) + a.open); return [...by.entries()].map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open); })();

  return (
    <CoShell seed={3}
      kicker="Solutions"
      title="One shared record. Four ways to use it."
      closing="Find the right tools for your work."
      lede="Tools for communities, animal welfare organisations, cities and partners."
      actions={<>
        <Link href="#residents" className="co3-btn is-flame">Find your way in <ArrowUpRight size={17} aria-hidden /></Link>
        <Link href="/product" className="co3-btn is-line">See the product</Link>
      </>}
    >
      <section className="co3-sol" aria-label="Solutions by audience">
        <Audiences queue={story?.desk.queue ?? []} brief={brief} locs={locs} />
      </section>

      <CoSec n="02" title="Apply → Set up your workspace.">
        <ol className="co3-list">
          <li><b>Apply</b><span>Tell us about your organisation and where it works.</span></li>
          <li><b>Set up your workspace</b><span>Once verified, invite your team and add existing records.</span></li>
        </ol>
        <div className="co3-acts">
          <Link href="/partner-apply" className="co3-btn is-flame">Apply to join</Link>
          <Link href="/join" className="co3-btn is-line">Sign in with your code</Link>
        </div>
      </CoSec>

      <CoSec n="03" title="Field partners.">
        {partners.length > 0 && <>
          <p className="is-lead">Field partner</p>
          <ul className="co3-names">{partners.map((p) => <li key={p.id}><b>{p.name}</b><small>{[p.city, p.state].filter(Boolean).join(", ")}</small></li>)}</ul>
        </>}
        <p>Organisation listings and data sources are separate. <Link href="/evidence">Credited data sources</Link>.</p>
        <p><Link href="/community/organisations">The full directory</Link> · <Link href="/contact?subject=Partnership">Talk to us about a partnership</Link></p>
      </CoSec>
    </CoShell>
  );
}
