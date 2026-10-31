/* ════════════════════════════════════════════════════════════════════
   Field-message extraction: free text (a forwarded WhatsApp update, a
   register line, a note) → a structured draft. Deterministic, so it works
   without a language model and is testable; the model engine calls the
   same function as a tool. It never invents a value: anything not found
   is returned in `missing`, and the person is asked for it.
   ════════════════════════════════════════════════════════════════════ */

export type Extracted = {
  category: "injury" | "sterilisation" | "rescue" | "vaccination" | "other";
  severity: "low" | "normal" | "high" | "critical";
  sex: "female" | "male" | null;
  age: "puppy" | "adult" | null;
  earNotch: boolean;
  place: string | null;
  city: string | null;
  date: string | null;
  hasPhoto: boolean;
  hasLocation: boolean;
  tag: string | null;
  summary: string;
  missing: string[];
};

const CITIES = ["Coimbatore", "Chennai", "Lucknow", "Delhi", "New Delhi", "Mumbai", "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Kolkata", "Jamshedpur", "Ranchi", "Guwahati", "Mohali", "Panchgani", "Gurugram", "Noida", "Jaipur", "Ahmedabad", "Kochi", "Mysuru"];
const CRITICAL = /\b(hit by|accident|bleeding|maggot|fracture|unconscious|seizure|rabi(d|es)|can'?t walk|cannot walk|paraly)/i;
const INJURY = /\b(injur|wound|limp|bleed|maggot|fracture|sore|mange|skin|tumou?r|distemper|sick|vomit|weak)/i;

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export function extractFieldMessage(raw: string, today = new Date()): Extracted {
  const text = raw.replace(/\s+/g, " ").trim();
  const t = text.toLowerCase();
  const category: Extracted["category"] =
    /\b(abc\b|steril|spay|neuter|castrat|ear ?-?notch|surgery)/.test(t) ? "sterilisation"
      : /\b(arv\b|vaccin|rabies shot|anti-?rabies|booster)/.test(t) ? "vaccination"
        : INJURY.test(t) ? "injury"
          : /\b(rescu|stuck|trapped|drain|pit\b|abandon|pupp|pups\b)/.test(t) ? "rescue" : "other";
  const severity: Extracted["severity"] = CRITICAL.test(t) ? "critical" : INJURY.test(t) ? "high" : "normal";
  const sex = /\b(female|bitch|she|her)\b/.test(t) ? "female" : /\b(male|he|him|his)\b/.test(t) ? "male" : null;
  const age = /\b(pup|puppy|puppies|pups)\b/.test(t) ? "puppy" : /\b(adult|grown)\b/.test(t) ? "adult" : null;
  const earNotch = /ear ?-?notch/.test(t);
  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(text)) ?? null;
  const placeM = text.match(/\b(?:near|at|in|outside|behind|opposite|opp\.?)\s+([A-Z0-9][\w.'-]*(?:\s+[A-Z0-9][\w.'-]*){0,4})/);
  let place = placeM ? placeM[1].replace(/[.,;]+$/, "") : null;
  if (!place) {
    /* "…near the temple, Saibaba Colony, Coimbatore." — a capitalised phrase between commas. */
    const NOT = /^(female|male|photo|released|rescued|ear|adult|puppy|today|yesterday|abc|arv|location|attached)/i;
    const seg = text.split(/[,.;\n]/).map((x) => x.trim()).find((x) => /^[A-Z][\w'-]*(\s+[A-Z][\w'-]*){0,3}$/.test(x) && !NOT.test(x) && !(city && x.toLowerCase() === city.toLowerCase()));
    if (seg) place = seg;
  }
  if (place && city && place.toLowerCase() === city.toLowerCase()) place = null;
  let date: string | null = null;
  if (/\btoday\b/.test(t)) date = iso(today);
  else if (/\byesterday\b/.test(t)) date = iso(new Date(today.getTime() - 86_400_000));
  else {
    const m = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
    if (m) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1]))); if (!isNaN(d.getTime())) date = iso(d); }
    const m2 = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})?/i);
    if (!date && m2) { const mi = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(m2[2].toLowerCase()) / 3; const d = new Date(Date.UTC(m2[3] ? Number(m2[3]) : today.getUTCFullYear(), mi, Number(m2[1]))); if (!isNaN(d.getTime())) date = iso(d); }
  }
  const hasPhoto = /\b(photo|pic|image|attached|jpg|jpeg|png)\b/.test(t);
  const hasLocation = /\b(location|pin|maps\.app|goo\.gl|google\.com\/maps|lat|lng)\b/.test(t);
  const tag = text.match(/\b(SP-[A-Z]{1,4}-[A-Z0-9]{4,8}|[A-Z]{2}[0-9][A-Z0-9]{3,5})\b/)?.[1] ?? null;
  const missing: string[] = [];
  if (!place) missing.push("place");
  if (!city) missing.push("city");
  if (!date && (category === "sterilisation" || category === "vaccination")) missing.push(category === "sterilisation" ? "surgery date" : "vaccination date");
  if (!sex && category === "sterilisation") missing.push("sex");
  if (!hasPhoto && category !== "other") missing.push("photo evidence");
  const what = { sterilisation: "Sterilisation (ABC)", vaccination: "Anti-rabies vaccination", injury: "Injured animal", rescue: "Rescue request", other: "Field update" }[category];
  const summary = [what, [sex, age].filter(Boolean).join(" "), earNotch ? "ear notched" : "", place ? `at ${place}` : "", city ?? ""].filter(Boolean).join(", ");
  return { category, severity, sex, age, earNotch, place, city, date, hasPhoto, hasLocation, tag, summary, missing };
}
