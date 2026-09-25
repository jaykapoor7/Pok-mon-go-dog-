import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { VerifiedBadge } from "@/components/org/VerifiedBadge";
import {
  getPublicOrgActivity,
  getPublicOrgAnimals,
  getPublicOrgBySlug,
  getPublicOrgImpact,
  getPublicOrgProgrammes,
} from "@/lib/org-public";
import styles from "./org-profile.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { title: "Organization not found, StrayPaw" };
  return {
    title: org.name + ", public records",
    description: org.mission?.slice(0, 150) ?? ("Public animal welfare records documented by " + org.name + "."),
    ...(org.cover_photo ? { openGraph: { images: [org.cover_photo] } } : {}),
  };
}

const formatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function date(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : dateFormatter.format(parsed);
}

function metricList(impact: Awaited<ReturnType<typeof getPublicOrgImpact>>) {
  return [
    impact.animalsRecorded > 0 && { value: impact.animalsRecorded, label: "Animal records" },
    impact.sterilised > 0 && { value: impact.sterilised, label: "Documented as sterilised" },
    impact.vaccinated > 0 && { value: impact.vaccinated, label: "Documented as vaccinated" },
    impact.caseRecords > 0 && { value: impact.caseRecords, label: "Case records" },
    impact.activeCases > 0 && { value: impact.activeCases, label: "Active cases" },
    impact.resolvedCases > 0 && { value: impact.resolvedCases, label: "Closed after field work" },
  ].filter(Boolean) as { value: number; label: string }[];
}

export default async function OrgProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) notFound();

  const [impact, animals, activity, programmes] = await Promise.all([
    getPublicOrgImpact(org.id),
    getPublicOrgAnimals(org.id, 18),
    getPublicOrgActivity(org.id, 10),
    getPublicOrgProgrammes(org.slug, 6),
  ]);
  const metrics = metricList(impact);
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;
  const initials = org.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const caseRecords = activity.filter((item) => item.kind === "case");
  const recentActivity = activity.slice(caseRecords.length ? Math.min(caseRecords.length, 3) : 0, 8);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">StrayPaw</Link>
        <Link className={styles.back} href="/orgs">All organisations</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <div className={styles.identity}>
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.logo} src={org.logo_url} alt={org.name + " logo"} />
              ) : <span className={styles.logoFallback} aria-hidden="true">{initials || "NGO"}</span>}
              <div>
                <p className={styles.eyebrow}>Public organisation record</p>
                <div className={styles.titleRow}>
                  <h1 className={styles.title}>{org.name}</h1>
                  {org.verified && <VerifiedBadge verified size="sm" />}
                </div>
                {location && <p className={styles.location}><MapPin aria-hidden="true" size={16} />{location}</p>}
              </div>
            </div>
            {org.mission && <p className={styles.mission}>{org.mission}</p>}
            {org.areas_of_work && org.areas_of_work.length > 0 && (
              <div className={styles.workTags} aria-label="Areas of work">
                {org.areas_of_work.map((area) => <span className={styles.workTag} key={area}>{area}</span>)}
              </div>
            )}
          </div>

          {(org.website || org.contact_email || org.contact_phone) && (
            <aside className={styles.contact} aria-label="Public contact information">
              <p className={styles.contactTitle}>Public contact</p>
              {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer nofollow"><Globe aria-hidden="true" size={16} />{org.website.replace(/^https?:\/\//, "")}</a>}
              {org.contact_email && <a href={"mailto:" + org.contact_email}><Mail aria-hidden="true" size={16} />{org.contact_email}</a>}
              {org.contact_phone && <a href={"tel:" + org.contact_phone}><Phone aria-hidden="true" size={16} />{org.contact_phone}</a>}
            </aside>
          )}
        </div>
      </section>

      <div className={styles.main}>
        {metrics.length > 0 && (
          <section className={styles.section} aria-labelledby="impact-heading">
            <div className={styles.sectionLead}>
              <h2 className={styles.sectionTitle} id="impact-heading">Live impact summary</h2>
              <p className={styles.sectionText}>Counts update from records maintained through StrayPaw. They document what this organisation has recorded, not claims about work performed by StrayPaw.</p>
            </div>
            <div className={styles.metrics}>
              {metrics.map((metric) => <div className={styles.metric} key={metric.label}><strong className={styles.metricValue}>{formatter.format(metric.value)}</strong><span className={styles.metricLabel}>{metric.label}</span></div>)}
            </div>
          </section>
        )}

        {animals.length > 0 && (
          <section className={styles.section} aria-labelledby="animals-heading">
            <div className={styles.sectionLead}>
              <h2 className={styles.sectionTitle} id="animals-heading">Animal records</h2>
              <p className={styles.sectionText}>Public animal profiles attributed to {org.name}. Location details are intentionally not shown here.</p>
            </div>
            <div className={styles.animalGrid}>
              {animals.map((animal) => {
                const status = animal.sterilisation_status === "sterilised" ? "Documented as sterilised" : animal.vaccination_status === "vaccinated" ? "Documented as vaccinated" : date(animal.last_seen) ? ("Last documented " + date(animal.last_seen)) : "Public record";
                return <Link className={styles.animal} href={"/dog/" + animal.id} key={animal.id}><DogPhoto className={styles.animalImage} src={animal.cover_photo} seed={animal.id} alt={animal.name ?? "Animal record"} /><div className={styles.animalCopy}><p className={styles.animalName}>{animal.name ?? "Animal record"}</p><p className={styles.animalMeta}>{status}</p></div></Link>;
              })}
            </div>
          </section>
        )}

        {caseRecords.length > 0 && (
          <section className={styles.section} aria-labelledby="work-heading">
            <div className={styles.sectionLead}>
              <h2 className={styles.sectionTitle} id="work-heading">Their work / case records</h2>
              <p className={styles.sectionText}>Only public-safe field records are shown. Private case descriptions, staff details and sensitive locations remain in the organisation workspace.</p>
            </div>
            <div className={styles.recordList}>
              {caseRecords.slice(0, 5).map((record) => <div className={styles.record} key={record.id}><div className={styles.recordMain}><p className={styles.recordTitle}>Field case documented</p><p className={styles.recordMeta}>{[record.area, date(record.occurredAt)].filter(Boolean).join(" · ")}</p></div>{record.animalId && <Link className={styles.recordLink} href={"/dog/" + record.animalId}>View animal record</Link>}</div>)}
            </div>
          </section>
        )}

        {recentActivity.length > 0 && (
          <section className={styles.section} aria-labelledby="activity-heading">
            <div className={styles.sectionLead}>
              <h2 className={styles.sectionTitle} id="activity-heading">Recent documented activity</h2>
              <p className={styles.sectionText}>A concise public timeline of work that has been deliberately published through StrayPaw&apos;s safe field activity record.</p>
            </div>
            <div className={styles.recordList}>
              {recentActivity.map((record) => <div className={styles.record} key={record.id}><div className={styles.recordMain}><p className={styles.recordTitle}>{record.kind === "care" ? "Animal care recorded" : "Field case documented"}</p><p className={styles.recordMeta}>{[record.area, date(record.occurredAt)].filter(Boolean).join(" · ")}</p></div>{record.animalId && <Link className={styles.recordLink} href={"/dog/" + record.animalId}>View record</Link>}</div>)}
            </div>
          </section>
        )}

        {programmes.length > 0 && (
          <section className={styles.section} aria-labelledby="programmes-heading">
            <div className={styles.sectionLead}>
              <h2 className={styles.sectionTitle} id="programmes-heading">Programmes / campaigns</h2>
              <p className={styles.sectionText}>Public programme summaries published by {org.name}.</p>
            </div>
            <div className={styles.programmes}>{programmes.map((programme) => <article className={styles.programme} key={programme.id}><p className={styles.programmeKind}>{programme.kind}</p><h3 className={styles.programmeTitle}>{programme.name}</h3>{programme.summary && <p className={styles.programmeText}>{programme.summary}</p>}<p className={styles.programmeMeta}>{[programme.area, date(programme.startsOn), date(programme.endsOn)].filter(Boolean).join(" · ")}</p></article>)}</div>
          </section>
        )}

        {org.about && <section className={styles.section} aria-labelledby="about-heading"><div className={styles.sectionLead}><h2 className={styles.sectionTitle} id="about-heading">About {org.name}</h2><p className={styles.about}>{org.about}</p></div></section>}
        <footer className={styles.footer}>Data infrastructure by StrayPaw</footer>
      </div>
    </main>
  );
}
