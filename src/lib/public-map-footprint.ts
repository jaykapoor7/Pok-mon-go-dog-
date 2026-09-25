export type PublicMapPoint = {
  lat: number;
  lng: number;
  records: number;
};

const CLUSTER_RADIUS_DEGREES = 0.35;

/**
 * Selects the densest, local public footprint for a miniature map.
 *
 * This is intentionally presentation-only: every source cell remains in the
 * database and public aggregate. Square-root weighting makes a distributed
 * field footprint win over a single, historically imported outlier cell.
 */
export function selectDominantPublicMapCluster<T extends PublicMapPoint>(cells: readonly T[]): T[] {
  if (cells.length < 3) return [];

  let anchor = cells[0];
  let bestDensity = -1;

  for (const candidate of cells) {
    const longitudeScale = Math.cos((candidate.lat * Math.PI) / 180);
    const density = cells.reduce((sum, cell) => {
      const distance = Math.hypot(
        cell.lat - candidate.lat,
        (cell.lng - candidate.lng) * longitudeScale
      );
      return distance <= CLUSTER_RADIUS_DEGREES ? sum + Math.sqrt(cell.records) : sum;
    }, 0);

    if (density > bestDensity) {
      anchor = candidate;
      bestDensity = density;
    }
  }

  const longitudeScale = Math.cos((anchor.lat * Math.PI) / 180);
  return cells.filter((cell) => Math.hypot(
    cell.lat - anchor.lat,
    (cell.lng - anchor.lng) * longitudeScale
  ) <= CLUSTER_RADIUS_DEGREES);
}
