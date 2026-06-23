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
