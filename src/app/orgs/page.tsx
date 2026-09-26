import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { FootprintMap } from "@/components/orgs/FootprintMap";
import { PartnerFigures } from "@/components/orgs/PartnerFigures";
import { getOperationalPartners, type Partner } from "@/lib/partners";
import { getPublicOrgImpact, getPublicOrgMapCells } from "@/lib/org-public";
import { ORGS } from "@/lib/platform/orgs";
import { STATE_BY_CODE } from "@/lib/platform/geography";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partner organisations, StrayPaw",
  description: "The field organisations that keep their records on StrayPaw, and where their public record reaches.",
};

/* ════════════════════════════════════════════════════════════════════
   Organisations: the partners first.

   Each partner is drawn from its own public record: where it works, as
   points of light on its city's streets, and what its record holds, counted
   live. The wider list of organisations working in India stays at the foot
   of the page, folded, and says plainly that listing is not partnership.
   ════════════════════════════════════════════════════════════════════ */

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const month = (iso: string | null | undefined) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(+d) ? null : `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const stateName = (code: string) => STATE_BY_CODE.get(code)?.name ?? code;

async function plate(p: Partner) {
  const [impact, cells] = await Promise.all([
    getPublicOrgImpact(p.id).catch(() => null),
    getPublicOrgMapCells(p.id).catch(() => []),
  ]);
  const figures = impact ? [
    { value: impact.animalsRecorded, label: "animals on the record" },
    { value: impact.caseRecords, label: "requests worked" },
    { value: impact.resolvedCases, label: "closed after field work" },
    { value: impact.sterilised, label: "sterilised, on record" },
    { value: impact.vaccinated, label: "vaccinated, on record" },
  ].filter((f) => f.value > 0) : [];
  return { p, figures, cells, places: cells.length };
}

export default async function OrgsPage() {
  const partners = await getOperationalPartners();
  const plates = await Promise.all(partners.map(plate));
  const others = ORGS.filter((o) => !partners.some((p) => p.name.toLowerCase() === o.name.toLowerCase()));

  return (
    <AppShell>
      <div className="pp">
        <header className="pp-head">
          <h1>Built with the teams <em>doing the&nbsp;work.</em></h1>
          <p>
            Partner organisations keep their field records on StrayPaw. What they choose to make public is drawn here from
            that record, live: where their work reaches, and what it holds.
          </p>
        </header>

        {plates.map(({ p, figures, cells, places }) => (
          <article key={p.id} className="pp-plate" aria-labelledby={`pp-${p.slug}`}>
            <div className="pp-geo">
              {cells.length > 0
                ? <FootprintMap cells={cells} label={`Where ${p.name}'s public record reaches: ${places} places in ${p.city ?? "its city"}`} />
                : <div className="pp-map is-empty" />}
              {places > 0 && <p className="pp-geo-note sys-mono">{places.toLocaleString("en-IN")} places on its record{p.city ? ` · ${p.city}` : ""}</p>}
            </div>
            <div className="pp-id">
              <div className="pp-mark">
                {p.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logoUrl} alt="" />
                  : <span>{p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>}
              </div>
              <p className="pp-kind sys-mono">
                {p.partnerStatus === "pilot_partner" ? "Pilot partner" : "Operational partner"}
                {month(p.partneredAt) ? <> · since {month(p.partneredAt)}</> : null}
              </p>
              <h2 id={`pp-${p.slug}`}>{p.name}</h2>
              <p className="pp-place">{[p.city, p.state].filter(Boolean).join(", ")}</p>
              {p.mission && <p className="pp-mission">{p.mission}</p>}
              {p.areas.length > 0 && <p className="pp-areas">{p.areas.join(" · ")}</p>}
              {figures.length > 0 && <PartnerFigures figures={figures} />}
              <p className="pp-links">
                <Link href={`/org/${p.slug}`} className="sys-btn">Their public record <ArrowUpRight size={15} /></Link>
                {p.city && <Link href={`/map?mode=animals&city=${encodeURIComponent(p.city)}`} className="pp-link">See it on the map <ArrowUpRight size={14} /></Link>}
              </p>
            </div>
          </article>
        ))}

        <section className="pp-join" aria-labelledby="pp-join-h">
          <div>
            <h2 id="pp-join-h">Bring your field records. <em>Keep them yours.</em></h2>
            <p>Animal-welfare organisations join free. Your cases, care and animals stay under your control; you decide what the public sees.</p>
          </div>
          <div className="pp-join-acts">
            <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
            <Link href="/for-ngos" className="pp-link">How it works for NGOs <ArrowUpRight size={14} /></Link>
          </div>
        </section>

        {others.length > 0 && (
          <details className="pp-dir">
            <summary>
              <b>{others.length} other organisations working across India</b>
              <span>From published information. Being listed here is not a partnership with StrayPaw.</span>
            </summary>
            <ol>
              {others.map((o) => (
                <li key={o.id}>
                  <span className="pp-dir-what">
                    {o.url
                      ? <a href={o.url} target="_blank" rel="noopener noreferrer">{o.name} <ArrowUpRight size={12} aria-hidden /></a>
                      : <b>{o.name}</b>}
                    <small>{o.city}, {stateName(o.stateCode)}</small>
                  </span>
                  <span className="pp-dir-focus">{o.focus.join(" · ")}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </AppShell>
  );
}
