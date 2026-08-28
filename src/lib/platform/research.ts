import type { SourceType } from "./types";

// Curated references to real, public sources on street dogs, rabies and ABC in
// India. These are pointers (title, publisher, year, scope) to help people find
// primary sources — always verify figures at the source. We do not reproduce
// their content here.
export interface ResearchEntry {
  id: string;
  title: string;
  org: string;
  year: number | string;
  geography: string;
  type: SourceType;
  topics: string[];
  summary: string;
  url?: string;
}

export const RESEARCH: ResearchEntry[] = [
  {
    id: "napre-2021",
    title: "National Action Plan for Dog-Mediated Rabies Elimination (NAPRE) by 2030",
    org: "Ministry of Health & Family Welfare / Ministry of Fisheries, Animal Husbandry & Dairying",
    year: 2021,
    geography: "India",
    type: "government",
    topics: ["rabies", "vaccination", "policy"],
    summary: "India's national roadmap to eliminate dog-mediated human rabies by 2030 through mass dog vaccination, ABC and surveillance.",
  },
  {
    id: "abc-rules-2023",
    title: "Animal Birth Control Rules, 2023",
    org: "Government of India (Ministry of Fisheries, Animal Husbandry & Dairying)",
    year: 2023,
    geography: "India",
    type: "government",
    topics: ["ABC", "sterilisation", "policy"],
    summary: "The statutory framework governing sterilisation and immunisation of community dogs and the duties of local bodies and AWOs.",
  },
  {
    id: "livestock-census-20",
    title: "20th Livestock Census",
    org: "Dept. of Animal Husbandry & Dairying (DAHD)",
    year: 2019,
    geography: "India (state / district)",
    type: "government",
    topics: ["population", "census"],
    summary: "National livestock census that includes a count of stray/ownerless dogs, a common baseline for population estimates. Reported ~1.53 crore (15.3 million) stray dogs nationally in 2019 — the last official count.",
    url: "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1813802&reg=3&lang=2",
  },
  {
    id: "who-rabies",
    title: "Rabies — Fact sheet & Expert Consultation reports",
    org: "World Health Organization",
    year: "ongoing",
    geography: "Global / India",
    type: "research",
    topics: ["rabies", "burden", "vaccination"],
    summary: "WHO guidance and burden estimates on human rabies, dog vaccination thresholds (~70%) and elimination strategy.",
    url: "https://www.who.int/news-room/fact-sheets/detail/rabies",
  },
  {
    id: "ncdc-surveillance",
    title: "Rabies surveillance & National Rabies Control Programme",
    org: "National Centre for Disease Control (NCDC)",
    year: "ongoing",
    geography: "India",
    type: "government",
    topics: ["rabies", "surveillance"],
    summary: "National programme and surveillance activity for rabies control, including animal-bite and case reporting. 2024 figures: 3.7 million reported dog-bite cases and 54 officially “suspected” human rabies deaths nationwide.",
    url: "https://rabiesfreeindia.mohfw.gov.in/About-NRCP",
  },
  {
    id: "rabies-burden-modelling-2024",
    title: "Estimates of the burden of human rabies deaths and animal bites in India, 2022–23",
    org: "Peer-reviewed (community-based cross-sectional survey & probability decision-tree modelling)",
    year: 2024,
    geography: "India",
    type: "research",
    topics: ["rabies", "burden", "methodology"],
    summary: "Independent modelled estimate of India's true rabies death toll — around 18,000–20,000 deaths a year, roughly 350x the number captured by official passive surveillance. The gap between this and NCDC's reported figures is one of the platform's clearest data-gap findings.",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S1473309924004900",
  },
  {
    id: "sc-abc-compliance-2025",
    title: "Supreme Court review of state ABC compliance",
    org: "Supreme Court of India (reported via independent press)",
    year: 2025,
    geography: "India (state-wise)",
    type: "government",
    topics: ["ABC", "sterilisation", "policy", "surveillance"],
    summary: "The Supreme Court's 2025 review found persistent gaps in ABC infrastructure and, as of its October 2025 deadline, only 2 of 28 states/UTs had filed the ordered sterilisation-compliance reports — direct evidence of how little state-wise ABC data is currently tracked or published.",
    url: "https://india.mongabay.com/2025/09/street-dogs-in-the-spotlight-as-rabies-eradication-deadline-comes-closer/",
  },
  {
    id: "abc-effectiveness-studies",
    title: "Peer-reviewed evaluations of ABC / vaccination programmes",
    org: "Various (academic journals)",
    year: "various",
    geography: "India (city-level)",
    type: "research",
    topics: ["ABC", "effectiveness", "methodology"],
    summary: "City-level studies (e.g. long-running ABC programmes) evaluating impact on dog population, rabies and bite incidence.",
  },
  {
    id: "awbi-guidelines",
    title: "AWBI guidelines & recognised AWO directory",
    org: "Animal Welfare Board of India (AWBI)",
    year: "ongoing",
    geography: "India",
    type: "ngo",
    topics: ["organisations", "guidelines"],
    summary: "Recognition of Animal Welfare Organisations and operational guidelines relevant to community-dog programmes.",
    url: "https://awbi.gov.in/view/index/Project-Recognition-for-ABC",
  },
  {
    id: "state-pet-homelessness",
    title: "State of Pet Homelessness Project",
    org: "Mars Petcare (research collaboration)",
    year: "ongoing",
    geography: "India / Global",
    type: "research",
    topics: ["population", "welfare"],
    summary: "Multi-country research estimating stray and homeless animal populations and drivers, including India.",
  },
];

export const RESEARCH_TOPICS = Array.from(new Set(RESEARCH.flatMap((r) => r.topics))).sort();
