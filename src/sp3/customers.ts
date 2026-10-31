/* ════════════════════════════════════════════════════════════════════
   Customer and partner evidence for the public site.

   Every relationship label below is checked against the database
   (`ngos.partner_status`, verified read-only on 2026-10-31) and the product
   owner's partner confirmation in src/data/field-partners.json. Figures come
   only from the published programme archive. Nothing here is a testimonial:
   quotes are shown only once a partner approves one in writing.
   ════════════════════════════════════════════════════════════════════ */

import archive from "@/data/partner-programmes-archive.json";
import fieldPartners from "@/data/field-partners.json";

export type Relationship = "operational" | "imported" | "field";
export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  operational: "Operational partner · workspace + register",
  imported: "Field partner · historical register imported",
  field: "Field partner",
};

type Prog = (typeof archive.programmes)[number];

export type Story = {
  slug: string;
  name: string;
  city: string;
  relationship: Relationship;
  logo?: string;
  summary: string;
  problem: string;
  how: string[];
  workflows: { label: string; href: string }[];
  results: { n: number; label: string; note: string }[];
  limits: string[];
  quote: null;
  programmes: Prog[];
};

const progs = (slug: string) => archive.programmes.filter((p) => p.ngo_slug === slug);
const num = (s: string | null | undefined, re: RegExp) => Number(s?.match(re)?.[1]?.replace(/,/g, "") ?? 0);

const pawsome = progs("the-pawsome-people-project");
const kind = progs("the-kind-hour-foundation");
const pRescue = pawsome.find((p) => /rescue/i.test(p.name));
const pSter = pawsome.find((p) => /steril/i.test(p.name));
const pVacc = pawsome.find((p) => /vacc|rabies/i.test(p.name));
const kRescue = kind[0];

export const STORIES: Story[] = [
  {
    slug: "the-pawsome-people-project",
    name: "The Pawsome People Project",
    city: "Coimbatore",
    relationship: "operational",
    logo: "/partners/pawsome-people-project-logo.svg",
    summary: "Coimbatore's rescue, sterilisation and vaccination register, brought onto one record.",
    problem: "Rescue requests, ABC drive sheets and vaccination notes lived in separate spreadsheets and message threads. Answering a simple question, such as how many animals from a drive were released with evidence, meant reading several files by hand.",
    how: [
      "Imported the organisation's historical rescue register, ABC drive register and vaccination records, keeping each row's source.",
      "Every animal now carries one history: request, treatment, sterilisation, vaccination and outcome.",
      "The team has an NGO workspace for new work: inbox, cases, follow-ups and programme registers.",
      "Programmes are published on StrayPaw with their recorded figures and method.",
    ],
    workflows: [
      { label: "Register import", href: "/docs#import" },
      { label: "Programmes", href: "/partner-programmes" },
      { label: "Rescue & care", href: "/solutions/rescue-care" },
    ],
    results: [
      { n: pRescue?.animals_recorded ?? 0, label: "rescue requests documented", note: `${num(pRescue?.public_summary, /(\d[\d,]*) carry a closed/).toLocaleString("en-IN")} with a closed or resolved outcome in the source register` },
      { n: pSter?.sterilised_recorded ?? 0, label: "sterilisations in the Chiloo drive register", note: "Jan–Aug 2026, historical field register" },
      { n: pVacc?.vaccinated_recorded ?? 0, label: "animals with a recorded vaccination", note: "explicit ARV or vaccination entries, 2024–2026" },
    ],
    limits: [
      "These figures come from imported historical registers, not from work entered live in StrayPaw.",
      "Source records are attributed to the organisation; StrayPaw has not independently verified each one.",
      "Time saved has not been measured yet. We will publish it only once it is measured with the team.",
    ],
    quote: null,
    programmes: pawsome,
  },
  {
    slug: "the-kind-hour-foundation",
    name: "The Kind Hour Foundation",
    city: "Lucknow",
    relationship: "imported",
    summary: "A Lucknow rescue and treatment register, with each animal's condition and outcome kept together.",
    problem: "Rescue and treatment work for distemper, fractures and tumours was recorded case by case, which made it hard to see the full history of an animal or the programme as a whole.",
    how: [
      "Imported the foundation's rescue and treatment register for January 2024 to August 2026.",
      "Each request is linked to its animal, so repeat treatments read as one history.",
      "The register is published as a programme with its method and dates.",
    ],
    workflows: [
      { label: "Register import", href: "/docs#import" },
      { label: "Rescue & care", href: "/solutions/rescue-care" },
    ],
    results: [
      { n: num(kRescue?.public_summary, /(\d[\d,]*) rescue requests/) || (kRescue?.animals_recorded ?? 0), label: "rescue requests documented", note: `for ${(kRescue?.animals_recorded ?? 0).toLocaleString("en-IN")} animals, Jan 2024 – Aug 2026` },
    ],
    limits: [
      "This is a historical register import. The foundation does not yet run its day-to-day work in StrayPaw.",
      "Source records are attributed to the foundation and are not independently verified.",
    ],
    quote: null,
    programmes: kind,
  },
];

export function storyBySlug(slug: string) { return STORIES.find((s) => s.slug === slug) ?? null; }

/** Every confirmed field partner, with an accurate relationship label. */
export function fieldPartnerStrip() {
  return fieldPartners.organisations.map((o) => ({
    name: o.name,
    city: o.city,
    relationship: (o.name === "The Pawsome People Project" ? "operational" : o.name === "The Kind Hour Foundation" ? "imported" : "field") as Relationship,
  })).sort((a, b) => (a.relationship === b.relationship ? a.name.localeCompare(b.name) : a.relationship === "operational" ? -1 : b.relationship === "operational" ? 1 : a.relationship === "imported" ? -1 : 1));
}
