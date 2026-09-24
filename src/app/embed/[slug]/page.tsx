import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getPublicOrgBySlug, getPublicOrgImpact } from "@/lib/org-public";
import { SITE_URL } from "@/lib/site-url";
import styles from "./embed.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { title: "Organisation widget unavailable" };
  return {
    title: `${org.name} live records`,
    description: `Live public animal welfare records documented by ${org.name}.`,
    robots: { index: false, follow: false },
  };
}
const formatter = new Intl.NumberFormat("en-IN");

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) notFound();
  const impact = await getPublicOrgImpact(org.id);
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;
  const extraMetrics = [
    impact.sterilised > 0 && { value: impact.sterilised, label: "Documented as sterilised" },
    impact.vaccinated > 0 && { value: impact.vaccinated, label: "Documented as vaccinated" },
    impact.activeCases > 0 && { value: impact.activeCases, label: "Active cases" },
    impact.resolvedCases > 0 && { value: impact.resolvedCases, label: "Cases resolved" },
  ].filter(Boolean).slice(0, 3) as { value: number; label: string }[];
  const initials = org.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <main className={styles.embed} aria-label={`${org.name} live animal welfare records`}>
      <section className={styles.card}>
        <header className={styles.identity}>
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.logo} src={org.logo_url} alt={`${org.name} logo`} />
          ) : <span className={styles.logoFallback} aria-hidden="true">{initials || "NGO"}</span>}
          <div className={styles.identityCopy}>
            <h1 className={styles.name}>{org.name}</h1>
            {location && <p className={styles.place}>{location}</p>}
          </div>
        </header>

        <div className={styles.primary}>
          <strong className={styles.primaryNumber}>{formatter.format(impact.animalsRecorded)}</strong>
          <span className={styles.primaryLabel}>Animals on record</span>
        </div>

        <div className={styles.lower}>
          {extraMetrics.length > 0 && (
            <div className={styles.metrics} aria-label="Documented impact">
              {extraMetrics.map((metric) => (
                <div className={styles.metric} key={metric.label}>
                  <strong className={styles.metricValue}>{formatter.format(metric.value)}</strong>
                  <span className={styles.metricLabel}>{metric.label}</span>
                </div>
              ))}
            </div>
          )}
          <a className={styles.cta} href={`${SITE_URL}/org/${org.slug}`} target="_blank" rel="noopener noreferrer">
            <span>View live records</span><ArrowUpRight aria-hidden="true" size={17} strokeWidth={2} />
          </a>
          <p className={styles.attribution}>Data infrastructure by StrayPaw</p>
        </div>
      </section>
    </main>
  );
}
