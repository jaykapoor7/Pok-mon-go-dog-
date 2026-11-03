import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cellToBoundary, cellToLatLng, gridDisk } from "h3-js";
import { roundRing } from "@/lib/spatial/round";
import {
  getPublicOrgBySlug,
  getPublicOrgH3Cells,
  getPublicOrgImpact,
  getPublicOrgMedianFirstActionDays,
  type PublicOrgH3Cell,
} from "@/lib/org-public";
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

type DrawCell = PublicOrgH3Cell & {
  lat: number;
  lng: number;
  ring: [number, number][];
};

function weightedQuantile(cells: DrawCell[], axis: "lat" | "lng", q: number) {
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

function MiniFootprint({ cells, place }: { cells: PublicOrgH3Cell[]; place: string }) {
  if (cells.length < 3) return null;

  const all: DrawCell[] = cells.flatMap((cell) => {
    try {
      const [lat, lng] = cellToLatLng(cell.h3);
      const ring = roundRing(cellToBoundary(cell.h3, true) as [number, number][]);
      return [{ ...cell, lat, lng, ring }];
    } catch {
      return [];
    }
  });
  if (all.length < 3) return null;

  let west = weightedQuantile(all, "lng", 0.015);
  let east = weightedQuantile(all, "lng", 0.985);
  let south = weightedQuantile(all, "lat", 0.015);
  let north = weightedQuantile(all, "lat", 0.985);

  if (east - west < 0.02) { west -= 0.01; east += 0.01; }
  if (north - south < 0.02) { south -= 0.01; north += 0.01; }

  const xPad = (east - west) * 0.12;
  const yPad = (north - south) * 0.12;
  west -= xPad;
  east += xPad;
  south -= yPad;
  north += yPad;

  const visible = all.filter((cell) =>
    cell.lng >= west && cell.lng <= east && cell.lat >= south && cell.lat <= north
  );
  if (!visible.length) return null;

  const width = 420;
  const height = 210;
  const pad = 8;
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

  const project = (lng: number, lat: number) => ({
    x: xOffset + (lng - west) * lngScale * scale,
    y: yOffset + (north - lat) * scale,
  });

  const pathOf = (ring: [number, number][]) => ring.map(([lng, lat], index) => {
    const { x, y } = project(lng, lat);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";

  const densityClass = (records: number) => {
    const ratio = Math.sqrt(records / Math.max(1, maxRecords));
    if (ratio >= 0.80) return styles.density5;
    if (ratio >= 0.60) return styles.density4;
    if (ratio >= 0.42) return styles.density3;
    if (ratio >= 0.25) return styles.density2;
    return styles.density1;
  };

  const allSet = new Set(all.map((cell) => cell.h3));
  const edgeSet = new Set<string>();
  for (const cell of visible) {
    for (const neighbor of gridDisk(cell.h3, 1)) {
      if (!allSet.has(neighbor)) edgeSet.add(neighbor);
      if (edgeSet.size >= 180) break;
    }
    if (edgeSet.size >= 180) break;
  }
  const edgeRings = [...edgeSet].flatMap((h3) => {
    try {
      return [roundRing(cellToBoundary(h3, true) as [number, number][])];
    } catch {
      return [];
    }
  });

  const hotspots = [...visible].sort((a, b) => b.records - a.records).slice(0, 3);

  return (
    <div className={styles.miniMap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.miniMapPlot}
        role="img"
        aria-label={`Where records come from in ${place}: ${formatter.format(visible.length)} areas`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g aria-hidden="true">
          {edgeRings.map((ring, index) => (
            <path key={`edge-${index}`} d={pathOf(ring)} className={styles.mapEdge} />
          ))}
        </g>
        <g>
          {[...visible]
            .sort((a, b) => a.records - b.records)
            .map((cell) => (
              <path
                key={cell.h3}
                d={pathOf(cell.ring)}
                className={`${styles.mapCell} ${densityClass(cell.records)}`}
              />
            ))}
        </g>
        <g aria-hidden="true">
          {hotspots.map((cell) => {
            const { x, y } = project(cell.lng, cell.lat);
            return <circle key={`hot-${cell.h3}`} cx={x} cy={y} r={4 + Math.sqrt(cell.records / maxRecords) * 4} className={styles.mapHotspot} />;
          })}
        </g>
      </svg>
      <span className={styles.mapTag}>{place} · {formatter.format(visible.length)} areas</span>
    </div>
  );
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) notFound();

  const [impact, h3Cells, medianFirstActionDays] = await Promise.all([
    getPublicOrgImpact(org.id).catch(() => null),
    getPublicOrgH3Cells(org.id),
    getPublicOrgMedianFirstActionDays(org.id).catch(() => null),
  ]);
  const location = [org.city, org.state].filter(Boolean).join(", ") || org.area;
  const mapPlace = org.city || org.area || "Mapped records";
  const medianRounded = medianFirstActionDays == null ? null : Math.round(medianFirstActionDays);
  const compactMetrics = impact ? [
    impact.sterilised > 0 && { value: formatter.format(impact.sterilised), label: "Sterilised" },
    impact.vaccinated > 0 && { value: formatter.format(impact.vaccinated), label: "Vaccinated" },
    impact.activeCases > 0 && { value: formatter.format(impact.activeCases), label: "Being helped now" },
    medianRounded != null && {
      value: medianRounded === 0 ? "Same day" : `${medianRounded} day${medianRounded === 1 ? "" : "s"}`,
      label: "Typical time to help",
    },
  ].filter(Boolean) as { value: string; label: string }[] : [];
  const initials = org.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const updated = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date());
  const href = `${SITE_URL}/org/${org.slug}`;

  /* The whole card is one link, so a tap anywhere opens the live record on
     StrayPaw in a new tab. The page reloads itself every five minutes, so the
     partner's website always shows current numbers without any change there. */
  return (
    <main className={styles.embed} aria-label={`${org.name} live animal welfare records`}>
      <meta httpEquiv="refresh" content="300" />
      <a className={styles.card} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${org.name}'s live records on StrayPaw (opens in a new tab)`}>
        <header className={styles.identity}>
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.logo} src={org.logo_url} alt="" />
          ) : <span className={styles.logoFallback} aria-hidden="true">{initials || "NGO"}</span>}
          <span className={styles.identityCopy}>
            <span className={styles.name}>{org.name}</span>
            {location && <span className={styles.place}>{location}</span>}
          </span>
          <span className={styles.live}><i aria-hidden="true" />Live</span>
        </header>

        {impact ? (
          <div className={styles.primary}>
            <strong className={styles.primaryNumber}>{formatter.format(impact.animalsRecorded)}</strong>
            <span className={styles.primaryLabel}>street dogs cared for and recorded</span>
          </div>
        ) : <p className={styles.countsUnavailable}>Live counts are refreshing. Tap to see the full record.</p>}

        <MiniFootprint cells={h3Cells} place={mapPlace} />

        {compactMetrics.length > 0 && (
          <div className={styles.metrics} aria-label="Documented work">
            {compactMetrics.map((metric) => (
              <span className={styles.metric} key={metric.label}>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.metricLabel}>{metric.label}</span>
              </span>
            ))}
          </div>
        )}

        <span className={styles.cta}><span>See live records</span><ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.2} /></span>
        <span className={styles.attribution}>Updated {updated} · Records kept on <b>StrayPaw</b></span>
      </a>
    </main>
  );
}
