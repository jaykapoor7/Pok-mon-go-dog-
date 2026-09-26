// ════════════════════════════════════════════════════════════════
// Education partners.
//
// StrayPaw does not write teaching material. Organisations that have spent
// years doing it write it far better, so the education area exists to carry
// theirs, under their own name.
//
// This is a registry rather than a page of hand-written blocks, because the
// intent is more than one partner. Adding the second is a row here; the page
// comes from it.
//
// Everything listed is a real organisation doing real, published work, named
// with a link to it. There is no status field and no "coming soon" shelf: a
// page either carries something somebody can use or it does not carry it.
// ════════════════════════════════════════════════════════════════

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
      "Compassionate Classrooms: animal-welfare content written into school textbooks with CBSE and state education boards",
      "Animal-welfare workshops and presentations in schools and colleges",
      "Painting and essay-writing programmes, and nature walks",
    ],
    source: "strawindia.org",
  },
  {
    id: "the-kind-hour-foundation",
    name: "The Kind Hour Foundation",
    fullName: "The Kind Hour Foundation",
    city: "Lucknow",
    url: "https://www.thekindhour.org",
    summary:
      "A Lucknow animal-protection organisation that works on prevention: education, vaccination, sterilisation and community engagement. Its stated aim is to replace rescue and shelter organisations with local communities that care for the animals around them, and it believes change best happens through art.",
    programmes: [
      "School sessions for young children on animals, habitats and everyday do's and don'ts",
      "Rethinking Indies: who street dogs are, the myths about them, and what anyone can do, in English and Hindi",
      "Gully Gang: a public-art intervention with the Animal Law Centre, NALSAR Hyderabad",
    ],
    source: "thekindhour.org",
  },
];

/* Original materials shared by The Kind Hour Foundation. We link to the
   source PDFs; StrayPaw does not rewrite them into invented lesson plans.
   Audience and facilitation notes are our editorial framing, not claims
   from the decks. */
export type KindHourMaterial = {
  id: string;
  title: string;
  audience: string;
  slides: number;
  languages: string;
  driveUrl: string;
  purpose: string;
  facilitatorNote: string;
  themes: string[];
};

export const KIND_HOUR_MATERIALS: KindHourMaterial[] = [
  {
    id: "rethinking-indies",
    title: "Rethinking Indies",
    audience: "Schools and community groups",
    slides: 36,
    languages: "English + Hindi",
    driveUrl: "https://drive.google.com/file/d/1r_3_GbprjQHCJBuzdSyJJo_hHZ3Ka2iO/view",
    purpose: "A bilingual starting point for discussing Indian street dogs, stigma and practical care.",
    facilitatorNote: "Use the myths as discussion prompts. Separate the deck's perspective from locally verified facts and current guidance.",
    themes: ["Street-dog stigma", "Community roles", "Everyday care"],
  },
  {
    id: "learn-about-nature",
    title: "Learn about nature",
    audience: "Young children",
    slides: 33,
    languages: "English; Hindi closing slide",
    driveUrl: "https://drive.google.com/file/d/1zmFhVf1k4ecoiubc5Am4z6NwUE7hWhsw/view",
    purpose: "A gentle introduction to animals, habitats, feelings and how children can respond with care.",
    facilitatorNote: "Best used as a guided conversation with the visual prompts, not as a factual taxonomy lesson.",
    themes: ["Habitats", "Shared feelings", "Kind choices"],
  },
  {
    id: "coexisting-with-the-planet",
    title: "Coexisting with the planet",
    audience: "Primary and middle school",
    slides: 100,
    languages: "English",
    driveUrl: "https://drive.google.com/file/d/1Koh4ONNxerEuOC4CRAngn4SjVJkooSYC/view",
    purpose: "A broad classroom deck on animals, habitats, companionship, fostering, adoption and citizenship.",
    facilitatorNote: "Long-form material. Select a chapter for one session, and verify legal or policy claims against current official guidance before teaching them.",
    themes: ["Coexistence", "Fostering and adoption", "Responsible citizenship"],
  },
  {
    id: "gully-gang-goa",
    title: "Gully Gang Goa",
    audience: "Colleges, clubs and creative programmes",
    slides: 67,
    languages: "English",
    driveUrl: "https://drive.google.com/file/d/1Qx7R2NAYSFKt39KOCQkMA4l_PWJz0R4a/view",
    purpose: "A case study in using public art, documentation and campaigning to change how urban animals are represented.",
    facilitatorNote: "Useful for project-based learning. Ask learners to document their place before designing an intervention.",
    themes: ["Public art", "Representation", "Campaign design"],
  },
  {
    id: "hello",
    title: "Hello!",
    audience: "Older students and adults",
    slides: 42,
    languages: "English; Urdu poem",
    driveUrl: "https://drive.google.com/file/d/1KP-rb-dpKjHeNfM4Tnsu3Cef5dbYG3fb/view",
    purpose: "A facilitator-led reflection on empathy, intuition and how social framing changes whose suffering people notice.",
    facilitatorNote: "Sensitive material: it opens with sexual-violence content. Review the full deck first, use an age-appropriate content note, and provide a way to opt out.",
    themes: ["Empathy", "Perspective", "Facilitated reflection"],
  },
];

/** Kept as an alias for any existing imports while the UI moves to materials. */
export const KIND_HOUR_DECKS = KIND_HOUR_MATERIALS;
