import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  getPublicOrgBySlug,
  getPublicOrgImpact,
  getPublicOrgMapCells,
  type PublicOrgMapCell,
} from "@/lib/org-public";
import { selectDominantPublicMapCluster } from "@/lib/public-map-footprint";
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

function weightedQuantile(cells: PublicOrgMapCell[], axis: "lat" | "lng", q: number) {
  const sorted = [...cells].sort((a, b) => a[axis] - b[axis]);
  const total = sorted.reduce((sum, cell) => sum + cell.records, 0);
  const target = total * q;
  let seen = 0;
  for (const cell of sorted) {
    seen += cell.records;
    if (seen >= target) return cell[axis];
  }
  return sorted.at(-1)?.[axis] ?? 0;
}

function MiniFootprint({ cells, place }: { cells: PublicOrgMapCell[]; place: string }) {
  const cluster = selectDominantPublicMapCluster(cells);
  if (cluster.length < 3) return null;

  let west = weightedQuantile(cluster, "lng", 0.02);
  let east = weightedQuantile(cluster, "lng", 0.98);
  let south = weightedQuantile(cluster, "lat", 0.02);
  let north = weightedQuantile(cluster, "lat", 0.98);

  if (east - west < 0.02) { west -= 0.01; east += 0.01; }
  if (north - south < 0.02) { south -= 0.01; north += 0.01; }

  const xPad = (east - west) * 0.08;
  const yPad = (north - south) * 0.08;
  west -= xPad;
  east += xPad;
  south -= yPad;
  north += yPad;

  const visible = cluster.filter((cell) =>
    cell.lng >= west && cell.lng <= east && cell.lat >= south && cell.lat <= north
  );
  if (!visible.length) return null;

  const width = 164;
  const height = 76;
  const pad = 7;
  const midLat = (south + north) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);
  const xSpan = Math.max(0.0001, (east - west) * lngScale);
  const ySpan = Math.max(0.0001, north - south);
  const scale = Math.min((width - pad * 2) / xSpan, (height - pad * 2) / ySpan);
  const drawnWidth = xSpan * scale;
  const drawnHeight = ySpan * scale;
  const xOffset = (width - drawnWidth) / 2;
  const yOffset = (height - drawnHeight) / 2;
  const maxRecords = Math.max(...visible.map((cell) => cell.records));

  const project = (cell: PublicOrgMapCell) => ({
    x: xOffset + (cell.lng - west) * lngScale * scale,
    y: yOffset + (north - cell.lat) * scale,
  });

  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapHead}>
        <span>Field footprint</span>
        <span>{place}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.miniMapPlot}
        role="img"
        aria-label={`Public coarse-location footprint for ${place}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} className={styles.mapGuide} />
        <line x1={width / 2} y1="0" x2={width / 2} y2={height} className={styles.mapGuide} />
        {[...visible]
          .sort((a, b) => a.records - b.records)
          .map((cell) => {
            const { x, y } = project(cell);
            const r = 1.5 + Math.sqrt(cell.records / maxRecords) * 3.1;
            return <circle key={`${cell.lat}:${cell.lng}`} cx={x} cy={y} r={r} className={styles.mapDot} />;
          })}
      </svg>
    </div>
  );
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) notFound();

  const [impact, mapCells] = await Promise.all([
    getPublicOrgImpact(org.id),
    getPublicOrgMapCells(org.id),
  ]);
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;
  const mapPlace = org.city || org.area || "Mapped records";
  const extraMetrics = [
    impact.sterilised > 0 && { value: impact.sterilised, label: "Sterilised" },
    impact.vaccinated > 0 && { value: impact.vaccinated, label: "Vaccinated" },
    impact.caseRecords > 0 && { value: impact.caseRecords, label: "Case records" },
    impact.activeCases > 0 && { value: impact.activeCases, label: "Active cases" },
  ].filter(Boolean) as { value: number; label: string }[];
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
            <p className={styles.live}><span aria-hidden="true" />Live records</p>
            <h1 className={styles.name}>{org.name}</h1>
            {location && <p className={styles.place}>{location}</p>}
          </div>
        </header>

        <div className={styles.primary}>
          <div className={styles.primaryStat}>
            <strong className={styles.primaryNumber}>{formatter.format(impact.animalsRecorded)}</strong>
            <span className={styles.primaryLabel}>Animal records</span>
          </div>
          <MiniFootprint cells={mapCells} place={mapPlace} />
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
