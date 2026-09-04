import type { GeoRef, MetricDef } from "./types";

// India + major states/UTs. Codes follow ISO 3166-2:IN where practical. This is
// the geographic backbone; datasets attach values to these codes. Districts,
// cities and wards are added under a state as data becomes available.
export const INDIA: GeoRef = { level: "national", code: "IN", name: "India" };

export const STATES: GeoRef[] = [
  ["IN-AP", "Andhra Pradesh"], ["IN-AR", "Arunachal Pradesh"], ["IN-AS", "Assam"],
  ["IN-BR", "Bihar"], ["IN-CT", "Chhattisgarh"], ["IN-GA", "Goa"], ["IN-GJ", "Gujarat"],
  ["IN-HR", "Haryana"], ["IN-HP", "Himachal Pradesh"], ["IN-JH", "Jharkhand"],
  ["IN-KA", "Karnataka"], ["IN-KL", "Kerala"], ["IN-MP", "Madhya Pradesh"],
  ["IN-MH", "Maharashtra"], ["IN-MN", "Manipur"], ["IN-ML", "Meghalaya"],
  ["IN-MZ", "Mizoram"], ["IN-NL", "Nagaland"], ["IN-OR", "Odisha"], ["IN-PB", "Punjab"],
  ["IN-RJ", "Rajasthan"], ["IN-SK", "Sikkim"], ["IN-TN", "Tamil Nadu"],
  ["IN-TG", "Telangana"], ["IN-TR", "Tripura"], ["IN-UP", "Uttar Pradesh"],
  ["IN-UT", "Uttarakhand"], ["IN-WB", "West Bengal"], ["IN-DL", "Delhi"],
].map(([code, name]) => ({ level: "state" as const, code, name, parent: "IN" }));

export const STATE_BY_CODE = new Map(STATES.map((s) => [s.code, s]));

// Cities where StrayPaw has a real, sourced organisation or dataset presence.
export const DISTRICTS: GeoRef[] = [
  { level: "city", code: "IN-MH-MUMBAI", name: "Mumbai", parent: "IN-MH" },
  { level: "city", code: "IN-MH-PUNE", name: "Pune", parent: "IN-MH" },
  { level: "city", code: "IN-DL-DELHI", name: "Delhi (NCT)", parent: "IN-DL" },
  { level: "city", code: "IN-TN-CHENNAI", name: "Chennai", parent: "IN-TN" },
  { level: "city", code: "IN-KA-BENGALURU", name: "Bengaluru", parent: "IN-KA" },
  { level: "city", code: "IN-WB-KOLKATA", name: "Kolkata", parent: "IN-WB" },
  { level: "city", code: "IN-TG-HYDERABAD", name: "Hyderabad", parent: "IN-TG" },
  { level: "city", code: "IN-RJ-UDAIPUR", name: "Udaipur", parent: "IN-RJ" },
  { level: "city", code: "IN-RJ-JAIPUR", name: "Jaipur", parent: "IN-RJ" },
  { level: "city", code: "IN-UP-LUCKNOW", name: "Lucknow", parent: "IN-UP" },
  { level: "city", code: "IN-AP-PUTTAPARTHI", name: "Puttaparthi", parent: "IN-AP" },
  { level: "city", code: "IN-AP-VISAKHAPATNAM", name: "Visakhapatnam", parent: "IN-AP" },
  { level: "city", code: "IN-GJ-AHMEDABAD", name: "Ahmedabad", parent: "IN-GJ" },
  { level: "city", code: "IN-KL-THRISSUR", name: "Thrissur", parent: "IN-KL" },
  { level: "city", code: "IN-AS-GUWAHATI", name: "Guwahati", parent: "IN-AS" },
  { level: "city", code: "IN-MP-BHOPAL", name: "Bhopal", parent: "IN-MP" },
  { level: "city", code: "IN-OR-BHUBANESWAR", name: "Bhubaneswar", parent: "IN-OR" },
  { level: "city", code: "IN-GA-PANAJI", name: "Panaji", parent: "IN-GA" },
  { level: "city", code: "IN-BR-PATNA", name: "Patna", parent: "IN-BR" },
  { level: "city", code: "IN-PB-JALANDHAR", name: "Jalandhar", parent: "IN-PB" },
  { level: "city", code: "IN-HR-GURUGRAM", name: "Gurugram", parent: "IN-HR" },
  { level: "city", code: "IN-HR-FARIDABAD", name: "Faridabad", parent: "IN-HR" },
  { level: "city", code: "IN-HP-DHARAMSALA", name: "Dharamsala", parent: "IN-HP" },
  { level: "city", code: "IN-UT-DEHRADUN", name: "Dehradun", parent: "IN-UT" },
  { level: "city", code: "IN-CT-RAIPUR", name: "Raipur", parent: "IN-CT" },
  { level: "city", code: "IN-AR-ITANAGAR", name: "Itanagar", parent: "IN-AR" },
  { level: "city", code: "IN-MN-IMPHAL", name: "Imphal", parent: "IN-MN" },
  { level: "city", code: "IN-ML-SHILLONG", name: "Shillong", parent: "IN-ML" },
  { level: "city", code: "IN-MZ-AIZAWL", name: "Aizawl", parent: "IN-MZ" },
  { level: "city", code: "IN-NL-DIMAPUR", name: "Dimapur", parent: "IN-NL" },
  { level: "city", code: "IN-SK-GANGTOK", name: "Gangtok", parent: "IN-SK" },
  { level: "city", code: "IN-TR-AGARTALA", name: "Agartala", parent: "IN-TR" },
];

export const METRICS: MetricDef[] = [
  { id: "dog_population", label: "Street-dog population", short: "Population", unit: "dogs", direction: "neutral", description: "Estimated free-roaming dog population." },
  { id: "abc_coverage", label: "Sterilisation (ABC) coverage", short: "ABC coverage", unit: "%", direction: "higher-better", description: "Share of the free-roaming dog population sterilised under Animal Birth Control programmes." },
  { id: "arv_coverage", label: "Anti-rabies vaccination coverage", short: "ARV coverage", unit: "%", direction: "higher-better", description: "Share of dogs vaccinated against rabies." },
  { id: "human_rabies_deaths", label: "Human rabies deaths", short: "Rabies deaths", unit: "deaths/yr", direction: "lower-better", description: "Reported/estimated annual human rabies deaths." },
  { id: "ngo_presence", label: "Registered welfare organisations", short: "Welfare orgs", unit: "count", direction: "higher-better", description: "Animal-welfare organisations known to operate in the area." },
  { id: "community_reports", label: "Community observations", short: "Reports", unit: "count", direction: "neutral", description: "Sightings and reports contributed through StrayPaw." },
];

export const METRIC_BY_ID = new Map(METRICS.map((m) => [m.id, m]));

/**
 * Approximate geographic centre of each state, for placing state-level
 * markers on the map. Rounded to two decimals — these position a label, they
 * are not survey data and nothing is measured from them.
 */
export const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "IN-AP": { lat: 15.91, lng: 79.74 },
  "IN-AR": { lat: 28.22, lng: 94.73 },
  "IN-AS": { lat: 26.2, lng: 92.94 },
  "IN-BR": { lat: 25.1, lng: 85.31 },
  "IN-CT": { lat: 21.28, lng: 81.87 },
  "IN-GA": { lat: 15.3, lng: 74.12 },
  "IN-GJ": { lat: 22.26, lng: 71.19 },
  "IN-HR": { lat: 29.06, lng: 76.09 },
  "IN-HP": { lat: 31.1, lng: 77.17 },
  "IN-JH": { lat: 23.61, lng: 85.28 },
  "IN-KA": { lat: 15.32, lng: 75.71 },
  "IN-KL": { lat: 10.85, lng: 76.27 },
  "IN-MP": { lat: 22.97, lng: 78.66 },
  "IN-MH": { lat: 19.75, lng: 75.71 },
  "IN-MN": { lat: 24.66, lng: 93.91 },
  "IN-ML": { lat: 25.47, lng: 91.37 },
  "IN-MZ": { lat: 23.16, lng: 92.94 },
  "IN-NL": { lat: 26.16, lng: 94.56 },
  "IN-OR": { lat: 20.95, lng: 85.1 },
  "IN-PB": { lat: 31.15, lng: 75.34 },
  "IN-RJ": { lat: 27.02, lng: 74.22 },
  "IN-SK": { lat: 27.53, lng: 88.51 },
  "IN-TN": { lat: 11.13, lng: 78.66 },
  "IN-TG": { lat: 18.11, lng: 79.02 },
  "IN-TR": { lat: 23.94, lng: 91.99 },
  "IN-UP": { lat: 26.85, lng: 80.95 },
  "IN-UT": { lat: 30.07, lng: 79.02 },
  "IN-WB": { lat: 22.99, lng: 87.85 },
  "IN-DL": { lat: 28.61, lng: 77.21 },
};
