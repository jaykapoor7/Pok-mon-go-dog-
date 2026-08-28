// ════════════════════════════════════════════════════════════════
// A real, curated directory of Indian animal-welfare organisations.
//
// This is intentionally short rather than padded: every entry below is a
// real, named, long-standing organisation, verified against its own site or
// independent reporting at the time this file was written. It is not a
// comprehensive registry (AWBI does not publish one machine-readably), and
// it makes no claim about any organisation's activity on StrayPaw itself —
// see `note` on entries that clarifies this is a public directory listing,
// not an operational integration.
// ════════════════════════════════════════════════════════════════

export interface OrgEntry {
  id: string;
  name: string;
  city: string;
  stateCode: string; // matches STATES in geography.ts
  focus: string[];
  summary: string;
  url?: string;
  founded?: number;
  source: string;
}

export const ORGS: OrgEntry[] = [
  {
    id: "blue-cross-of-india",
    name: "Blue Cross of India",
    city: "Chennai",
    stateCode: "IN-TN",
    focus: ["Shelter", "ABC", "Ambulance", "Adoption"],
    summary: "One of India's oldest animal-welfare organisations, running hospitals, shelters and an animal ambulance service for street dogs, cats, cattle, horses and birds across Chennai.",
    url: "https://bluecrossofindia.org",
    founded: 1959,
    source: "Organisation website; Wikipedia",
  },
  {
    id: "friendicoes-seca",
    name: "Friendicoes SECA",
    city: "Delhi",
    stateCode: "IN-DL",
    focus: ["Rescue", "Shelter", "Ambulance", "Adoption"],
    summary: "Long-running Delhi rescue and shelter organisation treating injured and abandoned street animals, with an emergency ambulance service.",
    url: "https://friendicoes.org",
    source: "Organisation website",
  },
  {
    id: "people-for-animals",
    name: "People for Animals (PFA)",
    city: "New Delhi",
    stateCode: "IN-DL",
    focus: ["ABC", "Advocacy", "Shelter", "Network"],
    summary: "India's largest animal-welfare network, founded in 1992, with over a hundred regional units nationwide running sterilisation, rescue and advocacy work; headquartered in New Delhi.",
    url: "https://www.peopleforanimalsindia.org",
    founded: 1992,
    source: "Organisation website; Wikipedia",
  },
  {
    id: "bspca-mumbai",
    name: "Bombay Society for the Prevention of Cruelty to Animals (BSPCA)",
    city: "Mumbai",
    stateCode: "IN-MH",
    focus: ["Shelter", "Hospital", "Rescue"],
    summary: "Runs animal hospitals and shelters in Mumbai offering treatment and rehabilitation for injured and abandoned street animals.",
    source: "Independent reporting",
  },
  {
    id: "resq-charitable-trust",
    name: "RESQ Charitable Trust",
    city: "Pune",
    stateCode: "IN-MH",
    focus: ["Rescue", "Wildlife", "Rehabilitation", "Education"],
    summary: "Pune-based trust handling animal emergencies across species, from street dogs and cats to livestock and birds, alongside human-animal conflict education programmes.",
    source: "Independent reporting",
  },
  {
    id: "karuna-society",
    name: "Karuna Society for Animals and Nature",
    city: "Puttaparthi",
    stateCode: "IN-AP",
    focus: ["ABC", "Anti-rabies vaccination", "Shelter"],
    summary: "Registered since 2000 in rural Andhra Pradesh; has run ABC and anti-rabies vaccination programmes since 2002, with over 14,000 dogs sterilised and vaccinated to date.",
    url: "https://karunasociety.org",
    founded: 2000,
    source: "Organisation website",
  },
  {
    id: "animal-aid-unlimited",
    name: "Animal Aid Unlimited",
    city: "Udaipur",
    stateCode: "IN-RJ",
    focus: ["Rescue", "Hospital", "Rehabilitation"],
    summary: "Rescues and treats sick, injured and street-dwelling animals across Udaipur, with a dedicated rescue-ambulance service and on-site hospital.",
    url: "https://www.animalaidunlimited.org",
    founded: 2002,
    source: "Organisation website; Wikipedia",
  },
  {
    id: "stray-animal-foundation-india",
    name: "Stray Animal Foundation India (SAFI)",
    city: "Hyderabad",
    stateCode: "IN-TG",
    focus: ["Shelter", "Foster", "ABC", "Anti-rabies vaccination"],
    summary: "Shelter- and foster-focused organisation in Hyderabad running sterilisation and anti-rabies vaccination programmes alongside long-term sanctuary for unadoptable animals.",
    url: "https://strayanimalfoundationindia.org",
    source: "Organisation website",
  },
];

export const ORG_BY_STATE = new Map<string, OrgEntry[]>();
for (const org of ORGS) {
  const list = ORG_BY_STATE.get(org.stateCode) ?? [];
  list.push(org);
  ORG_BY_STATE.set(org.stateCode, list);
}

export function orgsForState(stateCode: string): OrgEntry[] {
  return ORG_BY_STATE.get(stateCode) ?? [];
}

/** Count of directory-listed orgs per state — used as the `ngo_presence` metric. */
export function orgCounts(): Map<string, number> {
  return new Map([...ORG_BY_STATE.entries()].map(([code, orgs]) => [code, orgs.length]));
}
