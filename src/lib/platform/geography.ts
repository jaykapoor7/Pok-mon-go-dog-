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
  { level: "city", code: "IN-UP-LUCKNOW", name: "Lucknow", parent: "IN-UP" },
  { level: "city", code: "IN-AP-PUTTAPARTHI", name: "Puttaparthi", parent: "IN-AP" },
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
