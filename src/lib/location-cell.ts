/** An explicit coordinate pair identifies a cell; a city or locality alone
 * does not. Load H3 only when a member submits a location-aware record. */
export async function locationCell(lat?: number | null, lng?: number | null): Promise<string | null> {
  if (lat == null && lng == null) return null;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Provide a valid latitude and longitude, or leave both blank.");
  }
  const { latLngToCell } = await import("h3-js");
  return latLngToCell(lat, lng, 8);
}
