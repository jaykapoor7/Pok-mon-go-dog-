/* ════════════════════════════════════════════════════════════════════
   Which city is this?

   Records carry a zone, and a zone is a neighbourhood: "Chandni Chowk",
   "Vasant Kunj", "Besant Nagar". Printing one of those over a map that
   is framed on a whole city makes the map claim to be a street, which
   is what the landing page was doing.

   The city is not in the row, so it is worked out from the coordinates
   instead. The table below is real geography: the administrative centre
   of each city, to four decimals. Nothing here is derived from our own
   records, so it cannot drift when the records do.

   Anything further than RADIUS_KM from every entry gets no name rather
   than the nearest wrong one.
   ════════════════════════════════════════════════════════════════════ */

export type City = { name: string; lat: number; lng: number };

/** Administrative centres. Cities over roughly a million people, plus the
    ones StrayPaw is actually working in. */
export const CITIES: City[] = [
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Noida", lat: 28.5355, lng: 77.391 },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Thane", lat: 19.2183, lng: 72.9781 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { name: "Varanasi", lat: 25.3176, lng: 82.9739 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Raipur", lat: 21.2514, lng: 81.6296 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Ludhiana", lat: 30.901, lng: 75.8573 },
  { name: "Amritsar", lat: 31.634, lng: 74.8723 },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
  { name: "Srinagar", lat: 34.0837, lng: 74.7973 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
  { name: "Goa", lat: 15.4909, lng: 73.8278 },
  { name: "Puducherry", lat: 11.9416, lng: 79.8083 },
];

/** Past this, the nearest entry is not the place you are standing in. */
const RADIUS_KM = 60;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** The city a point sits in, or null when nothing is close enough. */
export function cityAt(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: { name: string; km: number } | null = null;
  for (const c of CITIES) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || km < best.km) best = { name: c.name, km };
  }
  return best && best.km <= RADIUS_KM ? best.name : null;
}

/** The city most of these points are in. Used to label a framed map. */
export function cityForPoints(
  points: { lat: number; lng: number }[]
): string | null {
  const tally = new Map<string, number>();
  for (const p of points) {
    const name = cityAt(p.lat, p.lng);
    if (name) tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  if (tally.size === 0) return null;
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
