/* Synthetic records for the Stage 1 screens. Every name, place and number here is invented.
   Nothing in this file is read from, or written to, a database. */

export type Tone = "plain" | "accent" | "ok" | "warn" | "bad";
export type Trust = "Imported" | "Recorded" | "Reviewed" | "Verified";

export const ORG = { name: "Kind Hour", short: "KH", kind: "NGO workspace", city: "Bengaluru" };
export const ME = { name: "Priya", initials: "PM" };

export type Work = { id: string; title: string; ref: string; kind: string; who: string; place: string; state: string; tone: Tone; when: string; group: "Now" | "Today" | "This week"; animal?: string };
export const WORK: Work[] = [
  { id: "w1", title: "Injured street dog near the flower market", ref: "CASE-0278", kind: "Rescue", who: "Unassigned", place: "Ward 12", state: "Needs assignment", tone: "bad", when: "10 min", group: "Now", animal: "AN-1042" },
  { id: "w2", title: "Three location photos missing from the drive", ref: "CAM-0108", kind: "Evidence", who: "Nisha R.", place: "Ward 08", state: "Waiting on field", tone: "warn", when: "45 min", group: "Now" },
  { id: "w3", title: "Recovery check after sterilisation", ref: "CASE-0241", kind: "Follow-up", who: "Dr. Arun K.", place: "Indiranagar", state: "Due 4:30 pm", tone: "accent", when: "2 h", group: "Today", animal: "AN-0987" },
  { id: "w4", title: "Return visit: two dogs not found at the stop", ref: "VIS-0443", kind: "Vaccination", who: "Field team A", place: "Ward 12", state: "Scheduled", tone: "plain", when: "3 h", group: "Today" },
  { id: "w5", title: "October submission to the municipal office", ref: "SUB-0132", kind: "Submission", who: "You", place: "Zone East", state: "Ready to send", tone: "ok", when: "Yesterday", group: "This week" },
  { id: "w6", title: "Possible duplicate: tan female, notched ear", ref: "AN-1107", kind: "Identity", who: "You", place: "Ward 08", state: "Needs review", tone: "warn", when: "Yesterday", group: "This week", animal: "AN-1107" },
];

export const FIGS = [
  { n: "28", note: "6 new this week", label: "Open cases", href: "/next/ngo/animals" },
  { n: "7", note: "", label: "Due before Monday", href: "/next/ngo/animals" },
  { n: "93%", note: "214 of 230 events", label: "Evidence complete", href: "/next/ngo/animals" },
  { n: "3", note: "", label: "Waiting on partners", href: "/next/ngo/animals" },
];

export const VISITS = [
  { when: "Sun 8:30 am", what: "Ward 12 vaccination visit", who: "4 assigned" },
  { when: "Sun 11:00 am", what: "Transfer to the veterinary centre", who: "2 animals" },
  { when: "Mon 9:00 am", what: "Ward 08 evidence re-capture", who: "Nisha R." },
];

export const PREPARED = [
  { title: "Tomorrow's field briefing", body: "Assignments grouped by ward. Two addresses need confirming before it goes out.", act: "Review draft" },
  { title: "Reply to the municipal office", body: "Evidence packet attached. Nothing is sent until you approve.", act: "Review reply" },
];

export const TEAM = [
  { who: "Nisha R.", what: "added 4 vaccination events", when: "16 min" },
  { who: "Dr. Arun K.", what: "signed a clinical review", when: "31 min" },
  { who: "Field team A", what: "posted in #abc-ward-12", when: "55 min" },
];

export const CHANNELS = [
  { name: "general", unread: 0 }, { name: "field-operations", unread: 0 }, { name: "abc-ward-12", unread: 2 }, { name: "referrals", unread: 0 },
];
export const DMS = [{ name: "Nisha R.", here: true }, { name: "Field team A", here: true }, { name: "Dr. Arun K.", here: false }];

export type Animal = {
  id: string; name: string; species: string; sex: string; age: string; ward: string; abc: string; arv: string;
  identity: "Verified" | "Recorded" | "Needs review"; trust: Trust; last: string; next: string; cases: number; mark: string;
};
export const ANIMALS: Animal[] = [
  { id: "AN-1042", name: "Brown street dog", species: "Dog", sex: "Female", age: "3–5 years", ward: "Ward 12", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "14 Nov", next: "Recovery check, 16 Nov", cases: 2, mark: "Left ear notch, white chest patch" },
  { id: "AN-1107", name: "Tan female, notched ear", species: "Dog", sex: "Female", age: "2–3 years", ward: "Ward 08", abc: "Sterilised", arv: "Due", identity: "Needs review", trust: "Recorded", last: "13 Nov", next: "Identity review", cases: 1, mark: "Right ear notch" },
  { id: "AN-0987", name: "Black and white puppy", species: "Dog", sex: "Male", age: "Under 1 year", ward: "Indiranagar", abc: "Not yet", arv: "Vaccinated", identity: "Recorded", trust: "Reviewed", last: "13 Nov", next: "Sterilisation, 20 Nov", cases: 1, mark: "Black saddle, white socks" },
  { id: "AN-0951", name: "Grey dog, limping", species: "Dog", sex: "Male", age: "5–7 years", ward: "Ward 12", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "11 Nov", next: "—", cases: 3, mark: "Old injury, rear left" },
  { id: "AN-0933", name: "Pale dog near the bus stand", species: "Dog", sex: "Female", age: "1–2 years", ward: "Ward 05", abc: "Not recorded", arv: "Not recorded", identity: "Recorded", trust: "Imported", last: "9 Nov", next: "First encounter", cases: 0, mark: "—" },
  { id: "AN-0902", name: "Ginger cat, residential block", species: "Cat", sex: "Female", age: "2–3 years", ward: "Ward 14", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Reviewed", last: "8 Nov", next: "—", cases: 1, mark: "Tipped left ear" },
  { id: "AN-0877", name: "Brindle male, market lane", species: "Dog", sex: "Male", age: "3–5 years", ward: "Ward 08", abc: "Sterilised", arv: "Due", identity: "Verified", trust: "Verified", last: "6 Nov", next: "Booster, 22 Nov", cases: 2, mark: "Left ear notch" },
  { id: "AN-0850", name: "White dog, temple steps", species: "Dog", sex: "Female", age: "7+ years", ward: "Ward 02", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "2 Nov", next: "—", cases: 1, mark: "Cloudy right eye" },
  { id: "AN-0824", name: "Brown puppy, school gate", species: "Dog", sex: "Male", age: "Under 1 year", ward: "Ward 01", abc: "Not yet", arv: "Due", identity: "Recorded", trust: "Recorded", last: "30 Oct", next: "Vaccination, 18 Nov", cases: 1, mark: "—" },
];

export type Entry = { title: string; when: string; by: string; body: string; tone: Tone; chips: [string, Tone][] };
export const TIMELINE: Entry[] = [
  { title: "Follow-up observation added", when: "Today, 12:44 pm", by: "Field team A", body: "Seen at the assigned location, eating normally. Photo attached.", tone: "accent", chips: [["Recorded", "plain"], ["Needs veterinary review", "warn"]] },
  { title: "Anti-rabies vaccination given", when: "12 Nov", by: "Dr. Arun K., veterinarian", body: "Batch reference and administering clinician recorded.", tone: "ok", chips: [["Clinically signed", "ok"], ["Municipal review pending", "accent"]] },
  { title: "Recovery after sterilisation completed", when: "28 Oct", by: "Veterinary centre", body: "Recovery review and release note linked. Signed certificate attached.", tone: "ok", chips: [["Verified", "ok"]] },
  { title: "First capture documented", when: "24 Oct", by: "Field team A", body: "Identity, location photo and capture evidence linked to this record.", tone: "plain", chips: [["Recorded", "plain"]] },
];
export const RELATED = [
  { ref: "CASE-0278", what: "Injury report", state: "Open" }, { ref: "CAM-0108", what: "Ward 12 drive", state: "Active" }, { ref: "VIS-0443", what: "Return visit", state: "Scheduled" },
];
export const OPEN_WORK = [
  { title: "Municipal evidence review", note: "Assigned · Ward 12" }, { title: "Confirm the vaccination photo", note: "Due tomorrow" },
];
export const FILES = ["Vaccination certificate.pdf", "Field observation.jpg", "Recovery note.pdf"];
export const THREAD = [
  { who: "Nisha R.", when: "2 h", text: "Has the recovery note been shared with the municipal office?" },
  { who: "Kaju", when: "2 h", text: "The signed note is on this record. I can attach it to the October submission; that needs your approval." },
];
