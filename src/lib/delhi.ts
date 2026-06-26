// Delhi geography helpers — bounds, centre, and well-known localities used
// for the map view, the stylised fallback map, and reverse-geocode demos.

export const DELHI_CENTER = { lat: 28.6139, lng: 77.209 };

// Rough bounding box of the NCT of Delhi.
export const DELHI_BOUNDS = {
  minLat: 28.404,
  maxLat: 28.883,
  minLng: 76.838,
  maxLng: 77.347,
};

export interface Zone {
  name: string;
  lat: number;
  lng: number;
}

// A spread of recognisable Delhi localities — anchors for clustered sightings.
export const DELHI_ZONES: Zone[] = [
  { name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  { name: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
  { name: "Saket", lat: 28.5245, lng: 77.211 },
  { name: "Lajpat Nagar", lat: 28.5677, lng: 77.243 },
  { name: "Karol Bagh", lat: 28.6519, lng: 77.1909 },
  { name: "Chandni Chowk", lat: 28.6506, lng: 77.2303 },
  { name: "Dwarka", lat: 28.5921, lng: 77.046 },
  { name: "Rohini", lat: 28.7361, lng: 77.0667 },
  { name: "Vasant Kunj", lat: 28.52, lng: 77.158 },
  { name: "Mayur Vihar", lat: 28.6092, lng: 77.2925 },
  { name: "Janakpuri", lat: 28.6219, lng: 77.0878 },
  { name: "Greater Kailash", lat: 28.5494, lng: 77.2424 },
  { name: "Nehru Place", lat: 28.5494, lng: 77.2509 },
  { name: "Pitampura", lat: 28.6986, lng: 77.1325 },
  { name: "Malviya Nagar", lat: 28.5355, lng: 77.2106 },
  { name: "Defence Colony", lat: 28.5731, lng: 77.2295 },
  { name: "Paharganj", lat: 28.6448, lng: 77.2147 },
  { name: "Shahdara", lat: 28.6735, lng: 77.2895 },
  { name: "Okhla", lat: 28.5355, lng: 77.2731 },
  { name: "Model Town", lat: 28.7156, lng: 77.1935 },
];

/** Nearest named locality to a coordinate (demo "reverse geocode"). */
export function nearestZone(lat: number, lng: number): string {
  let best = DELHI_ZONES[0];
  let bestD = Infinity;
  for (const z of DELHI_ZONES) {
    const d = (z.lat - lat) ** 2 + (z.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best.name;
}

/** Project a lat/lng into 0–1 fractional coordinates within the Delhi box. */
export function projectToBox(lat: number, lng: number) {
  const x =
    (lng - DELHI_BOUNDS.minLng) / (DELHI_BOUNDS.maxLng - DELHI_BOUNDS.minLng);
  const y =
    1 - (lat - DELHI_BOUNDS.minLat) / (DELHI_BOUNDS.maxLat - DELHI_BOUNDS.minLat);
  return { x: clamp01(x), y: clamp01(y) };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

// ─────────────────────────────────────────────────────────────
// Pan-India geography. StrayPaw now works in any city, so the map opens on
// the whole country and locations are resolved by real reverse geocoding.
// ─────────────────────────────────────────────────────────────

/** Geographic centre of India — the default map camera. */
export const INDIA_CENTER = { lat: 22.5, lng: 79.5 };

/** Zoom that frames roughly the whole country on a phone. */
export const INDIA_ZOOM = 4.2;

export interface City {
  name: string;
  lat: number;
  lng: number;
}

/** Major metros — used as a graceful fallback label when reverse geocoding is
 *  unavailable (offline / blocked). */
export const CITIES: City[] = [
  { name: "Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Patna", lat: 25.5941, lng: 85.1376 },
  { name: "Goa", lat: 15.2993, lng: 74.124 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
];

/** Nearest known metro to a coordinate — a synchronous fallback label. */
export function nearestCity(lat: number, lng: number): string {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}

/**
 * Resolve a coordinate to a human-readable place ("Locality, City") anywhere in
 * India. Uses BigDataCloud's keyless, CORS-friendly reverse-geocode endpoint;
 * on any failure falls back to the nearest known metro so a report always gets
 * a sensible label.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout?.(5000) }
    );
    if (!res.ok) throw new Error("geocode failed");
    const d = (await res.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
    };
    const area = d.locality || d.city;
    const city = d.city && d.city !== d.locality ? d.city : d.principalSubdivision;
    const label = [area, city].filter(Boolean).join(", ");
    return label || nearestCity(lat, lng);
  } catch {
    return nearestCity(lat, lng);
  }
}

