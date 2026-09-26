import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Globe, Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { OrgMark } from "@/components/orgs/OrgMark";
import { CampaignStrip } from "@/components/orgs/CampaignStrip";
import { FootprintMap } from "@/components/orgs/FootprintMap";
import { PartnerFigures } from "@/components/orgs/PartnerFigures";
import { givenName } from "@/components/system/AnimalSeal";
import { getListedOrganisations, getOperationalPartners, orgKind } from "@/lib/partners";
import { getPublicOrgAnimals, getPublicOrgBySlug, getPublicOrgImpact, getPublicOrgMapCells } from "@/lib/org-public";
import { getPublicProgrammes } from "@/lib/public-programmes";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { title: "Organisation not found, StrayPaw" };
  return {
    title: `${org.name}, StrayPaw`,
    description: org.mission?.slice(0, 150) ?? `What ${org.name}'s public record on StrayPaw holds.`,
    ...(org.logo_url ? { openGraph: { images: [org.logo_url] } } : {}),
  };
}

/* ════════════════════════════════════════════════════════════════════
   One organisation, from its own public record. Who it is, beside where
   its record reaches on the city's streets; what the record holds,
   counted up; its campaigns on their time axis; and the animals it keeps,
   in a strip. Only what the record holds is drawn: an organisation whose
   data is not yet on it shows who it is and nothing invented.
   ════════════════════════════════════════════════════════════════════ */

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const month = (iso: string | null | undefined) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(+d) ? null : `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export default async function OrgProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) notFound();
  const extra = org as typeof org & { partner_status?: string | null; partnered_at?: string | null };

  const [impact, animals, cells, allCampaigns, partners, listed] = await Promise.all([
    getPublicOrgImpact(org.id).catch(() => null),
    getPublicOrgAnimals(org.id, 16).catch(() => []),
    getPublicOrgMapCells(org.id).catch(() => []),
    getPublicProgrammes(250).catch(() => []),
    getOperationalPartners().catch(() => []),
    getListedOrganisations().catch(() => ({ members: [], sources: [] })),
  ]);
  const partner = partners.find((p) => p.id === org.id);
  const campaigns = allCampaigns.filter((c) => c.ngo_slug === org.slug);
  const kind = partner ? "Field partner" : listed.members.some((m) => m.id === org.id) ? "Partner NGO" : orgKind(org.name, extra.partner_status);
  const since = partner ? month(partner.partneredAt ?? extra.partnered_at) : null;
  const place = [org.city, org.state].filter(Boolean).join(", ") || org.area;
  const figures = impact ? [
    { value: impact.animalsRecorded, label: "animals on the record" },
    { value: impact.caseRecords, label: "requests worked" },
    { value: impact.resolvedCases, label: "closed after field work" },
    { value: impact.sterilised, label: "sterilised, on record" },
    { value: impact.vaccinated, label: "vaccinated, on record" },
  ].filter((f) => f.value > 0) : [];
  const links = [
    org.website && { href: org.website, label: org.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), Icon: Globe, ext: true },
    org.contact_email && { href: `mailto:${org.contact_email}`, label: org.contact_email, Icon: Mail, ext: false },
    org.contact_phone && { href: `tel:${org.contact_phone}`, label: org.contact_phone, Icon: Phone, ext: false },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Globe; ext: boolean }[];

  return (
    <AppShell>
      <article className="op">
        <header className={`op-head ${cells.length ? "has-map" : ""}`}>
          <div className="op-id">
            <OrgMark name={org.name} logoUrl={org.logo_url} size={88} />
            <p className="op-kind sys-mono">{kind}{since ? <> · since {since}</> : null}</p>
            <h1>{org.name}</h1>
            {place && <p className="op-place">{place}</p>}
            {org.mission && <p className="op-mission">{org.mission}</p>}
            {org.areas_of_work && org.areas_of_work.length > 0 && <p className="op-areas">{org.areas_of_work.join(" · ")}</p>}
            {links.length > 0 && (
              <p className="op-links">
                {links.map(({ href, label, Icon, ext }) => (
                  <a key={href} href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}><Icon size={14} aria-hidden /> {label}</a>
                ))}
              </p>
            )}
          </div>
          {cells.length > 0 && (
            <figure className="op-geo">
              <FootprintMap cells={cells} label={`Where ${org.name}'s public record reaches: ${cells.length} places${org.city ? ` in ${org.city}` : ""}`} />
              <figcaption className="sys-mono">{cells.length.toLocaleString("en-IN")} places on its record{org.city ? ` · ${org.city}` : ""}</figcaption>
            </figure>
          )}
        </header>

        {figures.length > 0 && (
          <section className="op-sec" aria-labelledby="op-fig-h">
            <h2 id="op-fig-h" className="op-h">On StrayPaw</h2>
            <PartnerFigures figures={figures} />
          </section>
        )}

        {campaigns.length > 0 && (
          <section className="op-sec" aria-labelledby="op-camp-h">
            <h2 id="op-camp-h" className="op-h">Campaigns</h2>
            <CampaignStrip campaigns={campaigns} showOrg={false} />
          </section>
        )}

        {animals.length > 0 && (
          <section className="op-sec" aria-labelledby="op-an-h">
            <h2 id="op-an-h" className="op-h">On their record</h2>
            <ul className="op-animals">
              {animals.map((a) => (
                <li key={a.id}>
                  <Link href={`/dog/${a.id}`}>
                    <DogPhoto src={a.cover_photo} seed={a.id} alt={givenName(a.name) ?? "An animal"} className="op-animal-ph" width={320} />
                    <b>{givenName(a.name) ?? "No name yet"}</b>
                    <small>{a.sterilisation_status === "sterilised" ? "Sterilised" : a.vaccination_status === "vaccinated" ? "Vaccinated" : month(a.last_seen) ? `Seen ${month(a.last_seen)}` : "On the record"}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {org.about && (
          <section className="op-sec" aria-labelledby="op-about-h">
            <h2 id="op-about-h" className="op-h">About</h2>
            <p className="op-about">{org.about}</p>
          </section>
        )}

        {(org.city || figures.length > 0) && (
          <p className="op-acts">
            {org.city && <Link href={`/map?mode=animals&city=${encodeURIComponent(org.city)}`} className="sys-btn">See it on the map <ArrowUpRight size={15} /></Link>}
            {org.city && <Link href={`/insights?city=${encodeURIComponent(org.city)}`} className="pp-link">Read {org.city} <ArrowUpRight size={14} /></Link>}
          </p>
        )}
      </article>
    </AppShell>
  );
}
