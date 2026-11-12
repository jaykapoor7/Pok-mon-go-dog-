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
  { slug: "monthly-abc-claim", kind: "Field guides", date: "2026-11-09", minutes: 7,
    title: "Preparing a monthly ABC claim the office can check",
    dek: "From a vet-authorised record to a package a municipal reviewer can accept line by line, and what holds a record back.",
    cover: { tone: "blue", label: "Field guide", word: "Claim" },
    body: [
      { p: "A monthly claim is a list of procedures, one line per animal, priced at the rate in the contract that was in force on the procedure date. The office pays for what it can check. A claim that is easy to check is decided quickly; a claim with gaps comes back as a query." },
      { h: "What makes a record claimable", list: ["Five evidence items: capture photo, surgery record, ear-notch photo, release photo and release location", "A veterinarian's authorisation that names the procedure", "A coordinator's evidence review", "Not already claimed in another package"] },
      { h: "Where records get stuck", list: ["Waiting for a vet: the procedure is recorded but not authorised", "Missing evidence: most often the release photo or release place", "Returned: the coordinator or the office sent it back with a note"] },
      { h: "In StrayPaw", p: "Monthly claim shows what is ready at the contract rate and lists every blocked record with its reason. Ask Kaju to draft this month's claim and it returns the same list in plain words, oldest blocker first. Kaju never submits; the coordinator prepares the package and submits it." },
      { h: "After submission", p: "The reviewing office accepts, queries or returns each line. A query arrives on the package with the reviewer's note; answer it on the record and resubmit. Accepted means the office agreed the claim; it does not mean the payment has been made." },
    ] },
  { slug: "recording-a-vaccination", kind: "Field guides", date: "2026-11-08", minutes: 5,
    title: "Recording an anti-rabies vaccination a reviewer can trust",
    dek: "The few fields that make a vaccination record checkable later, and how to record them without signal.",
    cover: { tone: "tint", label: "Field guide", word: "ARV" },
    body: [
      { p: "A vaccination record is only as useful as the questions it can answer a year later: which animal, which vaccine batch, given by whom and when the next dose is due. This guide is about the record, not the clinical procedure, which stays with the veterinary team." },
      { h: "Record these every time", list: ["The animal: its StrayPaw ID, or a new record with photos if it has none", "The date the dose was given", "The vaccine product and batch number from the vial", "Who gave it", "The place, from the phone's location or chosen on the map"] },
      { h: "Leave blank what you do not know", p: "A field left empty reads as not recorded. It is never filled in with a guess and never counted as a no. A dose with an unknown batch is still a dose; the reviewer simply sees that the batch was not recorded." },
      { h: "Without signal", p: "Field mode has an Offline tab. Records are saved on the phone, encrypted behind a six-digit PIN, and sent when the network returns. Each synced record carries an audit receipt, so a reviewer can see when it was captured and when it reached the record." },
    ] },
  { slug: "field-capture-offline", kind: "Field guides", date: "2026-11-07", minutes: 4,
    title: "Field capture when there is no signal",
    dek: "How the offline outbox keeps records safe on a shared phone, and what to check before handing the phone back.",
    cover: { tone: "navy", label: "Field guide", word: "Offline" },
    body: [
      { p: "Most ABC field work happens where the signal drops: lanes, markets, the edge of the ward. Records should not wait for the network, and they should not sit unprotected on a phone that three people share." },
      { h: "How it works", list: ["Open Field mode and choose Offline", "Set or enter a six-digit PIN; the records on this phone are encrypted with it", "Register intakes, vaccinations and survey observations as usual", "When the phone is back online, send the outbox; each record gets a receipt"] },
      { h: "Before you hand the phone back", list: ["Check that nothing is left under On this device · not submitted", "If a record failed, retry it or note why", "Lock the outbox so the next person cannot read your records"] },
      { h: "What never happens", p: "A record saved offline is not counted in any figure until it reaches the record. A failed send is shown as failed, never as sent." },
    ] },
  { slug: "reviewing-an-abc-package", kind: "Field guides", date: "2026-11-06", minutes: 6,
    title: "For municipal reviewers: checking an ABC package",
    dek: "What to look at on each animal, how exceptions are flagged, and why nothing is accepted in bulk.",
    cover: { tone: "split", label: "Field guide", word: "Review" },
    body: [
      { p: "A package is an operator's claim for a period. Each line is one procedure on one animal. The office decides each line: accept, query or return." },
      { h: "On each line, check", list: ["The five evidence items and that the release place matches the capture ward", "The veterinarian who authorised the procedure", "The coordinator who reviewed the evidence", "The rate against the contract version in force on the procedure date", "That the same animal and procedure are not claimed twice"] },
      { h: "What Kaju prepares", p: "Before you open the package, Kaju compares every line with its source and lists the exceptions, each with a draft note. Lines with any exception are never offered for batch acceptance. The notes are drafts: edit them, then record your own decision." },
      { h: "Your morning brief", p: "Ask Kaju what is waiting and it lists packages oldest first with their exceptions, so the longest-waiting operator is seen first." },
    ] },
  { slug: "unknown-is-not-zero", kind: "Research notes", date: "2026-11-05", minutes: 5,
    title: "Unknown is not zero",
    dek: "Why StrayPaw shows a missing value as unknown, and how that changes the numbers a programme reports.",
    cover: { tone: "navy", label: "Research note", word: "Unknown" },
    body: [
      { p: "Most registers have gaps. A sterilisation column left blank might mean the animal is not sterilised, or that nobody checked. Treating every blank as no makes coverage look worse than it is; treating it as yes makes it look better. Both are guesses." },
      { h: "How StrayPaw handles it", list: ["A blank stays not recorded and is counted separately", "Shares are given against animals with a recorded status, with the unknown count beside them", "A failed read is reported as unknown, never as zero", "Imported history stays labelled as imported until a person checks it"] },
      { h: "What this means for a report", p: "A ward with 40 recorded animals, 22 recorded as sterilised and 11 not recorded reads as 22 of 29 with a known status, and 11 unknown, not as 55 per cent." },
    ] },
  { slug: "recorded-animals-not-population", kind: "Research notes", date: "2026-11-09", minutes: 6,
    title: "Recorded animals are not a population",
    dek: "How ward coverage and sudden changes are worked out in StrayPaw, and what they cannot tell you.",
    cover: { tone: "split", label: "Research note", word: "Wards" },
    body: [
      { p: "Ward watch, on the Kaju home for NGO leads and municipal offices, shows each ward's recorded animals and how many have a sterilisation or vaccination recorded. The denominator is the animals on the record, not the dogs that live in the ward." },
      { h: "How a sudden change is flagged", list: ["New records per ward are counted in seven-day windows over eight weeks", "The last two weeks are compared with the median of the six weeks before", "A drop is flagged only if the earlier weeks averaged at least two records a week and the recent level fell to 40 per cent or less", "A spike needs at least two and a half times the earlier level and three more records a week"] },
      { h: "What it cannot say", p: "A drop in new records can mean fewer animals, a team on leave or a phone that has not synced. A spike can mean a survey walk. The flag tells you where to ask, not what happened." },
    ] },
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
  { date: "2026-11-12", area: "Programmes", title: "Referral of one person between facilities", body: "For hospitals and health centres in a One Health programme: refer a person for vaccine, immunoglobulin or wound washing, see whether they arrived, never sharing who they are." },
  { date: "2026-11-12", area: "Field", title: "Dogs due for revaccination", body: "When your programme sets an interval, Animals lists the dogs overdue or due within 14 days, from the last vaccination recorded on each." },
  { date: "2026-11-12", area: "Kaju", title: "Case questions and a case summary", body: "Ask how many open cases by locality, narrow it with a follow-up, or have Kaju summarise the case you are on, from your own records." },
  { date: "2026-11-12", area: "Platform", title: "Invitations by link", body: "Programme setup gives a link as well as a code; it opens StrayPaw with the code filled in." },
  { date: "2026-11-12", area: "Government", title: "Review submissions, simpler", body: "One sentence says what waits and whether any of it is late; the lists are the lanes, with what Kaju found on each package." },
  { date: "2026-11-12", area: "Programmes", title: "Notifications and the Where to act map", body: "For people in a One Health programme: one bell for what needs them across their places, and a map of bites, confirmed cases and vaccination by area, with reasons." },
  { date: "2026-11-12", area: "Kaju", title: "Every role's Today as a daily brief", body: "What needs you first, then your working lists; Quick actions open on what you do most." },
  { date: "2026-11-11", area: "Field", title: "Field mode as a round", body: "Today's stops, one capture control and a connection chip that says whether records are waiting to send." },
  { date: "2026-11-11", area: "Workflow", title: "One Pipeline", body: "The same five stages on Today, the board and every record; the Queue, Decisions, Sign-off, Animals and Reports follow one page pattern." },
  { date: "2026-11-11", area: "Platform", title: "A first-day introduction", body: "New members get a short tour that points at the real controls of their own workspace." },
  { date: "2026-11-09", area: "Kaju", title: "Weekly digest and follow-up nudges", body: "What changed in seven days and who acts next; overdue follow-ups grouped by case holder, with reschedules prepared to confirm." },
  { date: "2026-11-09", area: "Kaju", title: "Claim draft", body: "This month's claimable amount from the billing preview, and every blocked record with its reason." },
  { date: "2026-11-09", area: "Government", title: "Office brief, ward watch and monthly note", body: "A Kaju home for reviewing offices: waiting packages pre-checked for exceptions, ward coverage and sudden changes, and a draft programme note." },
  { date: "2026-11-09", area: "Platform", title: "Branded reports", body: "Every PDF, Excel and CSV download carries the StrayPaw template: title, organisation, period, method notes and page numbers." },
  { date: "2026-11-09", area: "Platform", title: "Connections at a glance", body: "Every integration on one screen with its status, what Kaju may do with it and the organisation's settings." },
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
    { name: "Kaju agents", status: "shipped" }, { name: "Weekly digest, follow-up nudges and claim draft", status: "shipped" }, { name: "Kaju file upload and register import", status: "shipped" }, { name: "Undo for sign-offs", status: "shipped" }, { name: "Branded PDF, Excel and CSV reports", status: "shipped" },
    { name: "Direct WhatsApp connection", status: "upcoming", note: "waiting for Meta approval" }, { name: "Kaju in Hindi, Tamil and Marathi", status: "upcoming" }, { name: "Public API for partner systems", status: "upcoming" } ] },
  { key: "ops", title: "ABC operations", lede: "Receive, register, treat, release and submit", href: "/abc-operations", items: [
    { name: "Five-step workflow", status: "shipped" }, { name: "Encrypted offline intake", status: "shipped" }, { name: "Monthly claim at contract rates", status: "shipped" },
    { name: "Microchip and QR tag scanning", status: "upcoming" }, { name: "Shelter kennel board", status: "upcoming" } ] },
  { key: "gov", title: "Government", lede: "Review, reconciliation and oversight for municipal offices", href: "/for-governments", items: [
    { name: "Government command centre", status: "shipped" }, { name: "Individual claim review", status: "shipped" }, { name: "Kaju office brief and ward watch", status: "shipped" },
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

export type Team = { key: string; label: string; title: string; lede: string; points: { h: string; p: string }[]; kaju: string[]; day: { t: string; h: string; p: string }[]; where: { label: string; what: string }[]; faq: [string, string][] };
export const TEAMS: Team[] = [
  { key: "coordinators", label: "Coordinators", title: "Run the programme, not the paperwork.", lede: "Assign the day's work, see every gap before month end, and submit a claim you can defend.",
    points: [{ h: "The day, in one queue", p: "New reports, unassigned cases and follow-ups due, ordered by what is urgent." }, { h: "Gaps before they cost you", p: "Missing release photos, unsigned procedures and duplicates, found the same day." }, { h: "A claim that survives review", p: "Every line linked to its animal, every exception explained before the office asks." }],
    day: [
      { t: "Morning", h: "Read the brief", p: "Home shows what changed overnight and the one thing to do first: a record to review, a critical case with nobody on it, a follow-up that slipped." },
      { t: "Through the day", h: "Assign and unblock", p: "The work queue orders cases by urgency. Assign a case, add a note or ask Kaju to turn a WhatsApp message into a draft case you confirm." },
      { t: "Evening", h: "Review the evidence", p: "Records the vet has signed arrive for your review with the capture photo, ear-notch photo and release place side by side. Anything missing is named on the record." },
      { t: "Month end", h: "Submit the package", p: "Kaju drafts the claim from records that are signed, reviewed and complete, at the contract rate in force on each date, and lists every blocked record with its reason. You check and submit." },
    ],
    where: [{ label: "Today", what: "The daily brief and the next action" }, { label: "Work queue", what: "Live cases by priority, with the map" }, { label: "Release evidence", what: "What each record still needs" }, { label: "Report packages", what: "The monthly claim and the office's decisions" }, { label: "Team", what: "Who has access, in which role" }],
    faq: [["Can I see what each person did?", "Yes. Every change records who made it and when, and nothing is deleted without a trace."], ["What if our register is in Excel?", "Import it as it is. Imported rows stay labelled as historical until someone confirms them, so old data never passes as verified work."], ["Does Kaju submit anything on its own?", "No. Kaju prepares the claim and the follow-ups; you confirm each one."]],
    kaju: ["Morning brief of what changed overnight", "Release Photo Chaser every evening", "Monthly Claim Builder on the 1st"] },
  { key: "field-staff", label: "Field staff", title: "Record it once, on the street.", lede: "Capture, release and follow-ups on a low-end phone, with or without signal.",
    points: [{ h: "Works offline", p: "Records are encrypted on the phone and sent when the network returns." }, { h: "Photo, place, done", p: "The camera and GPS fill the record; you add what you saw." }, { h: "Ask @kaju", p: "Which dogs are due a second dose, where the next release is, what is missing." }],
    day: [
      { t: "Before you leave", h: "Open field mode", p: "Your cases and today's follow-ups load onto the phone. From here it works with or without signal." },
      { t: "At capture", h: "Photo, place, save", p: "Take the photo, confirm the place the phone suggests and add what you saw. The animal gets its StrayPaw tag there and then." },
      { t: "At release", h: "Prove where it went back", p: "A release photo and the release place, checked against the capture point, complete the record." },
      { t: "Back in range", h: "It syncs itself", p: "Records saved offline were kept encrypted on the phone and are sent when the network returns. Nothing is typed twice." },
    ],
    where: [{ label: "Field mode", what: "Register an intake, online or offline" }, { label: "Today", what: "Your next action and your follow-ups" }, { label: "New case", what: "Open a case for an animal that needs help" }, { label: "Receive", what: "Reports sent in by the public" }],
    faq: [["Does it work on an old phone?", "Yes. It runs in the phone's browser and can be added to the home screen; there is nothing to install from a store."], ["What happens with no signal?", "Field mode keeps working. Records are stored encrypted on the phone and sent when you are back online."], ["Do I have to type a lot?", "No. The camera and GPS fill most of the record; you choose from short lists and add a note only if needed."]],
    kaju: ["Turns your WhatsApp messages into draft cases", "Reminds you of follow-ups, nearest first"] },
  { key: "veterinarians", label: "Veterinarians", title: "Check and sign. Kaju drafts the rest.", lede: "Your sign-off list for the day, with surgical notes drafted from the OT register.",
    points: [{ h: "One sign-off list", p: "Every procedure waiting for you, with its photos and capture record." }, { h: "Drafted notes", p: "Kaju drafts each note from the OT register and checks the dose against weight." }, { h: "Only you can sign", p: "Kaju never authorises. Your name is on what you approved, and nothing else." }],
    day: [
      { t: "Start", h: "Open your sign-off list", p: "Every procedure waiting for you, oldest first, with the capture record and photos beside it." },
      { t: "Each record", h: "Check the details", p: "Weight, procedure, anaesthesia and after-care are laid out as you would write them. Kaju drafts the note from the OT register and flags a dose that does not fit the weight." },
      { t: "Decide", h: "Authorise or return", p: "Authorise in your own name, or return the record with a reason. Returned records go back to the team with your note." },
      { t: "After", h: "Follow-ups keep time", p: "Post-operative checks and second doses are scheduled from what you recorded, and the field team is reminded." },
    ],
    where: [{ label: "Sign off", what: "Procedures waiting for you" }, { label: "Care records", what: "Treatment and vaccination history" }, { label: "Animals", what: "Each animal's full record" }],
    faq: [["Can anyone else sign for me?", "No. Only a veterinarian's own account can authorise a procedure, and the record carries your name and the time."], ["Does Kaju make clinical decisions?", "Never. Kaju drafts notes and checks arithmetic. Every clinical decision is yours."], ["Can I correct something I signed?", "A signed record is not edited silently. It is returned, corrected and authorised again, and the history shows each step."]],
    kaju: ["Vet Sign-off Assistant every evening", "Dose and weight checks on every draft"] },
  { key: "municipal-reviewers", label: "Municipal reviewers", title: "Check every claim, animal by animal.", lede: "Open a package, see each animal's evidence, and accept, query or return each line.",
    points: [{ h: "Evidence, not totals", p: "Every number opens to the animals behind it, with photos, places and the vet's name." }, { h: "Exceptions explained", p: "The operator's reasons are attached before you start." }, { h: "Decisions on record", p: "Every acceptance, query and return is recorded with who and when." }],
    day: [
      { t: "When a package arrives", h: "Start from the pre-check", p: "Kaju has already compared every claim with its evidence, sign-offs, contract rate and arithmetic, and lists the exceptions it found." },
      { t: "Reviewing", h: "Open any line to its animal", p: "Each claimed procedure opens to the animal behind it: capture photo, ear notch, release place and the veterinarian who authorised it." },
      { t: "Deciding", h: "Accept, query or return", p: "Decide line by line or for the package. A query goes back to the operator with your note; their answer is attached to the same record." },
      { t: "Reporting", h: "Wards and the monthly note", p: "Recorded animals and procedures by ward, with sudden drops or spikes flagged, and a draft programme note built from decided packages." },
    ],
    where: [{ label: "Review submissions", what: "Packages waiting for your decision" }, { label: "Contracts & rates", what: "The rate in force on each date" }, { label: "Wards & map", what: "Recorded activity by ward" }, { label: "Reports", what: "The monthly programme note" }],
    faq: [["Can we see an operator's other records?", "No. A reviewing office sees only the packages submitted to it and the evidence inside them."], ["Is an accepted claim a paid claim?", "No. Acceptance is the office's decision on the evidence. Payment happens in your own finance system."], ["Are the ward figures population estimates?", "No. They are recorded counts from operators' registers. A ward with thin records is shown as a gap, not as zero."]],
    kaju: ["Package checks before you open it", "Municipal Review Prep for the monthly meeting"] },
  { key: "leadership", label: "Leadership", title: "Know what your programme achieved.", lede: "Sterilisations, vaccinations and outcomes you can show a funder or a council, with the method attached.",
    points: [{ h: "One verified number", p: "Figures from verified records, with what they can and cannot say." }, { h: "Every ward, one view", p: "Progress, gaps and exceptions by ward and by month." }, { h: "Reports in your format", p: "PDF, Excel and slides, built from the records." }],
    day: [
      { t: "Any time", h: "Ask in plain words", p: "How many animals are sterilised, what changed this week, what is blocking the claim. Kaju answers from your own register and shows the records it used." },
      { t: "Weekly", h: "Read the digest", p: "Cases opened and closed, care recorded, sign-offs, claims submitted and decided, and who needs to act." },
      { t: "Monthly", h: "Take it to the meeting", p: "A programme summary as PowerPoint, PDF or Excel, built from the same figures the team works from, with what they can and cannot say." },
      { t: "Always", h: "Know the limits of the number", p: "Recorded counts are never presented as street-population estimates, and unknown is never counted as no." },
    ],
    where: [{ label: "Today", what: "The brief and what needs a decision" }, { label: "Ask Kaju", what: "Figures, digests and documents on request" }, { label: "Reports", what: "Proof packs and exports" }, { label: "Programmes", what: "Each programme's records and progress" }],
    faq: [["Can I trust the figures in front of a funder?", "Each figure comes from records you can open, and the report says how it was counted. Imported historical data is labelled as such."], ["Who owns the data?", "Your organisation. It exports to Excel, CSV and PDF at any time, and is never shared with another organisation."], ["Does this replace our team's judgement?", "No. Kaju does the checking and drafting; named people approve every clinical, evidence and financial decision."]],
    kaju: ["Monthly review slides", "Data Quality Watch every Monday"] },
];

export const dateLabel = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
