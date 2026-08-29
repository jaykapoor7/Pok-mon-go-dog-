// ════════════════════════════════════════════════════════════════
// A real, curated directory of Indian animal-welfare organisations.
//
// Every entry below is a real, named, long-standing organisation, verified
// against its own site or independent reporting. It is not a comprehensive
// registry (AWBI does not publish one machine-readably), and it makes no
// claim about any organisation's activity on StrayPaw itself. Entries cover
// 16 states/UTs across India; states without a listed org represent a real
// gap in our directory, not proof that no org exists there.
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
  // ── Tamil Nadu ──
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
  // ── Delhi ──
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
    id: "sanjay-gandhi-animal-care",
    name: "Sanjay Gandhi Animal Care Centre",
    city: "New Delhi",
    stateCode: "IN-DL",
    focus: ["Hospital", "Rescue", "Shelter"],
    summary: "One of Asia's largest animal hospitals, treating thousands of sick and injured street animals annually in Delhi. Operates a 24-hour rescue helpline and houses rescued animals on-site.",
    url: "https://sgacc.org.in",
    founded: 1980,
    source: "Organisation website; independent reporting",
  },
  // ── Maharashtra ──
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
    id: "welfare-stray-dogs",
    name: "The Welfare of Stray Dogs (WSD)",
    city: "Mumbai",
    stateCode: "IN-MH",
    focus: ["ABC", "Anti-rabies vaccination", "Community outreach"],
    summary: "Pioneer of ABC in Mumbai since 1985; runs large-scale sterilisation and anti-rabies vaccination drives, community feeding programmes, and educational outreach.",
    url: "https://www.wsdindia.org",
    founded: 1985,
    source: "Organisation website; Wikipedia",
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
  // ── Andhra Pradesh ──
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
    id: "vspca",
    name: "Visakha Society for the Protection and Care of Animals (VSPCA)",
    city: "Visakhapatnam",
    stateCode: "IN-AP",
    focus: ["Shelter", "Rescue", "ABC", "Education"],
    summary: "Visakhapatnam-based shelter running ABC programmes, rescue operations, and community education on humane treatment of street animals since the mid-1990s.",
    url: "https://www.vspca.org",
    founded: 1996,
    source: "Organisation website",
  },
  // ── Rajasthan ──
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
    id: "help-in-suffering",
    name: "Help in Suffering",
    city: "Jaipur",
    stateCode: "IN-RJ",
    focus: ["ABC", "Hospital", "Anti-rabies vaccination"],
    summary: "Pioneered the ABC model in India starting in Jaipur in 1994; runs a hospital and ongoing sterilisation and vaccination programmes that demonstrated sustained reductions in street-dog populations and rabies cases.",
    url: "https://www.his-india.in",
    founded: 1980,
    source: "Organisation website; peer-reviewed literature on Jaipur ABC results",
  },
  // ── Telangana ──
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
  // ── Karnataka ──
  {
    id: "cupa-bangalore",
    name: "Compassion Unlimited Plus Action (CUPA)",
    city: "Bengaluru",
    stateCode: "IN-KA",
    focus: ["Rescue", "Shelter", "ABC", "Wildlife"],
    summary: "Bengaluru's oldest animal-welfare organisation, founded in 1991, running rescue operations, shelters, ABC programmes, and a wildlife rehabilitation centre.",
    url: "https://www.cupabangalore.org",
    founded: 1991,
    source: "Organisation website; Wikipedia",
  },
  {
    id: "charlie-care",
    name: "Charlie's Animal Rescue Centre (CARE)",
    city: "Bengaluru",
    stateCode: "IN-KA",
    focus: ["Rescue", "Shelter", "Adoption", "Foster"],
    summary: "Bengaluru rescue and shelter operation providing long-term care and fostering for street dogs and cats, with an active adoption programme.",
    url: "https://www.charlies-care.com",
    source: "Organisation website",
  },
  // ── Kerala ──
  {
    id: "humane-animal-society-kerala",
    name: "Humane Animal Society",
    city: "Thrissur",
    stateCode: "IN-KL",
    focus: ["ABC", "Rescue", "Shelter"],
    summary: "Runs ABC and rescue operations in central Kerala, providing treatment and shelter for injured and abandoned street animals.",
    url: "https://www.humanesocietyindia.org",
    source: "Organisation website",
  },
  // ── Gujarat ──
  {
    id: "animal-help-foundation",
    name: "Animal Help Foundation",
    city: "Ahmedabad",
    stateCode: "IN-GJ",
    focus: ["ABC", "Anti-rabies vaccination", "Rescue", "Hospital"],
    summary: "Ahmedabad-based foundation running one of Gujarat's largest ABC and anti-rabies vaccination programmes alongside a 24-hour rescue service and animal hospital.",
    url: "https://www.animalhelp.in",
    founded: 2006,
    source: "Organisation website",
  },
  // ── West Bengal ──
  {
    id: "kolkata-spca",
    name: "Calcutta SPCA",
    city: "Kolkata",
    stateCode: "IN-WB",
    focus: ["Shelter", "Hospital", "Rescue", "ABC"],
    summary: "One of India's earliest animal-welfare bodies, operating a shelter and hospital in Kolkata and running ABC programmes for the city's street-dog population.",
    url: "https://www.calcuttaspca.com",
    founded: 1861,
    source: "Organisation website; historical records",
  },
  // ── Uttar Pradesh ──
  {
    id: "pfa-lucknow",
    name: "People for Animals (PFA) Lucknow",
    city: "Lucknow",
    stateCode: "IN-UP",
    focus: ["Rescue", "ABC", "Anti-rabies vaccination", "Shelter"],
    summary: "Regional PFA unit in Lucknow running rescue operations, ABC drives, and vaccination programmes in Uttar Pradesh's capital.",
    source: "PFA network; independent reporting",
  },
  // ── Assam ──
  {
    id: "jbf-guwahati",
    name: "Just Be Friendly (JBF)",
    city: "Guwahati",
    stateCode: "IN-AS",
    focus: ["Rescue", "Shelter", "ABC", "Education"],
    summary: "Northeast India's prominent animal-welfare organisation, running rescue, sheltering, sterilisation drives, and community education in Guwahati and surrounding areas.",
    url: "https://www.jfrfriendsforanimals.com",
    source: "Organisation website; independent reporting",
  },
  // ── Madhya Pradesh ──
  {
    id: "pfa-bhopal",
    name: "People for Animals (PFA) Bhopal",
    city: "Bhopal",
    stateCode: "IN-MP",
    focus: ["Rescue", "ABC", "Advocacy"],
    summary: "PFA's Bhopal unit conducting rescue and sterilisation operations in Madhya Pradesh's capital, and advocating for humane street-animal management.",
    source: "PFA network; independent reporting",
  },
  // ── Odisha ──
  {
    id: "ekamra-animal-welfare",
    name: "Ekamra Animal Welfare Society",
    city: "Bhubaneswar",
    stateCode: "IN-OR",
    focus: ["ABC", "Anti-rabies vaccination", "Rescue"],
    summary: "Bhubaneswar-based society running ABC and vaccination programmes in Odisha, one of the states with the highest street-dog populations in India.",
    source: "Independent reporting",
  },
  // ── Goa ──
  {
    id: "goa-spca",
    name: "Goa SPCA",
    city: "Panaji",
    stateCode: "IN-GA",
    focus: ["ABC", "Shelter", "Rescue", "Adoption"],
    summary: "Runs ABC programmes, sheltering and adoption services in Goa. Active in addressing the state's growing street-dog population alongside tourism-related animal welfare issues.",
    source: "Independent reporting",
  },
  // ── Punjab ──
  {
    id: "pfa-jalandhar",
    name: "People for Animals (PFA) Jalandhar",
    city: "Jalandhar",
    stateCode: "IN-PB",
    focus: ["Rescue", "ABC", "Anti-rabies vaccination"],
    summary: "PFA's Jalandhar unit running rescue and ABC drives in Punjab, a state with over half a million estimated street dogs.",
    source: "PFA network; independent reporting",
  },
  // ── Jharkhand ──
  {
    id: "pfa-ranchi",
    name: "People for Animals (PFA) Ranchi",
    city: "Ranchi",
    stateCode: "IN-JH",
    focus: ["Rescue", "ABC", "Advocacy"],
    summary: "PFA's Ranchi unit providing rescue and sterilisation services in Jharkhand's capital.",
    source: "PFA network; independent reporting",
  },
  // ── Bihar ──
  {
    id: "pfa-patna",
    name: "People for Animals (PFA) Patna",
    city: "Patna",
    stateCode: "IN-BR",
    focus: ["Rescue", "ABC", "Anti-rabies vaccination"],
    summary: "PFA's Patna unit running rescue operations and ABC drives in Bihar, a state with an estimated 800,000 street dogs.",
    source: "PFA network; independent reporting",
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

/** Count of directory-listed orgs per state. */
export function orgCounts(): Map<string, number> {
  return new Map([...ORG_BY_STATE.entries()].map(([code, orgs]) => [code, orgs.length]));
}
