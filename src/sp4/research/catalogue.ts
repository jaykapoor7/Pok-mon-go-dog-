/* ════════════════════════════════════════════════════════════════════
   StrayPaw Research: the catalogue and the programme of work.

   Every entry states what it is, who holds it, where and when it comes
   from, how it may be used and what it cannot show. Nothing here claims a
   finding, a peer review or a licence that has not been established. Live
   figures (record counts, dates) are read from the public programme cards
   at request time; descriptions below never invent them.
   ════════════════════════════════════════════════════════════════════ */

export type Access = "open" | "request" | "restricted";
export const ACCESS_LABEL: Record<Access, string> = {
  open: "Open: download",
  request: "From the original publisher",
  restricted: "Restricted: approved request only",
};

export type Dataset = {
  id: string;
  title: string;
  holder: string;
  kind: string;
  /** A public_programme_cards id when the archive holds a copy, for live dates and counts. */
  programmeId?: string;
  geography: string;
  access: Access;
  licence: string;
  provenance: string;
  limitations: string[];
  /** Where a researcher actually gets it. */
  obtain: { label: string; href: string };
};

export const DATASETS: Dataset[] = [
  {
    id: "published-surveys",
    title: "StrayPaw published survey results",
    holder: "StrayPaw, with each surveying organisation",
    kind: "Aggregate survey dataset",
    geography: "Areas named in each survey",
    access: "open",
    licence: "Published by StrayPaw for reuse with attribution. No personal data: no reporter names, contact details or exact coordinates.",
    provenance: "Surveys run on StrayPaw by verified organisations, published only after the organisation chooses to publish. Each row carries method, area, dates, observation and collector counts.",
    limitations: ["Proportions are of animals checked, not of the population.", "Survey coverage depends on each organisation's route and method.", "Empty until the first survey is published."],
    obtain: { label: "Download CSV", href: "/api/research/published-surveys" },
  },
  {
    id: "jamshedpur-cnvr",
    title: "Jamshedpur CNVR clinical records, 2013–2016",
    holder: "Humane World for Animals / HSI",
    kind: "Clinical programme records (research archive copy)",
    programmeId: "abbd502c-ef23-4248-8e90-2b0cb8927b52",
    geography: "Jamshedpur, Jharkhand (city level, no street locations)",
    access: "request",
    licence: "Rights rest with the data holder. StrayPaw keeps a reference copy for methods work and does not redistribute it.",
    provenance: "Imported from the holder's clinic register; every row keeps its source file and batch.",
    limitations: ["Clinic records, not a census: no denominator.", "City-level locations only.", "Historical: not operational activity."],
    obtain: { label: "Contact the data holder", href: "https://www.hsi.org/" },
  },
  {
    id: "ranchi-mission-rabies",
    title: "Ranchi mass rabies vaccination drive, 2014–2015",
    holder: "Mission Rabies",
    kind: "Public vaccination campaign dataset (research archive copy)",
    programmeId: "4fdb16ca-de99-473c-a480-6f300f0e687a",
    geography: "Ranchi, Jharkhand",
    access: "request",
    licence: "As published by Mission Rabies. Obtain and cite the original release; StrayPaw does not redistribute it.",
    provenance: "Imported from the published dataset with its source recorded.",
    limitations: ["Vaccinations recorded, not coverage of the population.", "Historical: not operational activity."],
    obtain: { label: "Mission Rabies", href: "https://missionrabies.com/" },
  },
  {
    id: "iiser-kolkata",
    title: "Free-ranging dog observation studies, West Bengal",
    holder: "IISER Kolkata",
    kind: "Published behavioural observation datasets (research archive copy)",
    programmeId: "f2a9fb35-01f9-4ab9-8a40-149747afbd48",
    geography: "Nine West Bengal towns, including Kalyani, Mohanpur and Bardhaman",
    access: "request",
    licence: "As published with each study. Cite the original papers and datasets; StrayPaw does not redistribute them.",
    provenance: "Imported from the authors' published datasets with attribution.",
    limitations: ["Observation studies: no treatment is recorded.", "Study sites, not a representative sample of India.", "Historical: not operational activity."],
    obtain: { label: "IISER Kolkata", href: "https://www.iiserkol.ac.in/" },
  },
  {
    id: "partner-operations",
    title: "Partner programme records (ABC, ARV, follow-up)",
    holder: "Each operating organisation",
    kind: "Operational animal-level records",
    geography: "Programme areas of consenting partners",
    access: "restricted",
    licence: "Released only with the data-owning organisation's written approval, a data-sharing agreement and, where people are involved, ethics approval. Never raw personal data.",
    provenance: "Animal-level records with evidence, sign-offs and audit history in StrayPaw.",
    limitations: ["Available only as de-identified extracts agreed per request.", "Exact locations and reporter details are never released."],
    obtain: { label: "Request access", href: "/research/access?dataset=partner-operations" },
  },
];

export type Status = "published" | "in_progress" | "proposed";
export const STATUS_LABEL: Record<Status, string> = { published: "Published", in_progress: "In progress", proposed: "Proposed" };

export type Project = { title: string; status: Status; summary: string; evidence: string; href?: { label: string; href: string } };

export const PROJECTS: Project[] = [
  {
    title: "Kaju reliability: record tools that never invent a figure",
    status: "in_progress",
    summary: "An engineering evaluation of Kaju's model-free tools: that unreadable records are reported as unknown rather than zero, that every change is confirmed and audited, and that no request reaches a paid model unless explicitly authorised.",
    evidence: "Automated checks run with every change to the code. This is software testing, not a peer-reviewed study.",
    href: { label: "How Kaju works", href: "/ai" },
  },
  {
    title: "Recorded counts versus population: reporting rules for ABC programmes",
    status: "in_progress",
    summary: "Documenting how StrayPaw separates recorded procedures, clinical sign-off, municipal acceptance and estimated coverage, so programme figures cannot be read as population claims.",
    evidence: "Method notes are public; no outcome claims are made.",
    href: { label: "Research standards", href: "/research-standards" },
  },
  {
    title: "Evidence completeness in municipal ABC claims",
    status: "proposed",
    summary: "A proposed study of how often animal-level claims carry complete capture, surgery, ear-notch and release evidence, and what delays completion.",
    evidence: "Proposed. No data has been collected or analysed for it.",
  },
  {
    title: "Effect of WhatsApp-based intake on time from report to treatment",
    status: "proposed",
    summary: "A proposed evaluation, once WhatsApp intake is connected and partners consent, comparing report-to-treatment times before and after.",
    evidence: "Proposed. Depends on a connection that is not live.",
  },
];
