import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getPublicProgrammes, programmeCategory, programmeCompletedTotal, type PublicProgramme } from "@/lib/public-programmes";
import archive from "@/data/partner-programmes-archive.json";

export const revalidate = 300;
export const metadata = {
  title: "Programmes, StrayPaw",
  description: "Sterilisation, vaccination and rescue programmes by StrayPaw's partner NGOs, The Pawsome People Project in Coimbatore and The Kind Hour Foundation in Lucknow.",
};

/* The partner NGOs whose own programmes are on StrayPaw. Large historical
   datasets (Jamshedpur, Ranchi, the West Bengal study) are credited sources,
   not partner programmes, and stay on the map and /city/programmes. */
const PARTNERS = ["the-pawsome-people-project", "the-kind-hour-foundation"];

const fmt = (n: number) => n.toLocaleString("en-IN");
const month = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : null);
const span = (p: PublicProgramme) => { const a = month(p.starts_on), b = month(p.ends_on); return a && b ? (a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`) : a ?? b ?? ""; };
/* A rescue register counts requests; its summary says how many. */
const requests = (p: PublicProgramme) => Number(p.public_summary?.match(/([\d,]+)\s+rescue requests/i)?.[1]?.replace(/,/g, "") ?? p.animals_recorded);

function figure(p: PublicProgramme): { n: number; unit: string } {
  const c = programmeCategory(p);
  if (c === "sterilisation") return { n: p.sterilised_recorded || p.animals_recorded, unit: "dogs sterilised" };
  if (c === "vaccination") return { n: p.vaccinated_recorded || p.animals_recorded, unit: "dogs vaccinated" };
  return { n: requests(p), unit: "rescue requests" };
}

export default async function ProgrammesPage() {
  const live = (await getPublicProgrammes(100).catch(() => [])).filter((p) => p.ngo_slug && PARTNERS.includes(p.ngo_slug));
  const rows: PublicProgramme[] = live.length ? live : (archive.programmes as PublicProgramme[]);
  const order = (p: PublicProgramme) => ({ sterilisation: 0, vaccination: 1 } as Record<string, number>)[programmeCategory(p)] ?? 2;
  const sorted = [...rows].sort((a, b) => order(a) - order(b) || figure(b).n - figure(a).n);
  const sum = (c: string) => rows.filter((p) => (c === "rescue" ? !["sterilisation", "vaccination"].includes(programmeCategory(p)) : programmeCategory(p) === c)).reduce((s, p) => s + figure(p).n, 0);
  const ngos = [...new Map(rows.map((p) => [p.ngo_slug, { name: p.ngo_name, slug: p.ngo_slug, city: p.city }])).values()];

  return (
    <CoShell seed={6} kicker="Programmes" title="Programmes with our partner NGOs."
      lede={<>Sterilisation drives, vaccination and rescue care by {ngos.map((n, i) => <span key={n.slug}>{i ? " and " : ""}{n.name}{n.city ? ` in ${n.city}` : ""}</span>)}, recorded on StrayPaw.</>}>
      <CoSec title="In numbers.">
        <dl className="co3-figs">
          <div><dt>Dogs sterilised</dt><dd>{fmt(sum("sterilisation"))}</dd></div>
          <div><dt>Dogs vaccinated</dt><dd>{fmt(sum("vaccination"))}</dd></div>
          <div><dt>Rescue requests</dt><dd>{fmt(sum("rescue"))}</dd></div>
          <div><dt>Partner NGOs</dt><dd>{ngos.length}</dd></div>
        </dl>
      </CoSec>
      {ngos.map((n) => (
        <CoSec key={n.slug} title={<>{n.name}{n.city && <small className="pg-city">{n.city}</small>}</>}>
          <ul className="pg-list">
            {sorted.filter((p) => p.ngo_slug === n.slug).map((p) => {
              const f = figure(p), closed = programmeCompletedTotal(p);
              return (
                <li key={p.id}>
                  <Link href={`/city/programmes/${p.id}`}>
                    <b className="pg-n">{fmt(f.n)}</b>
                    <span className="pg-what"><strong>{f.unit}</strong><span>{p.name} · {span(p)}</span>{closed > 0 && <small>{fmt(closed)} closed with an outcome</small>}</span>
                    <ArrowUpRight size={18} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          {n.slug && <p><Link href={`/community/organisations/${n.slug}`}>{n.name} on StrayPaw</Link></p>}
        </CoSec>
      ))}
      <CoSec title="Where the figures come from.">
        <p>Each figure is counted from the organisation’s own field records on StrayPaw: one animal is counted once per programme, and a request is counted whether or not the animal was later identified. Open any programme for its dates, method and limits.{!live.length && <> Figures as captured on {archive.captured}.</>}</p>
        <p><Link href="/partner-apply">Bring your NGO’s programmes onto StrayPaw</Link></p>
      </CoSec>
    </CoShell>
  );
}
