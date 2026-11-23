/* ════════════════════════════════════════════════════════════════════
   The homepage's sample programme.

   Kaju on the public homepage answers from this file and nothing else.
   It is the same illustrative programme the hero's product demo plays
   (Ward 14 ABC Unit: Anita, Ravi, Dr. Rao, the October package), written
   out as records so a visitor can ask about it in their own words.

   Every name, animal, date and figure here is invented and is labelled
   "sample programme" wherever it is shown. Nothing is read from, or
   written to, a database: the public endpoint that uses this file holds
   no database connection at all, so there is no organisation's record it
   could reach. The file is plain data and is imported by the server only.
   ════════════════════════════════════════════════════════════════════ */

export const EVIDENCE = ["capture_photo", "vet_authorisation", "ear_notch_photo", "vaccination_record", "release_photo"] as const;
export type EvidenceKind = (typeof EVIDENCE)[number];
export const EVIDENCE_WORD: Record<EvidenceKind, string> = { capture_photo: "Capture photo", vet_authorisation: "Vet authorisation", ear_notch_photo: "Ear-notch photo", vaccination_record: "Vaccination record", release_photo: "Release photo" };

export type Stage = "New" | "In care" | "With the vet" | "Evidence" | "To report" | "Released";
export type DemoEvent = { when: string; who: string; what: string; tag: string };
export type DemoAnimal = {
  code: string; name: string | null; sex: "Female" | "Male"; looks: string; place: string; stage: Stage;
  capturedOn: string; sterilisedOn: string | null; vaccinatedOn: string | null; releasedOn: string | null;
  missing: EvidenceKind[]; flags: string[]; next: string; history: DemoEvent[];
};

export const SAMPLE = {
  label: "Sample programme",
  org: "Ward 14 ABC Unit",
  programme: "Ward 14 ABC drive",
  city: "an illustrative city",
  asOf: "2026-11-04",
  asOfWords: "Wednesday 4 November 2026",
  week: "week 44 (26 October to 1 November)",
  people: [
    { id: "anita", name: "Anita", role: "Coordinator" },
    { id: "ravi", name: "Ravi", role: "Field team" },
    { id: "rao", name: "Dr. Rao", role: "Veterinarian" },
    { id: "office", name: "Municipal office", role: "Reviewer" },
  ],
  places: ["Ward 14", "Market gate", "Canal Road", "Main Road", "Temple lane", "Bus depot"],
} as const;

/** The register as it stands on the sample's own day. Summary figures: the detailed records below are part of them. */
export const FIGURES = {
  records: 164,
  sterilised: 142,
  vaccinated: 139,
  released: 131,
  inCare: 11,
  releasedThisWeek: 18,
  missingReleasePhoto: 2,
  evidenceCompletePct: 86,
  exceptions: 4,
};

/** Records checked by Kaju's weekly evidence check, day by day (the chart in the product demo). */
export const CHECKED_PER_DAY: { day: string; records: number }[] = [
  { day: "Mon 26 Oct", records: 19 }, { day: "Tue 27 Oct", records: 26 }, { day: "Wed 28 Oct", records: 24 },
  { day: "Thu 29 Oct", records: 31 }, { day: "Fri 30 Oct", records: 28 }, { day: "Sat 31 Oct", records: 36 },
];

/** Sterilisations by ward in October, for the municipal review (the deck in the product demo). */
export const WARDS: { ward: string; sterilised: number }[] = [
  { ward: "Ward 9", sterilised: 98 }, { ward: "Ward 12", sterilised: 76 }, { ward: "Ward 14", sterilised: 142 },
  { ward: "Ward 17", sterilised: 61 }, { ward: "Ward 22", sterilised: 88 },
];

const trail = (code: string, a: { captured: string; place: string; looks: string; vet?: string; kg?: string; vaccinated?: string; released?: string; photo?: boolean; extra?: DemoEvent[] }): DemoEvent[] => [
  { when: `${a.captured} · 07:42`, who: "Ravi", what: `Reported from the field: ${a.looks}, ${a.place}`, tag: "Field capture" },
  { when: `${a.captured} · 07:43`, who: "Kaju", what: `Drafted record ${code} from the message`, tag: "Prepared by Kaju" },
  { when: `${a.captured} · 09:10`, who: "Anita", what: "Confirmed the draft and assigned Ravi", tag: "Coordinator" },
  ...(a.vet ? [{ when: `${a.vet} · 14:05`, who: "Dr. Rao", what: `Authorised sterilisation${a.kg ? `, ${a.kg} kg` : ""}`, tag: "Vet sign-off" }] : []),
  ...(a.vaccinated ? [{ when: `${a.vaccinated} · 14:20`, who: "Dr. Rao", what: "Anti-rabies vaccination recorded", tag: "Vet sign-off" }] : []),
  ...(a.released ? [{ when: `${a.released} · 17:20`, who: "Ravi", what: a.photo === false ? "Released at the capture point; no release photo attached" : "Release photo at the capture point", tag: a.photo === false ? "Evidence missing" : "Evidence" }] : []),
  ...(a.extra ?? []),
];

export const ANIMALS: DemoAnimal[] = [
  { code: "SP-1031", name: null, sex: "Female", looks: "black and tan, medium", place: "Canal Road", stage: "To report", capturedOn: "2026-10-24", sterilisedOn: "2026-10-25", vaccinatedOn: "2026-10-25", releasedOn: "2026-10-28", missing: [], flags: [], next: "Ready for the October package.",
    history: trail("SP-1031", { captured: "24 Oct", place: "Canal Road", looks: "black and tan female", vet: "25 Oct", kg: "12.8", vaccinated: "25 Oct", released: "28 Oct", photo: false, extra: [
      { when: "3 Nov · 09:02", who: "Kaju", what: "Weekly evidence check: release photo missing", tag: "Prepared by Kaju" },
      { when: "3 Nov · 11:40", who: "Ravi", what: "Added the release photo from his phone", tag: "Evidence" },
    ] }) },
  { code: "SP-1042", name: "Moti", sex: "Female", looks: "brown with a white chest, medium", place: "Market gate", stage: "To report", capturedOn: "2026-10-26", sterilisedOn: "2026-10-27", vaccinatedOn: "2026-10-27", releasedOn: "2026-10-30", missing: [], flags: ["Possible duplicate of SP-1067"], next: "Anita decides whether SP-1067 is the same animal.",
    history: trail("SP-1042", { captured: "26 Oct", place: "Market gate", looks: "brown female, white chest", vet: "27 Oct", kg: "13.6", vaccinated: "27 Oct", released: "30 Oct" }) },
  { code: "SP-1044", name: null, sex: "Male", looks: "white with brown patches, large", place: "Bus depot", stage: "Evidence", capturedOn: "2026-10-26", sterilisedOn: "2026-10-27", vaccinatedOn: "2026-10-27", releasedOn: "2026-10-31", missing: ["release_photo"], flags: ["Request sent to Ravi"], next: "Ravi sends the release photo; then it joins the October package.",
    history: trail("SP-1044", { captured: "26 Oct", place: "Bus depot", looks: "white and brown male", vet: "27 Oct", kg: "17.1", vaccinated: "27 Oct", released: "31 Oct", photo: false, extra: [
      { when: "3 Nov · 09:02", who: "Kaju", what: "Weekly evidence check: release photo missing", tag: "Prepared by Kaju" },
      { when: "3 Nov · 09:15", who: "Anita", what: "Confirmed Kaju's request to Ravi for the photo", tag: "Coordinator" },
    ] }) },
  { code: "SP-1058", name: "Kalu", sex: "Male", looks: "black, medium", place: "Main Road", stage: "To report", capturedOn: "2026-10-27", sterilisedOn: "2026-10-28", vaccinatedOn: "2026-10-28", releasedOn: "2026-10-31", missing: [], flags: ["Released 400 m from the capture point"], next: "In the October package as an explained exception.",
    history: trail("SP-1058", { captured: "27 Oct", place: "Main Road", looks: "black male", vet: "28 Oct", kg: "15.0", vaccinated: "28 Oct", released: "31 Oct", extra: [
      { when: "31 Oct · 17:25", who: "Ravi", what: "Field note: Main Road closed for repairs, released at the nearest safe point 400 m away", tag: "Field capture" },
    ] }) },
  { code: "SP-1067", name: null, sex: "Female", looks: "brown with a white chest, medium", place: "Market gate", stage: "Evidence", capturedOn: "2026-10-29", sterilisedOn: null, vaccinatedOn: "2026-10-30", releasedOn: "2026-10-31", missing: ["release_photo"], flags: ["Possible duplicate of SP-1042"], next: "Anita decides whether this is SP-1042 seen again; held out of the claim until then.",
    history: [
      { when: "29 Oct · 08:05", who: "Ravi", what: "Reported from the field: brown female with a white chest, Market gate, ear already notched", tag: "Field capture" },
      { when: "29 Oct · 08:06", who: "Kaju", what: "Drafted record SP-1067; flagged that SP-1042 has the same description and place", tag: "Prepared by Kaju" },
      { when: "30 Oct · 10:30", who: "Dr. Rao", what: "Examined: ear notch present, no surgery needed; vaccination recorded", tag: "Vet sign-off" },
      { when: "31 Oct · 16:50", who: "Ravi", what: "Released at Market gate; no release photo attached", tag: "Evidence missing" },
      { when: "3 Nov · 09:02", who: "Kaju", what: "Weekly evidence check: release photo missing; duplicate still undecided", tag: "Prepared by Kaju" },
    ] },
  { code: "SP-1071", name: "Sheru", sex: "Female", looks: "brown, medium", place: "Temple lane", stage: "To report", capturedOn: "2026-10-30", sterilisedOn: "2026-10-31", vaccinatedOn: "2026-10-31", releasedOn: "2026-11-02", missing: [], flags: [], next: "Ready for the October package.",
    history: trail("SP-1071", { captured: "30 Oct", place: "Temple lane", looks: "brown female", vet: "31 Oct", kg: "14.2", vaccinated: "31 Oct", released: "2 Nov" }) },
  { code: "SP-1019", name: "Rani", sex: "Female", looks: "fawn, small", place: "Canal Road", stage: "To report", capturedOn: "2026-10-19", sterilisedOn: "2026-10-20", vaccinatedOn: "2026-10-20", releasedOn: "2026-10-29", missing: [], flags: ["Nine days in care"], next: "In the October package as an explained exception.",
    history: trail("SP-1019", { captured: "19 Oct", place: "Canal Road", looks: "fawn female, small", vet: "20 Oct", kg: "9.4", vaccinated: "20 Oct", released: "29 Oct", extra: [
      { when: "24 Oct · 10:15", who: "Dr. Rao", what: "Clinical note: wound slow to close, keep in care until checked again", tag: "Vet sign-off" },
      { when: "28 Oct · 10:05", who: "Dr. Rao", what: "Cleared for release", tag: "Vet sign-off" },
    ] }) },
  { code: "SP-1079", name: null, sex: "Male", looks: "tan with a black muzzle, medium", place: "Bus depot", stage: "With the vet", capturedOn: "2026-11-02", sterilisedOn: "2026-11-03", vaccinatedOn: null, releasedOn: null, missing: ["vaccination_record", "ear_notch_photo", "release_photo"], flags: [], next: "Dr. Rao records the vaccination; release is planned for Friday 6 November.",
    history: trail("SP-1079", { captured: "2 Nov", place: "Bus depot", looks: "tan male, black muzzle", vet: "3 Nov", kg: "16.3" }) },
  { code: "SP-1082", name: null, sex: "Female", looks: "white, small", place: "Temple lane", stage: "In care", capturedOn: "2026-11-03", sterilisedOn: null, vaccinatedOn: null, releasedOn: null, missing: ["vet_authorisation", "ear_notch_photo", "vaccination_record", "release_photo"], flags: [], next: "Waiting for Dr. Rao to examine and authorise.",
    history: trail("SP-1082", { captured: "3 Nov", place: "Temple lane", looks: "white female, small" }) },
  { code: "SP-1084", name: null, sex: "Female", looks: "brown, limping on the back left leg, not ear-notched", place: "Market gate", stage: "New", capturedOn: "2026-11-04", sterilisedOn: null, vaccinatedOn: null, releasedOn: null, missing: ["capture_photo", "vet_authorisation", "ear_notch_photo", "vaccination_record", "release_photo"], flags: ["Injury reported"], next: "Anita reviews Kaju's draft and assigns the pickup.",
    history: [
      { when: "4 Nov · 08:31", who: "Ravi", what: "Field message: brown female at the market gate, limping on the back left leg, not ear-notched", tag: "Field capture" },
      { when: "4 Nov · 08:32", who: "Kaju", what: "Drafted record SP-1084; waiting for review", tag: "Prepared by Kaju" },
    ] },
];

/** The October package for the reviewing office, as the product demo shows it. */
export const PACKAGE = {
  title: "Ward 14 ABC drive · October 2026",
  status: "Draft, not yet submitted",
  dueOn: "2026-11-06",
  dueWords: "Friday 6 November",
  preparedBy: "Kaju",
  confirmedBy: "Anita, coordinator",
  sections: ["Summary", "Evidence index", "Vet authorisations", "Exceptions log"],
  exceptions: [
    { code: "SP-1044", issue: "Release photo missing", state: "Request sent to Ravi" },
    { code: "SP-1067", issue: "Release photo missing; possible duplicate of SP-1042", state: "Held out of the claim until Anita decides" },
    { code: "SP-1019", issue: "Nine days in care, longer than usual", state: "Explained by Dr. Rao's clinical note" },
    { code: "SP-1058", issue: "Released 400 m from the capture point", state: "Explained by Ravi's field note (road closed)" },
  ],
};

export const TODAY_BRIEF = [
  { what: "Pickup request from the field: brown female at the market gate", code: "SP-1084", tag: "Draft to review" },
  { what: "Dr. Rao authorised 12 sterilisations from the 3 November list", code: null, tag: "Vet-authorised" },
  { what: "2 releases are still missing a release photo", code: "SP-1044", tag: "Evidence" },
  { what: "SP-1042 and SP-1067 may be the same animal", code: "SP-1067", tag: "Decide" },
] as const;

export const findAnimal = (code: string) => ANIMALS.find((a) => a.code.toLowerCase() === code.trim().toLowerCase()) ?? null;
/** In-page address of a sample record: the homepage opens it as a card inside the product window, never as another page. */
export const recordHref = (code: string) => `/#record/${encodeURIComponent(code)}`;
export const animalLabel = (a: DemoAnimal) => (a.name ? `${a.name} · ${a.code}` : a.code);
