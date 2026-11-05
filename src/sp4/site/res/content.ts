/* ════════════════════════════════════════════════════════════════════
   Content for the Resources pages: blog posts, product updates, the
   roadmap, events and the team pages. Everything here is StrayPaw's own
   account of its work: shipped items carry the date they shipped (from the
   release history), planned items say "planned", and no event, customer
   quote or figure is invented.
   ════════════════════════════════════════════════════════════════════ */

export type Kind = "Field guides" | "Product updates" | "Newsroom" | "Case studies" | "Research notes";
export const KINDS: Kind[] = ["Field guides", "Case studies", "Research notes", "Product updates", "Newsroom"];

export type Post = {
  slug: string; kind: Kind; date: string; title: string; dek: string; cover: Cover; minutes: number;
  body: { h?: string; p?: string; list?: string[] }[];
};
/** A drawn cover: no stock photography, the product's own colours. */
export type Cover = { tone: "navy" | "blue" | "split" | "tint"; label: string; word: string };

export const POSTS: Post[] = [
  { slug: "release-evidence-before-the-bill", kind: "Field guides", date: "2026-11-04", minutes: 6,
    title: "Release evidence that survives a municipal review",
    dek: "What a reviewing office checks on every released animal, and the three gaps that hold back most monthly claims.",
    cover: { tone: "split", label: "Field guide", word: "Release" },
    body: [
      { p: "Most ABC claims that come back from a municipal office come back for the same reason: the release cannot be shown. The surgery happened and the vet signed, but the release photo is missing, was taken on the wrong day, or shows a place that does not match the capture ward." },
      { h: "What the office checks", list: ["A release photo of the same animal, with its ear notch visible", "A release place inside the ward it was captured from", "A release date after the post-operative stay, not before", "A vet authorisation that names the procedure and the animal"] },
      { h: "The three common gaps", list: ["Photos taken in a batch at the end of the day, without the animal's ID", "Release recorded at the shelter address instead of the street", "Animals held longer for a wound check without a note saying why"] },
      { h: "How to close them the same day", p: "Ask for the photo while the field worker is still on the street. In StrayPaw, the Release Photo Chaser agent lists every release from the day without a photo or a place, and asks the person who recorded it, by name, before the evening ends. Gaps fixed on the day never reach the claim." },
    ] },
  { slug: "bring-your-old-registers", kind: "Field guides", date: "2026-10-28", minutes: 5,
    title: "Bringing years of Excel registers onto one record",
    dek: "How to import historical ABC and rescue registers without losing where each row came from.",
    cover: { tone: "tint", label: "Field guide", word: "Import" },
    body: [
      { p: "Most organisations already have years of work in spreadsheets: drive sheets, rescue logs, vaccination lists. That history is valuable, and it is also the least checked data you have." },
      { h: "Keep the source", p: "Import every row as it is, with the file and row it came from. Do not clean it on the way in. StrayPaw labels imported rows as historical until a person checks them, so a figure from an old sheet is never presented as verified work." },
      { h: "Map columns, not values", list: ["Dog number becomes the StrayPaw ID", "Area or locality becomes the ward", "Operation date becomes the sterilisation date", "Free text stays as a note"] },
      { h: "Then let Kaju find the duplicates", p: "The same dog often appears in two sheets under two spellings. Kaju compares coat, sex, notch and place, and lists likely duplicates for a person to merge." },
    ] },
  { slug: "pawsome-one-record", kind: "Case studies", date: "2026-10-20", minutes: 4,
    title: "Pawsome People Project: three registers, one record",
    dek: "How a Coimbatore team brought three separate registers into one record.",
    cover: { tone: "blue", label: "Case study", word: "Coimbatore" },
    body: [
      { p: "The Pawsome People Project kept rescue requests, ABC drive sheets and vaccination notes in separate spreadsheets and message threads. Answering a simple question, such as how many animals from a drive were released with evidence, meant reading all three." },
      { h: "What changed", list: ["Historical rescue, ABC and vaccination registers imported with their sources", "One history per animal: request, treatment, sterilisation, vaccination, outcome", "An NGO workspace for new work: intake, cases, follow-ups and registers"] },
      { h: "What comes next", p: "New intake, cases and follow-ups now run in the NGO workspace, on the same record as the history." },
    ] },
  { slug: "what-a-street-count-can-say", kind: "Research notes", date: "2026-10-14", minutes: 7,
    title: "What a street survey can and cannot say about coverage",
    dek: "Why 'percentage sterilised' needs a census, unique identification and a boundary before it means anything.",
    cover: { tone: "navy", label: "Research note", word: "Coverage" },
    body: [
      { p: "Programmes are often asked for one number: what share of a ward's dogs are sterilised. A street survey that counts ear-notched dogs gives a proportion of the dogs seen, not of the dogs that live there." },
      { h: "What a coverage figure needs", list: ["A defined boundary, walked completely", "A count method that is repeated the same way each time", "Unique identification, so an animal is not counted twice", "A stated date and time window"] },
      { h: "How StrayPaw reports it", p: "StrayPaw reports a marked proportion of recorded observations, with its method and limits written next to it, and only calls it coverage when a complete census has been documented." },
    ] },
  { slug: "kaju-agents-launch", kind: "Newsroom", date: "2026-11-04", minutes: 3,
    title: "Introducing Kaju agents for animal-welfare programmes",
    dek: "Kaju now runs recurring work on a schedule: release photos, vet paperwork, follow-ups and the monthly claim.",
    cover: { tone: "split", label: "Newsroom", word: "Agents" },
    body: [
      { p: "Kaju agents are recurring jobs Kaju runs for an organisation, on a schedule or when something happens. Each one says what it may read and whom it tells. Agents prepare; a named person confirms every change." },
      { h: "The first roles", list: ["Field Intake Agent", "Register Keeper", "Vet Sign-off Assistant", "Release Photo Chaser", "Follow-up Reminder", "Monthly Claim Builder", "Municipal Review Prep", "Data Quality Watch"] },
    ] },
  { slug: "new-identity", kind: "Newsroom", date: "2026-11-04", minutes: 2,
    title: "A new StrayPaw identity, and Kaju with a face",
    dek: "A refreshed logo, and Kaju now greets, thinks and celebrates with expressive faces across the product.",
    cover: { tone: "blue", label: "Newsroom", word: "Identity" },
    body: [{ p: "StrayPaw has a new logo, and Kaju, the agent inside every workspace, now has an expressive companion form. The change is visual only: nothing about how records, permissions or approvals work has changed." }] },
];

export type Update = { date: string; area: string; title: string; body: string };
/** Shipped, in the order they shipped (from the release history). */
export const UPDATES: Update[] = [
  { date: "2026-11-04", area: "Kaju", title: "Kaju agents", body: "Recurring jobs on a schedule or when something happens: release photos, vet paperwork, follow-ups and the monthly claim." },
  { date: "2026-11-04", area: "Workflow", title: "Undo for sign-offs and assignments", body: "A vet sign-off or an evidence approval can be withdrawn straight away, with the reason recorded on the case." },
  { date: "2026-11-03", area: "Platform", title: "Faster registers", body: "Permissions are checked once per screen instead of once per record. The care ledger on a 22,000-record register went from 17 seconds to about 1." },
  { date: "2026-11-03", area: "Kaju", title: "File upload in Kaju", body: "Attach a register, document or deck: Kaju shows the upload, recognises an animal register and hands it to Import." },
  { date: "2026-11-03", area: "Government", title: "Government command centre", body: "Waiting and overdue decisions, claim exceptions and accepted packages for each operator, at a glance." },
  { date: "2026-11-03", area: "Research", title: "Research workspace", body: "A dataset catalogue with provenance and limits, research projects, and controlled data access." },
  { date: "2026-11-03", area: "Workflow", title: "Monthly submission with contract rates", body: "Per-procedure pricing, an explicit reviewing office and per-animal duplicate protection in the monthly claim." },
  { date: "2026-11-03", area: "Kaju", title: "WhatsApp intake desk", body: "Paste WhatsApp reports and confirm the records Kaju prepared from them." },
  { date: "2026-11-03", area: "Field", title: "Encrypted offline intake", body: "Field records saved on the phone without signal, encrypted, and sent when the network returns." },
  { date: "2026-11-02", area: "Field", title: "Offline vaccination records", body: "Anti-rabies doses recorded offline with batch numbers, audited when they sync." },
  { date: "2026-11-02", area: "Kaju", title: "The 52-second Kaju demo", body: "From a field voice note to an accepted report package." },
];

export type RoadItem = { name: string; status: "shipped" | "upcoming"; note?: string };
export type RoadArea = { key: string; title: string; lede: string; href?: string; items: RoadItem[] };
export const ROADMAP: RoadArea[] = [
  { key: "kaju", title: "Kaju & platform", lede: "The agent and the shared record underneath every workspace", href: "/kaju-agents", items: [
    { name: "Kaju agents", status: "shipped" }, { name: "Kaju file upload and register import", status: "shipped" }, { name: "Undo for sign-offs", status: "shipped" },
    { name: "Direct WhatsApp connection", status: "upcoming", note: "waiting for Meta approval" }, { name: "Kaju in Hindi, Tamil and Marathi", status: "upcoming" }, { name: "Public API for partner systems", status: "upcoming" } ] },
  { key: "ops", title: "ABC operations", lede: "Receive, register, treat, release and submit", href: "/abc-operations", items: [
    { name: "Five-step workflow", status: "shipped" }, { name: "Encrypted offline intake", status: "shipped" }, { name: "Monthly claim at contract rates", status: "shipped" },
    { name: "Microchip and QR tag scanning", status: "upcoming" }, { name: "Shelter kennel board", status: "upcoming" } ] },
  { key: "gov", title: "Government", lede: "Review, reconciliation and oversight for municipal offices", href: "/for-governments", items: [
    { name: "Government command centre", status: "shipped" }, { name: "Individual claim review", status: "shipped" },
    { name: "Government e-Office file movement", status: "upcoming" }, { name: "State-level dashboards", status: "upcoming" } ] },
  { key: "national", title: "National register", lede: "One shared record of India's street animals, open to the public and to science", href: "/community", items: [
    { name: "Public map and community reports", status: "shipped" }, { name: "Organisation directory and stories", status: "shipped" },
    { name: "One ID per animal across organisations", status: "upcoming" }, { name: "Open national dataset with method and limits", status: "upcoming" } ] },
  { key: "research", title: "Research", lede: "Data access and studies built on the shared record", href: "/research", items: [
    { name: "Dataset catalogue with provenance", status: "shipped" }, { name: "Controlled data access", status: "shipped" },
    { name: "Population and rabies studies with university partners", status: "upcoming" } ] },
  { key: "edu", title: "Education", lede: "The Academy, school programmes and student practicums", href: "/learn", items: [
    { name: "Academy courses and workshops", status: "shipped" }, { name: "Classroom documents", status: "shipped" },
    { name: "School programme with teacher kits", status: "upcoming" }, { name: "Veterinary and field practicums", status: "upcoming" } ] },
];

export type Session = { title: string; who: string; kind: "Live session" | "Workshop" | "On request"; length: string; body: string; cta: { href: string; label: string } };
/** No dated event is listed until it is scheduled; these run on request. */
export const SESSIONS: Session[] = [
  { title: "Build your first Kaju workflow", who: "Programme leads and coordinators", kind: "Live session", length: "30 minutes, online", body: "Bring one weekly job, such as chasing release photos. We set Kaju to run it on your records, and you leave with it working.", cta: { href: "/demo", label: "Book a session" } },
  { title: "Your first monthly claim on StrayPaw", who: "Coordinators and finance", kind: "Live session", length: "45 minutes, online", body: "From vet-authorised records to a package the municipal office can check, line by line.", cta: { href: "/demo", label: "Book a session" } },
  { title: "Reviewing an ABC claim", who: "Municipal reviewers", kind: "Workshop", length: "60 minutes, online or at your office", body: "What to check on each animal, how exceptions are explained, and how to query a line.", cta: { href: "/contact", label: "Request a workshop" } },
  { title: "Street animals in the classroom", who: "Schools and teachers", kind: "On request", length: "A school period", body: "An Academy session with The Kind Hour Foundation's classroom documents: safety, care and reporting well.", cta: { href: "/learn/workshops", label: "See the workshop" } },
];

export type Team = { key: string; label: string; title: string; lede: string; points: { h: string; p: string }[]; kaju: string[] };
export const TEAMS: Team[] = [
  { key: "coordinators", label: "Coordinators", title: "Run the programme, not the paperwork.", lede: "Assign the day's work, see every gap before month end, and submit a claim you can defend.",
    points: [{ h: "The day, in one queue", p: "New reports, unassigned cases and follow-ups due, ordered by what is urgent." }, { h: "Gaps before they cost you", p: "Missing release photos, unsigned procedures and duplicates, found the same day." }, { h: "A claim that survives review", p: "Every line linked to its animal, every exception explained before the office asks." }],
    kaju: ["Morning brief of what changed overnight", "Release Photo Chaser every evening", "Monthly Claim Builder on the 1st"] },
  { key: "field-staff", label: "Field staff", title: "Record it once, on the street.", lede: "Capture, release and follow-ups on a low-end phone, with or without signal.",
    points: [{ h: "Works offline", p: "Records are encrypted on the phone and sent when the network returns." }, { h: "Photo, place, done", p: "The camera and GPS fill the record; you add what you saw." }, { h: "Ask @kaju", p: "Which dogs are due a second dose, where the next release is, what is missing." }],
    kaju: ["Turns your WhatsApp messages into draft cases", "Reminds you of follow-ups, nearest first"] },
  { key: "veterinarians", label: "Veterinarians", title: "Check and sign. Kaju drafts the rest.", lede: "Your sign-off list for the day, with surgical notes drafted from the OT register.",
    points: [{ h: "One sign-off list", p: "Every procedure waiting for you, with its photos and capture record." }, { h: "Drafted notes", p: "Kaju drafts each note from the OT register and checks the dose against weight." }, { h: "Only you can sign", p: "Kaju never authorises. Your name is on what you approved, and nothing else." }],
    kaju: ["Vet Sign-off Assistant every evening", "Dose and weight checks on every draft"] },
  { key: "municipal-reviewers", label: "Municipal reviewers", title: "Check every claim, animal by animal.", lede: "Open a package, see each animal's evidence, and accept, query or return each line.",
    points: [{ h: "Evidence, not totals", p: "Every number opens to the animals behind it, with photos, places and the vet's name." }, { h: "Exceptions explained", p: "The operator's reasons are attached before you start." }, { h: "Decisions on record", p: "Every acceptance, query and return is recorded with who and when." }],
    kaju: ["Package checks before you open it", "Municipal Review Prep for the monthly meeting"] },
  { key: "leadership", label: "Leadership", title: "Know what your programme achieved.", lede: "Sterilisations, vaccinations and outcomes you can show a funder or a council, with the method attached.",
    points: [{ h: "One verified number", p: "Figures from verified records, with what they can and cannot say." }, { h: "Every ward, one view", p: "Progress, gaps and exceptions by ward and by month." }, { h: "Reports in your format", p: "PDF, Excel and slides, built from the records." }],
    kaju: ["Monthly review slides", "Data Quality Watch every Monday"] },
];

export const dateLabel = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
