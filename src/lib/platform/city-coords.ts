// ─────────────────────────────────────────────────────────────
// Where the organisations in the directory actually are.
//
// ORGS carries a city name and a state code but no coordinates, so
// searching an organisation could only ever open a directory listing. What
// somebody typing "Blue Cross" on a map wants is the map, over Chennai.
//
// These are city centre points, the ordinary published coordinates for each
// place — geography, not an estimate of anything. They exist so a search
// result has somewhere to fly to; nothing is measured with them, and no
// organisation's own address is recorded here.
// ─────────────────────────────────────────────────────────────

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Agartala: { lat: 23.8315, lng: 91.2868 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Aizawl: { lat: 23.7271, lng: 92.7176 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Dharamsala: { lat: 32.219, lng: 76.3234 },
  Dimapur: { lat: 25.9063, lng: 93.7276 },
  Faridabad: { lat: 28.4089, lng: 77.3178 },
  Gangtok: { lat: 27.3389, lng: 88.6065 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Gurugram: { lat: 28.4595, lng: 77.0266 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Imphal: { lat: 24.817, lng: 93.9368 },
  Itanagar: { lat: 27.0844, lng: 93.6053 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Jalandhar: { lat: 31.326, lng: 75.5762 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  "New Delhi": { lat: 28.6139, lng: 77.209 },
  Panaji: { lat: 15.4909, lng: 73.8278 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Puttaparthi: { lat: 14.165, lng: 77.811 },
  Raipur: { lat: 21.2514, lng: 81.6296 },
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Shillong: { lat: 25.5788, lng: 91.8933 },
  Thrissur: { lat: 10.5276, lng: 76.2144 },
  Udaipur: { lat: 24.5854, lng: 73.7125 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
};

export const coordsForCity = (city: string) => CITY_COORDS[city] ?? null;
