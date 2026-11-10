/* ════════════════════════════════════════════════════════════════════
   Onboarding at /app: steps, roles, Kaju's crew and saved progress.

   Everything here is front-end state. Sign-in, sign-up, membership and
   Kaju's answers are the product's existing calls (signInWithCode,
   /api/access/request, is_ngo_member / my_ngo / ngo_members.role,
   /api/ai); the flow decides only what to show next. Progress is kept for
   this browser tab (sessionStorage); the access code is never stored.
   ════════════════════════════════════════════════════════════════════ */

import type { Role } from "@/lib/roles";

export type Path = "org" | "office" | "feeder" | "community" | "educator";
export type Step = "intro" | "name" | "role" | "week" | "crew" | "task" | "device" | "keep" | "done";
const STEPS: Step[] = ["intro", "name", "role", "week", "crew", "task", "device", "keep", "done"];

export type Outcome =
  | { kind: "member"; role: string | null; org: string | null; reviewer: boolean }
  | { kind: "reviewer" }
  | { kind: "personal" }
  | { kind: "guest" };

export type Flow = {
  path: Path | null; step: Step; trail: Step[];
  name: string; email: string; picks: string[];
  outcome: Outcome | null; located: "on" | "off" | null;
};
export const START: Flow = { path: null, step: "intro", trail: [], name: "", email: "", picks: [], outcome: null, located: null };

const KEY = "sp.onboard.v2", HOLD = "sp.onboard.hold";
export function readFlow(): Flow | null {
  try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Flow | null; return v && STEPS.includes(v.step) && Array.isArray(v.trail) ? { ...START, ...v, trail: v.trail.filter((t) => STEPS.includes(t)) } : null; } catch { return null; }
}
export function saveFlow(f: Flow) { try { sessionStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage blocked */ } }
export function clearFlow() { try { sessionStorage.removeItem(KEY); sessionStorage.removeItem(HOLD); } catch { /* fine */ } }
/* While the flow signs someone in, and until they leave its last screen, /app must not redirect past it. */
export function holdWelcome(on: boolean) { try { if (on) sessionStorage.setItem(HOLD, "1"); else sessionStorage.removeItem(HOLD); } catch { /* fine */ } }
export function flowHoldsWelcome() { try { return sessionStorage.getItem(HOLD) === "1"; } catch { return false; } }

/** Organisation and municipal people sign in; everyone else can use StrayPaw without an account. */
export const needsCode = (p: Path | null) => p === "org" || p === "office";

/** The role wheel. Each entry is an existing StrayPaw space; `role` is what storeRole already keeps. */
export const ROLES: { id: Path; label: string; role: Role }[] = [
  { id: "org", label: "Rescue or ABC team", role: "ngo" },
  { id: "office", label: "Municipal office", role: "ngo" },
  { id: "feeder", label: "Feeding animals", role: "feeder" },
  { id: "community", label: "Reporting animals", role: "individual" },
  { id: "educator", label: "Teaching", role: "educator" },
];

/* The crew: folk-art dogs from an eighteenth-century Rajasthan painting and a
   Company-school portrait. For organisations each stands for a real Kaju
   automation on the Kaju home; for everyone else, a real public tool. None
   of them acts on its own: Kaju prepares, a person confirms. */
export type Dog = "rani" | "sikari" | "moti" | "laddoo" | "bijli" | "chhotu" | "gudiya";
export const DOG_ART: Record<Dog, { src: string; w: number; h: number; name: string }> = {
  rani: { src: "/art/folk/dog-rajasthan-sitting.webp", w: 357, h: 420, name: "Rani" },
  sikari: { src: "/art/folk/dog-sikari.webp", w: 420, h: 351, name: "Sikari" },
  moti: { src: "/art/folk/pups/pup-3.webp", w: 360, h: 215, name: "Moti" },
  laddoo: { src: "/art/folk/pups/pup-4.webp", w: 360, h: 191, name: "Laddoo" },
  bijli: { src: "/art/folk/pups/pup-1.webp", w: 360, h: 184, name: "Bijli" },
  chhotu: { src: "/art/folk/pups/pup-5.webp", w: 360, h: 200, name: "Chhotu" },
  gudiya: { src: "/art/folk/pups/pup-2.webp", w: 360, h: 191, name: "Gudiya" },
};
export type Job = { id: string; label: string; dog: Dog; tag: string; tint: string; card: string; best: string; where: string; status: string; href: string; action: string };

const ORG: Job[] = [
  { id: "intake", label: "Registering animals in the field", dog: "moti", tag: "Field", tint: "#e6edfb", card: "Keeps field mode ready. Intakes save online, or encrypted on the phone without signal.", best: "Intakes", where: "Field mode", status: "Works offline", href: "/ngo/field", action: "Register an intake" },
  { id: "signoff", label: "Vet sign-off", dog: "chhotu", tag: "Vet", tint: "#e7f3ec", card: "Lines up every procedure waiting for a vet, oldest first. Only a vet signs.", best: "Sign-off queue", where: "Treatment", status: "A vet decides", href: "/ngo/verification?stage=vet", action: "Open the sign-off queue" },
  { id: "evidence", label: "Release photos and evidence", dog: "bijli", tag: "Evidence", tint: "#fde9e2", card: "Lists records missing a capture photo, ear-notch photo or release place.", best: "Missing evidence", where: "Release evidence", status: "Chases, never fills in", href: "/ngo/verification?stage=evidence", action: "See what is missing" },
  { id: "followups", label: "Follow-ups", dog: "sikari", tag: "Follow-ups", tint: "#f1ece0", card: "Finds follow-ups that slipped and prepares reschedules for you to confirm.", best: "Overdue reviews", where: "Kaju home", status: "You confirm", href: "/assistant", action: "Prepare overdue follow-ups" },
  { id: "claims", label: "Monthly claims", dog: "laddoo", tag: "Claims", tint: "#fbefd6", card: "Drafts the month's claim at contract rates and names every blocked record.", best: "Claim drafts", where: "Monthly claim", status: "You submit", href: "/ngo/packages", action: "Draft this month's claim" },
  { id: "reports", label: "Reports for funders and the council", dog: "rani", tag: "Reports", tint: "#ece7f7", card: "Writes the weekly digest and branded reports, from your own records only.", best: "Digest and reports", where: "Reports & proof", status: "From your records", href: "/ngo/proof", action: "Open reports" },
];
const OFFICE: Job[] = [
  { id: "review", label: "Reviewing claim packages", dog: "rani", tag: "Review", tint: "#e6edfb", card: "Pre-checks every waiting package, claim by claim, and drafts notes. You decide.", best: "Pre-checks", where: "Review submissions", status: "You decide", href: "/city/review", action: "Review submissions" },
  { id: "wards", label: "Ward coverage", dog: "sikari", tag: "Wards", tint: "#e7f3ec", card: "Reads recorded animals by ward and flags sudden drops or spikes in new records.", best: "Ward watch", where: "Wards & map", status: "Recorded, not estimated", href: "/city", action: "Open wards and map" },
  { id: "note", label: "Monthly reporting", dog: "laddoo", tag: "Report", tint: "#fbefd6", card: "Drafts the monthly programme note from decided packages and ward figures.", best: "Monthly note", where: "Kaju home", status: "A draft to edit", href: "/assistant", action: "Draft the monthly note" },
];
const PUBLIC: Record<"feeder" | "community" | "educator", Job[]> = {
  feeder: [
    { id: "route", label: "My feeding route", dog: "laddoo", tag: "Route", tint: "#fbefd6", card: "Keeps your feeding spots and the animals you see at each one.", best: "Feeding spots", where: "Feeding", status: "Yours", href: "/community/feeding", action: "Open your feeding route" },
    { id: "report", label: "Reporting injuries or new dogs", dog: "sikari", tag: "Report", tint: "#fde9e2", card: "Sends a photo, the place and what you saw to organisations working nearby.", best: "Reports", where: "Report", status: "No account needed", href: "/community/report", action: "Report an animal" },
    { id: "help", label: "Finding help nearby", dog: "rani", tag: "Help", tint: "#e6edfb", card: "Shows the organisations working in your area and how to reach them.", best: "Organisations", where: "Community", status: "Public", href: "/community/organisations", action: "Find organisations" },
  ],
  community: [
    { id: "report", label: "Reporting an animal I saw", dog: "sikari", tag: "Report", tint: "#fde9e2", card: "Sends a photo, the place and what you saw to organisations working nearby.", best: "Reports", where: "Report", status: "No account needed", href: "/community/report", action: "Report an animal" },
    { id: "follow", label: "Following animals near me", dog: "bijli", tag: "Map", tint: "#e6edfb", card: "Shows recorded animals on the public map, by area, never exact points.", best: "The map", where: "Community", status: "Public", href: "/community", action: "See animals near you" },
    { id: "help", label: "Finding an organisation", dog: "rani", tag: "Help", tint: "#e7f3ec", card: "Lists the organisations working in your city.", best: "Organisations", where: "Community", status: "Public", href: "/community/organisations", action: "Find organisations" },
  ],
  educator: [
    { id: "lessons", label: "Lessons for a class", dog: "chhotu", tag: "Lessons", tint: "#ece7f7", card: "Opens Academy courses and partner classroom material.", best: "Academy", where: "Learn", status: "Free", href: "/learn", action: "Open the Academy" },
    { id: "workshops", label: "Running a workshop", dog: "gudiya", tag: "Workshops", tint: "#fbefd6", card: "Workshop plans you can run with a group.", best: "Workshops", where: "Learn", status: "Free", href: "/learn/workshops", action: "See workshops" },
    { id: "records", label: "Showing real local records", dog: "sikari", tag: "Records", tint: "#e6edfb", card: "Opens the public map for the place you teach in.", best: "Local records", where: "Community", status: "Public", href: "/community", action: "Open the map" },
  ],
};
export function jobsFor(p: Path | null): Job[] {
  if (p === "org") return ORG;
  if (p === "office") return OFFICE;
  if (p === "feeder" || p === "community" || p === "educator") return PUBLIC[p];
  return [];
}
/** Vets and field members get their own first job ahead of the rest. */
export function orderFor(p: Path | null, o: Outcome | null, picks: string[]): Job[] {
  const all = jobsFor(p);
  const lead = o?.kind === "member" ? (o.role === "veterinarian" ? "signoff" : o.role === "member" ? "intake" : null) : null;
  const chosen = all.filter((j) => picks.includes(j.id));
  const list = chosen.length ? chosen : all;
  return lead ? [...list.filter((j) => j.id === lead), ...all.filter((j) => j.id === lead && !list.includes(j)), ...list.filter((j) => j.id !== lead)] : list;
}

/** Kaju's first task: a real, read-only question answered from the person's own records. */
export function firstTask(o: Outcome | null): string | null {
  if (o?.kind === "member") return "What changed this week?";
  if (o?.kind === "reviewer") return "What is waiting for me today?";
  return null;
}

/** The name to greet someone by: the first word that is not a title ("Dr. Anitha Rao" → "Anitha"). */
export function firstName(n: string | null | undefined) {
  const words = (n ?? "").trim().split(/\s+/).filter(Boolean);
  const w = words.find((x) => !/^(dr|mr|mrs|ms|miss|prof|shri|smt|sri)\.?$/i.test(x)) ?? words[0] ?? "";
  return w.replace(/[.,]+$/, "");
}
export function maskEmail(e: string) {
  const [u, d] = e.split("@");
  return u && d ? `${u.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(5, u.length - 1)))}@${d}` : e;
}
export const ROLE_LABEL: Record<string, string> = { admin: "an administrator", coordinator: "a coordinator", veterinarian: "a veterinarian", member: "a field team member" };
