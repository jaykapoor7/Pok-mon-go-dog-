/* The report Kaju fills during bite help, and the rails that decide what comes next. Shared by the page (its fixed
   rules, and the model's answers merged on the device) and the server (src/lib/kaju/biteModel.ts). Pure: no network,
   no storage. */

export const BITE_NEXT = ["tell", "danger", "notify", "where", "when", "animal", "looks", "call", "phone", "review", "send", "centres", "restart", "none"] as const;
export type BiteNext = (typeof BITE_NEXT)[number];
export type BiteFacts = {
  kind: "bite" | "scratch" | "lick_broken_skin" | "other" | null;
  species: "dog" | "cat" | "monkey" | "cattle" | "wildlife" | "other" | null;
  ownership: "community" | "owned" | "unknown" | null;
  person: "self" | "child" | "someone" | null;
  /** An area name from the programme's list. */
  area: string | null;
  /** A landmark or street, in the person's words. */
  place: string | null;
  /** The person shared their location or dropped a pin (the coordinates stay in the browser). */
  pinned: boolean;
  on: string | null;
  when: string | null;
  looks: string | null;
  danger: "yes" | "no" | null;
  notify: "yes" | "no" | null;
  callback: "yes" | "no" | null;
  phone: string | null;
  /** What the person cannot or would rather not say: never asked again. */
  skipped: ("where" | "when" | "animal" | "looks" | "call")[];
};
export const NO_FACTS: BiteFacts = { kind: null, species: null, ownership: null, person: null, area: null, place: null, pinned: false, on: null, when: null, looks: null, danger: null, notify: null, callback: null, phone: null, skipped: [] };



export const KINDS = ["bite", "scratch", "lick_broken_skin", "other"] as const;
export const SPECIES = ["dog", "cat", "monkey", "cattle", "wildlife", "other"] as const;
export const OWN = ["community", "owned", "unknown"] as const;
export const WHO = ["self", "child", "someone"] as const;
export const YN = ["yes", "no"] as const;
export const SKIP = ["where", "when", "animal", "looks", "call"] as const;
const pickOf = <T extends string>(list: readonly T[], v: unknown): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) || null : null);
const minus = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);

/** The fixed questions, used whenever the model's own question is not the one the rails allow. */
export const ASK: Record<"where" | "when" | "animal" | "looks" | "call" | "phone", string> = {
  where: "Where did it happen? A landmark or street is enough, or share your location.",
  when: "When did it happen?",
  animal: "What animal was it?",
  looks: "So the area's animal team can find the dog: what did it look like? Colour, size, a collar?",
  call: "Last one: can the clinic call you if they need to?",
  phone: "What number should they call?",
};

/** Clean what the model (or the browser) says about the report: only known values survive. */
export function cleanFacts(raw: unknown, areas: string[], today: string, base: BiteFacts = NO_FACTS): BiteFacts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: BiteFacts = { ...base, skipped: [...base.skipped] };
  const set = <K extends keyof BiteFacts>(k: K, v: BiteFacts[K] | null) => { if (v !== null && v !== undefined) out[k] = v; };
  set("kind", pickOf(KINDS, r.kind));
  set("species", pickOf(SPECIES, r.species));
  set("ownership", pickOf(OWN, r.ownership));
  set("person", pickOf(WHO, r.person));
  if (typeof r.area === "string") { const a = areas.find((x) => x.toLowerCase() === r.area!.toString().trim().toLowerCase()); if (a) out.area = a; }
  set("place", clip(r.place, 160));
  if (r.pinned === true) out.pinned = true;
  if (typeof r.on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.on) && r.on <= today && r.on >= minus(today, 30)) out.on = r.on;
  set("when", clip(r.when, 60));
  set("looks", clip(r.looks, 240));
  set("danger", pickOf(YN, r.danger));
  set("notify", pickOf(YN, r.notify));
  set("callback", pickOf(YN, r.callback));
  if (typeof r.phone === "string") { const d = r.phone.replace(/[^0-9]/g, ""); if (d.length >= 8 && d.length <= 13) { out.phone = d; out.callback = "yes"; } }
  if (Array.isArray(r.skipped)) for (const s of r.skipped) { const k = pickOf(SKIP, s); if (k && !out.skipped.includes(k)) out.skipped.push(k); }
  return out;
}

const told = (f: BiteFacts) => !!(f.kind || f.species || f.area || f.place || f.pinned || f.on);
const has = (f: BiteFacts, k: "where" | "when" | "animal" | "looks" | "call") =>
  /* Bite help is for dog bites: the animal is never asked. */
  k === "animal" || f.skipped.includes(k) || (k === "where" ? !!(f.area || f.place || f.pinned) : k === "when" ? !!f.on : k === "looks" ? !!f.looks : f.callback !== null);
/** What must come next, whatever the model says: the rails. */
export function mustAsk(f: BiteFacts): BiteNext {
  if (!told(f)) return "tell";
  if (f.danger === null) return "danger";
  /* Telling the clinic is one decision, made on the report itself ("Send it?"), never asked twice. */
  if (f.notify === "no") return "centres";
  for (const k of ["where", "when", "looks", "call"] as const) if (!has(f, k)) return k;
  if (f.callback === "yes" && !f.phone) return "phone";
  return "review";
}
/** The model's choice of next step, held to the rails. `fixed` means the model's question was replaced. */
export function railNext(model: BiteNext, f: BiteFacts, showing: string): { next: BiteNext; fixed: boolean } {
  const must = mustAsk(f);
  if (model === "restart") return { next: "restart", fixed: false };
  if (must === "tell") return { next: model === "none" ? "none" : "tell", fixed: false };
  if (must === "danger" || must === "centres") return { next: must, fixed: model !== must && model !== "none" };
  if (model === "notify") return { next: must, fixed: true };
  if (model === "none") return { next: "none", fixed: false };
  if (model === "send") return showing === "review" && must === "review" ? { next: "send", fixed: false } : { next: must, fixed: must !== "review" };
  if (model === "review") return { next: must, fixed: must !== "review" };
  if (model === "where" || model === "when" || model === "animal" || model === "looks" || model === "call") return has(f, model) ? { next: must, fixed: true } : { next: model, fixed: false };
  if (model === "phone") return f.phone ? { next: must, fixed: true } : { next: "phone", fixed: false };
  return { next: must, fixed: true };
}

