// ════════════════════════════════════════════════════════════════
// Education partners.
//
// StrayPaw does not write teaching material. Organisations that have spent
// years doing it write it far better, so the education area exists to carry
// theirs, under their own name.
//
// This is a registry rather than a page of hand-written blocks, because the
// intent is more than one partner. Adding the second is a row here; the page
// and the routes come from it. `status` is what keeps it honest: a partner
// in conversation is listed as in conversation, and the page says so instead
// of showing shelves labelled "coming soon".
// ════════════════════════════════════════════════════════════════

export type PartnerStatus =
  /** Material is hosted and the partner page is live. */
  | "live"
  /** Agreed in principle, nothing hosted yet. */
  | "in-conversation";

export interface EducationPartner {
  id: string;
  name: string;
  /** Expanded, because the acronym on its own is regularly got wrong. */
  fullName: string;
  city: string;
  url: string;
  /** What the organisation does, in its own terms. */
  summary: string;
  /** Named programmes, as the organisation describes them. */
  programmes: string[];
  status: PartnerStatus;
  /** Where its material will live once there is any. */
  href: string;
  source: string;
}

export const EDUCATION_PARTNERS: EducationPartner[] = [
  {
    id: "straw-india",
    name: "STRAW India",
    fullName: "Stray Relief and Animal Welfare (STRAW) India",
    city: "New Delhi",
    url: "https://www.strawindia.org/",
    summary:
      "A New Delhi organisation whose work is humane education: teaching children and young people about animals, coexistence and responsible behaviour, rather than running field operations.",
    programmes: [
      "Compassionate Classrooms — animal-welfare content written into school textbooks with CBSE and state education boards",
      "Animal-welfare workshops and presentations in schools and colleges",
      "Painting and essay-writing programmes, and nature walks",
    ],
    status: "in-conversation",
    href: "/education/straw-india",
    source: "strawindia.org",
  },
];

export const livePartners = () =>
  EDUCATION_PARTNERS.filter((p) => p.status === "live");
export const pendingPartners = () =>
  EDUCATION_PARTNERS.filter((p) => p.status === "in-conversation");
