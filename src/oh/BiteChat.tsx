"use client";

/* Help after a dog bite, with Kaju: the chat and the call a resident would use. Kaju greets, gives first aid,
   then listens. The person says what happened in their own words and Kaju understands it, fills the report beside
   the conversation, and asks only for what is still missing, one thing at a time. Questions along the way are
   answered. Where it happened can be said in any words, shared from the phone's location, or pinned on a map.

   Kaju reads the words with a model where the owner has switched it on for this site (/api/oh/kaju), and with its
   fixed rules otherwise (src/oh/biteIntake.ts), turn by turn. Either way the rails are fixed (src/oh/biteFacts.ts):
   the safety question, the emergency advice and the advice to see a doctor today are reviewed text, never the
   model's. Kaju never assesses a wound or recommends treatment, and nothing is sent until the person confirms.
   A shared location stays in the browser; it only chooses the nearest centre when the report is sent. */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Check, LocateFixed, MapPin, MessageCircle, Mic, MicOff, Phone, PhoneOff, Send, Wand2 } from "lucide-react";
import { Kaju } from "@/kaju/Kaju";
import type { KajuState } from "@/kaju/poses";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";
import { readBite } from "./biteIntake";
import { ASK, NO_FACTS, mustAsk, type BiteFacts, type BiteNext } from "./biteFacts";
import { Ears, checkMic, digits, hearSarvam, hush, listen, lockVoice, problemText, sarvamReady, sayAloud, speak, unlockAudio, whenWord, yesNo, type Heard, type VoiceProblem } from "./voiceAgent";

const PinPicker = dynamic(() => import("./PinPicker").then((m) => m.PinPicker), { ssr: false, loading: () => <div className="kp"><p className="kb-wait">Opening the map…</p></div> });

type Facility = { id: string; name: string; kind: string; area: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; services: { service: string; status: string; verified_at: string; valid_until: string }[]; refers: { service: string; to: string; to_id: string }[] };
type Outline = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
type Pub = { programme: { name: string; illustrative: boolean; areas: { id: string; name: string; geometry?: Outline | null }[] } | null; facilities: Facility[] };
/** Whether [lng, lat] lies inside an area's outline (even-odd rule; holes are later rings). */
const inside = (g: Outline | null | undefined, lng: number, lat: number) => {
  if (!g || !Array.isArray(g.coordinates)) return false;
  const polys = g.type === "MultiPolygon" ? g.coordinates : g.type === "Polygon" ? [g.coordinates] : [];
  return polys.some((rings) => rings.reduce((inPoly, ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit ? !inPoly : inPoly;
  }, false));
};
type Area = { id: string; name: string };
type At = "tell" | "danger" | "urgent" | "notify" | "where" | "when" | "date" | "animal" | "looks" | "call" | "phone" | "review" | "sending" | "done" | "closed";
type Card = { kind: "danger" } | { kind: "urgent" } | { kind: "review" } | { kind: "sent"; to: string; hours: string | null } | { kind: "centres"; first: string | null } | { kind: "here"; area: string | null; how: "located" | "pinned" };
type Msg = { id: number; who: "kaju" | "me"; text: string; voice?: string; card?: Card; tone?: "aid" | "urgent"; spoken?: boolean; tour?: string };
type Bot = Omit<Msg, "id" | "who">;
type Spot = { lat: number; lng: number };
type Talk = { on: boolean; phase: "connecting" | "thinking" | "speaking" | "listening" | "idle" | "muted"; words: string; caption: string; problem: VoiceProblem | null; started: number; ended: boolean; muted: boolean; engine: "sarvam" | "browser"; lang: string };
type Mode = "chat" | "call";
type Sent = { to: string; hours: string | null; time: string };
type Chip = { label: string; go: () => void; cls?: string; icon?: "pin" | "locate" | "send" };
const CALL_LANGS: [string, string][] = [["en-IN", "English"], ["kn-IN", "ಕನ್ನಡ"], ["hi-IN", "हिन्दी"]];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
/** The words the guided demo offers with one click. */
export const BITE_EXAMPLE = "A street dog bit me on the leg near the 100 Feet Road bus stop in Indiranagar this morning. What should I do?";
export const LOOKS_EXAMPLE = "Brown, medium size, no collar. He's always at that bus stop.";
const dayWord = (iso: string) => iso === today() ? "Today" : iso === daysAgo(1) ? "Yesterday" : new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const WHO: Record<string, string> = { self: "You", someone: "Someone else", child: "A child" };
const KIND: Record<string, string> = { bite: "A bite", scratch: "A scratch", lick_broken_skin: "A lick on broken skin", other: "Contact with an animal" };
const OWNER: Record<string, string> = { community: "street or community", owned: "someone's pet", unknown: "not known whose" };

/* Kaju's fixed lines: reviewed, and the same whether a model or the fixed rules read the words. */
const OPENING: Msg[] = [
  { id: 1, who: "kaju", text: "Hi, I'm Kaju. I'll help you get care today, and let the clinic know you're coming.", voice: "Hi, I'm Kaju. I'll help you get care today." },
  { id: 2, who: "kaju", tone: "aid", text: "First, wash the wound with soap and running water for 15 minutes.", voice: "First, wash the wound with soap and running water for fifteen minutes." },
  { id: 3, who: "kaju", text: "Then tell me what happened, in your own words.", voice: "Then tell me what happened." },
];
const DANGER: Bot = { card: { kind: "danger" }, tour: "bite-danger", text: "Quick safety check. Is any of this true? Heavy bleeding or a deep wound. Several bites, or bites on the face, head, neck or hands. A young child, or someone unwell.", voice: "Quick safety check. Any heavy bleeding, or a deep wound? Several bites, or a bite on the face, head, neck or hands? Or is it a young child, or someone unwell?" };
const URGENT: Bot = { tone: "urgent", card: { kind: "urgent" }, text: "This needs emergency care. Call 108 now, or go to the nearest hospital emergency.", voice: "This needs emergency care. Please call 1 0 8 now, or go to the nearest hospital emergency." };
const DOCTOR: Bot = { text: "Good. Please still see a doctor today, even if it looks small; the doctor decides on the vaccine. I'll get the nearest clinic ready for you.", voice: "Good. Please still see a doctor today, even if it looks small. I'll get the clinic ready for you." };
const ALSO: Bot = { text: "I'll also let the nearest clinic know you're coming.", voice: "I'll also let the clinic know you're coming." };
const NOTIFY_Q = "Shall I let the nearest clinic know you're coming?";
const WHAT_NOT = "Don't put chilli, turmeric, oil or any home remedy on the wound. Don't wait to see if the animal gets ill, and don't try to catch it.";
/* What Kaju says again on the call when it did not hear an answer. */
const AGAIN: Partial<Record<At, string>> = {
  tell: "What happened?", danger: "Any of those? Yes or no?", urgent: "Shall I tell the clinic? Yes or no?", notify: "Shall I tell the clinic? Yes or no?",
  where: "Where did it happen?", when: "When did it happen?", looks: "What did the dog look like? Or say skip.",
  call: "Can the clinic call you? Yes or no?", phone: "What's your number?", review: "Shall I send it to the clinic?",
};
/** The guided demo is doing the clicking (src/sp/demo/DemoTour.tsx): answer at once with the fixed lines. */
const guided = () => typeof document !== "undefined" && document.documentElement.dataset.dtAuto === "1";
const told = (f: BiteFacts) => !!(f.kind || f.species || f.area || f.place || f.pinned || f.on);
const merge = (f: BiteFacts, p: Partial<BiteFacts>): BiteFacts => ({ ...f, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null && v !== undefined)), skipped: [...new Set([...f.skipped, ...(p.skipped ?? [])])] });
const atOf = (n: BiteNext, f: BiteFacts, cur: At): At =>
  n === "none" ? cur : n === "notify" ? (f.danger === "yes" ? "urgent" : "notify") : n === "centres" ? "closed" : n === "send" ? "review" : n === "restart" ? "tell" : n;
/* Bite help is for dog bites: the dog unless the person said another animal. */
const animalWord = (f: BiteFacts) => (f.species && f.species !== "dog" ? SPECIES[f.species]?.toLowerCase() ?? "dog" : "dog");
const lookQ = (f: BiteFacts) => `So the area's animal team can find the ${animalWord(f)}: what did it look like? Colour, size, a collar?`;
const reviewVoice = (f: BiteFacts) => `Here's your report: a ${animalWord(f)} ${f.kind === "scratch" ? "scratch" : "bite"}${f.area ? ` in ${f.area}` : ""}, ${f.when ?? (f.on ? dayWord(f.on).toLowerCase() : "today")}${f.looks ? `. ${f.looks.replace(/[.\s]+$/, "")}` : ""}.`;

/** Kaju's fixed rules for one answer, when no model reads it. */
function rules(at: At, t: string, f: BiteFacts, areas: Area[]): { patch?: Partial<BiteFacts>; next?: BiteNext; reply?: string; unclear?: string; date?: boolean } {
  const yn = yesNo(t), skip = /^\s*(skip|no idea|not sure|don'?t know|dont know|nothing|none)\b/i.test(t);
  if (/\b(start again|restart|start over)\b/i.test(t)) return { next: "restart" };
  /* "What should I NOT do?" (or a home remedy) is answered; "what should I do?" at the end of a description is not. */
  if (at !== "tell" && /\b(what (should i|to) not do|what shouldn'?t i do|home remed|turmeric|chilli|chili)\b/i.test(t)) return { reply: WHAT_NOT, next: "none" };
  switch (at) {
    case "tell": {
      if (t.trim().split(/\s+/).length < 3) return { unclear: "Tell me a little more: what happened, where and when?" };
      const d = readBite(t, areas);
      const what = d.kind === "scratch" ? "scratch" : d.kind === "lick_broken_skin" ? "lick on broken skin" : "bite";
      const who = d.species ? `${d.ownership === "community" ? "street " : d.ownership === "owned" ? "pet " : ""}${SPECIES[d.species].toLowerCase()} ` : "";
      const reply = `Okay, a ${who}${what}${d.area ? ` in ${d.area.name}` : ""}${d.when ? `, ${d.when}` : ""}.`;
      return { patch: { kind: d.kind, species: d.species, ownership: d.ownership, person: d.person, area: d.area?.name ?? null, place: d.place, on: d.on, when: d.when, looks: d.looks }, reply };
    }
    case "danger": return yn === "yes" ? { patch: { danger: "yes" } } : yn === "no" ? { patch: { danger: "no" } } : { unclear: "Is any of those true? Tap Yes or No." };
    case "urgent": case "notify":
      if (yn === "yes" || /\b(tell|send|inform|let them know)\b/i.test(t)) return { patch: { notify: "yes" } };
      if (yn === "no" || /\b(where|centres?|centers?|just show)\b/i.test(t)) return { patch: { notify: "no" } };
      return { unclear: "Shall I tell the clinic? Yes or no?" };
    case "where": {
      if (skip) return { patch: { skipped: ["where"] } };
      const a = readBite(t, areas).area;
      const place = t.replace(/\s+/g, " ").trim().slice(0, 160);
      return { patch: { area: a?.name ?? null, place: a && place.toLowerCase() === a.name.toLowerCase() ? null : place } };
    }
    case "when": { const w = whenWord(t); return w === "today" ? { patch: { on: today() } } : w === "yesterday" ? { patch: { on: daysAgo(1) } } : w === "earlier" ? { date: true } : skip ? { patch: { skipped: ["when"] } } : { unclear: "Today, yesterday, or earlier?" }; }
    case "looks": return skip ? { patch: { skipped: ["looks"] } } : { patch: { looks: t.trim().slice(0, 240), place: f.place ? null : readBite(t, areas).place } };
    case "call": { const d = digits(t); return d.length >= 8 ? { patch: { callback: "yes", phone: d } } : yn === "yes" ? { patch: { callback: "yes" } } : yn === "no" ? { patch: { callback: "no" } } : { unclear: "Can the clinic call you? Yes or no?" }; }
    case "phone": { const d = digits(t); return d.length >= 8 && d.length <= 13 ? { patch: { phone: d } } : /\b(no|skip|don'?t)\b/i.test(t) ? { patch: { callback: "no" } } : { unclear: "Please type the number, digits only." }; }
    case "review": return /\b(don'?t|do not) send\b|\bjust show\b/i.test(t) || yn === "no" ? { patch: { notify: "no" } } : yn === "yes" || /\bsend\b/i.test(t) ? { next: "send" } : /\b(change|wrong|edit)\b/i.test(t) ? { next: "restart" } : { unclear: "Shall I send it? Tap Send the report." };
    default: return { reply: "Please see a doctor today. If it gets worse, call 108.", next: "none" };
  }
}

export function BiteHelp({ slug }: { slug: string | null }) {
  const pub = useRead<Pub>(() => (slug ? call<Pub>("oh_public_services", { p_programme_slug: slug }) : Promise.resolve({ data: null, error: null })), `pub:${slug}`);
  const areas = useMemo(() => pub.data?.programme?.areas ?? [], [pub.data]);
  const ready = !slug || !!pub.data || !!pub.error;

  const [mode, setMode] = useState<Mode>("chat");
  const [at, setAt] = useState<At>("tell");
  const [log, setLog] = useState<Msg[]>(OPENING);
  const [queue, setQueue] = useState<Msg[]>([]);
  const [facts, setFacts] = useState<BiteFacts>(NO_FACTS);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [ai, setAi] = useState<boolean | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [reached, setReached] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [talk, setTalk] = useState<Talk>({ on: false, phase: "idle", words: "", caption: "", problem: null, started: 0, ended: false, muted: false, engine: "browser", lang: "en-IN" });
  const [sarvam, setSarvam] = useState<boolean | null>(null);
  useEffect(() => { void sarvamReady().then(setSarvam); }, []);
  useEffect(() => { void fetch("/api/oh/kaju", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { ai: false })).then((j: { ai?: boolean }) => setAi(!!j.ai)).catch(() => setAi(false)); }, []);
  const ears = useRef<Ears | null>(null), browserVoice = useRef<SpeechSynthesisVoice | null>(null);
  const [again, setAgain] = useState(0);
  const nextId = useRef(10), heardTo = useRef(0), skipSay = useRef(false), finish = useRef<(() => void) | null>(null), dangerShown = useRef(false), misses = useRef(0);
  /* The newest state, for answers that arrive after a wait. */
  const now = useRef({ at, facts, log, queue, mode });
  now.current = { at, facts, log, queue, mode };
  const reach = (m: string) => setReached((r) => (r.includes(m) ? r : [...r, m]));
  const instant = mode === "call" || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const busy = thinking || queue.length > 0;

  /* The person's message shows at once; Kaju's follow one at a time, after a short "typing" pause in the chat. */
  const showMe = (text: string, spoken = false, card?: Card) => setLog((l) => [...l, { id: nextId.current++, who: "me", text, spoken, card }]);
  const bots = (...b: Bot[]) => { if (b.length) setQueue((q) => [...q, ...b.map((x) => ({ ...x, id: nextId.current++, who: "kaju" as const }))]); };
  useEffect(() => {
    if (!queue.length) return;
    const m = queue[0];
    const t = window.setTimeout(() => { setLog((l) => [...l, m]); setQueue((q) => q.slice(1)); }, instant ? 0 : guided() ? 140 : Math.min(900, 320 + m.text.length * 4));
    return () => window.clearTimeout(t);
  }, [queue, instant]);

  /* ── One step of the conversation: the fixed lines a change brings, then Kaju's reply and the next question. ── */
  const step = (prev: BiteFacts, f: BiteFacts, next: BiteNext, reply: string | null) => {
    if (next === "restart") { restart(); return; }
    const out: Bot[] = [];
    if (prev.danger !== "yes" && f.danger === "yes") out.push(URGENT, { text: "Nearest anti-rabies centres:", voice: "", card: { kind: "centres", first: null } }, ALSO);
    else if (prev.danger === null && f.danger === "no") out.push(DOCTOR);
    switch (next) {
      case "danger":
        if (reply) out.push({ text: reply, tour: "bite-understood" });
        if (!dangerShown.current) { out.push(DANGER); dangerShown.current = true; } else if (!reply) out.push({ text: "Is any of those true? Yes or no?" });
        break;
      case "notify": out.push({ text: reply ?? NOTIFY_Q, tour: "bite-notify" }); break;
      case "centres": out.push({ text: "Here are the nearest anti-rabies centres.", voice: "The nearest centres are on your screen.", card: { kind: "centres", first: null } }, { text: reply && !/centre|center/i.test(reply) ? reply : "Take care, and please see a doctor today." }); break;
      case "review": out.push(...(reply && !/send/i.test(reply) ? [{ text: reply }] : []), { text: "Here's your report.", voice: reviewVoice(f), card: { kind: "review" } }, { text: "Shall I send it to the nearest centre that has the anti-rabies vaccine, so they know you're coming?", voice: "Shall I send it to the clinic?" }); break;
      case "send": break;
      case "none": if (reply) out.push({ text: reply }); break;
      case "tell": out.push({ text: reply ?? "Tell me a little more: what happened, where and when?" }); break;
      default: {
        /* An answer to a question of theirs is followed by the question still open, so the conversation never stalls. */
        const q = next === "looks" ? lookQ(f) : ASK[next];
        if (reply && !/\?\s*$/.test(reply)) out.push({ text: reply }, { text: q, tour: "bite-ask" });
        else out.push({ text: reply ?? q, tour: "bite-ask" });
      }
    }
    setFacts(f);
    const a = atOf(next, f, now.current.at);
    setAt(a);
    if (told(f)) reach("understood");
    if (f.danger) reach("danger");
    if (f.notify === "yes") reach("ask");
    if (next === "review") reach("review");
    bots(...out);
    if (next === "send") void send(f);
  };

  /* The model's turn: the conversation so far, the report, and what is on screen. null when it cannot answer. */
  const askModel = async (words: string, f: BiteFacts): Promise<{ reply: string; next: BiteNext; quick: string[]; facts: BiteFacts } | null> => {
    const { log: l, queue: q, at: a, mode: m } = now.current;
    const turns = [...l, ...q].filter((x) => x.text && x.tone !== "aid").map((x) => ({ who: x.who, text: x.card?.kind === "review" ? `(the report: ${reviewVoice(f)})` : x.text }));
    turns.push({ who: "me", text: words });
    try {
      const r = await fetch("/api/oh/kaju", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ turns: turns.slice(-30), facts: f, showing: a, areas: areas.map((x) => x.name), programme: pub.data?.programme?.name ?? "the city", mode: m }) });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  };

  /** One answer, typed, spoken or tapped. A tap carries its fact; words are read by the model or the fixed rules. */
  const answer = async (text: string, o: { patch?: Partial<BiteFacts>; spoken?: boolean; card?: Card } = {}) => {
    const w = text.trim();
    if (!w || thinking || now.current.queue.length || now.current.at === "sending") return;
    const prev = now.current.facts;
    showMe(w, !!o.spoken, o.card);
    setSuggest([]);
    if (o.patch) { const f = merge(prev, o.patch); step(prev, f, mustAsk(f), null); return; }
    if (ai && misses.current < 3 && !guided()) {
      setThinking(true);
      const r = await askModel(w, prev);
      setThinking(false);
      if (r) {
        misses.current = 0;
        const f = { ...r.facts, pinned: prev.pinned || r.facts.pinned };
        setSuggest(r.quick ?? []);
        step(prev, f, r.next, r.reply);
        return;
      }
      misses.current++;
    }
    const r = rules(now.current.at, w, prev, areas);
    if (r.unclear) { bots({ text: r.unclear }); return; }
    if (r.date) { bots({ text: "Please choose the date." }); setAt("date"); return; }
    const f = r.patch ? merge(prev, r.patch) : prev;
    step(prev, f, r.next ?? mustAsk(f), r.reply ?? null);
  };

  /* Where it happened, from the phone or a pin: the area whose outline holds the point. The nearest centre's area was
     used before, which filed a bite near a boundary under the neighbouring ward; with no outline, no area is guessed. */
  const areaNear = (p: Spot) => {
    const a = areas.find((x) => inside(x.geometry, p.lng, p.lat));
    return a ? a.name : null;
  };
  const placed = (p: Spot, how: "located" | "pinned") => {
    setSpot(p); setPicking(false);
    const area = areaNear(p);
    void answer(how === "located" ? "My current location" : "Here, on the map", { patch: { pinned: true, ...(area ? { area } : {}) }, card: { kind: "here", area, how } });
  };
  const locate = () => {
    if (!navigator.geolocation) { setPicking(true); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((p) => { setLocating(false); placed({ lat: p.coords.latitude, lng: p.coords.longitude }, "located"); },
      () => { setLocating(false); bots({ text: "I couldn't get your location. Drop a pin on the map, or type the place." }); }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 120000 });
  };

  const restart = () => {
    setFacts(NO_FACTS); setSpot(null); setSent(null); setSuggest([]); dangerShown.current = false;
    bots({ text: "Okay, let's start again. What happened? Tell me in your own words." }); setAt("tell");
  };
  const send = async (f: BiteFacts = now.current.facts) => {
    setAt("sending"); setErr(null);
    const phone = f.callback === "yes" && f.phone ? f.phone : null;
    const area = areas.find((a) => a.name === f.area)?.id ?? null;
    const r = await call<{ facility: { name: string; hours: string | null; vaccine?: string; vaccine_confirmed_at?: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on ?? today(), p_area: area, p_place: f.place || null, p_species: f.species ?? "dog", p_animal_description: f.looks || null, p_phone: phone, p_consent: !!phone, p_lat: spot?.lat ?? null, p_lng: spot?.lng ?? null });
    if (r.error) { setErr(r.error); setAt("review"); return; }
    const to: { name: string; hours: string | null; vaccine?: string; vaccine_confirmed_at?: string | null } = r.data?.facility ?? { name: "the programme", hours: null };
    setSent({ to: to.name, hours: to.hours, time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) });
    /* What is known about the vaccine there, as the facility last confirmed it. The notice goes to a facility with the
       vaccine when one has confirmed it; otherwise the nearest, and the person is told to call first. */
    const vaccine = to.vaccine === "available" ? `They confirmed the anti-rabies vaccine is available${to.vaccine_confirmed_at ? ` (${relDay(to.vaccine_confirmed_at).toLowerCase()})` : ""}.`
      : to.vaccine === "limited" ? "They confirmed the anti-rabies vaccine is available in limited supply. Call before you go if you can."
      : to.vaccine ? "No centre has confirmed the anti-rabies vaccine recently. Call before you go if you can, or go to the nearest hospital." : "";
    bots(
      { card: { kind: "sent", to: to.name, hours: to.hours }, text: `Sent to ${to.name}. They know you're coming.${vaccine ? ` ${vaccine}` : ""}`, voice: `Done. ${to.name} knows you're coming.${to.hours ? ` They're open ${to.hours.toLowerCase()}.` : ""}${vaccine ? ` ${vaccine}` : ""} Please go today. Take care.` },
      { text: "When the clinic records your visit, the animal team for your area is asked to find and observe the animal.", voice: "" },
      { text: "Where to go today:", voice: "", card: { kind: "centres", first: to.name } });
    reach("sent"); setAt("done");
  };
  const sendNow = () => { if (busy || at !== "review") return; showMe("Send the report"); setFacts((f) => ({ ...f, notify: "yes" })); void send(); };

  /* The answers to tap, the same in the chat and on the call. */
  const tap = (label: string, patch: Partial<BiteFacts>) => () => void answer(label, { patch });
  const fixedChips: Chip[] =
    at === "danger" ? [{ label: "Yes", go: tap("Yes", { danger: "yes" }) }, { label: "No, none of these", go: tap("No, none of these", { danger: "no" }) }] :
    at === "urgent" ? [{ label: "Yes, tell the clinic", go: tap("Yes, tell the clinic", { notify: "yes" }), cls: "is-go" }, { label: "No, just show me where to go", go: tap("No, just show me where to go", { notify: "no" }) }] :
    at === "notify" ? [{ label: "Yes, tell the clinic", go: tap("Yes, tell the clinic", { notify: "yes" }), cls: "is-go" }, { label: "No, just show me where to go", go: tap("No, just show me where to go", { notify: "no" }) }, { label: "What should I not do?", go: () => void answer("What should I not do?") }] :
    at === "where" ? [{ label: locating ? "Finding you…" : "Use my location", go: locate, icon: "locate" }, { label: "Drop a pin", go: () => setPicking(true), icon: "pin" }] :
    at === "when" ? [{ label: "Today", go: tap("Today", { on: today() }) }, { label: "Yesterday", go: tap("Yesterday", { on: daysAgo(1) }) }, { label: "Earlier", go: () => { showMe("Earlier"); bots({ text: "Please choose the date." }); setAt("date"); } }] :
    at === "looks" ? [{ label: "Skip", go: tap("Skip", { skipped: ["looks"] }) }] :
    at === "call" ? [{ label: "Yes, call me", go: tap("Yes, call me", { callback: "yes" }) }, { label: "No, don't call me", go: tap("No, don't call me", { callback: "no" }) }] :
    at === "review" ? [{ label: "Send the report", go: sendNow, cls: "is-go", icon: "send" }, { label: "Don't send, just show me where to go", go: tap("Don't send, just show me where to go", { notify: "no" }) }, { label: "Start again", go: () => { showMe("Start again"); restart(); } }] :
    at === "done" || at === "closed" ? [{ label: "Start a new report", go: () => { showMe("Start a new report"); restart(); } }] : [];
  const chips: Chip[] = [...fixedChips, ...suggest.filter((s) => !fixedChips.some((c) => c.label.toLowerCase() === s.toLowerCase())).slice(0, 3).map((s) => ({ label: s, go: () => void answer(s) }))];

  /* ── The call: each new line from Kaju said aloud, then one answer heard and read like a typed one. With Sarvam the
     voice is Bulbul and the ears are Saaras (any Indian language, read as English); otherwise the browser's own, with
     one voice kept for the whole call. ── */
  const startCall = async (lang: string) => {
    unlockAudio(); /* inside the tap, so the browser lets Kaju speak */
    setMode("call");
    const lastMe = [...log].reverse().find((m) => m.who === "me");
    heardTo.current = lastMe ? lastMe.id : 0;
    setTalk({ on: false, phase: "connecting", words: "", caption: "", problem: null, started: Date.now(), ended: false, muted: false, engine: "browser", lang });
    const viaSarvam = await sarvamReady();
    if (viaSarvam) {
      const e = new Ears(), p = await e.open();
      if (p) { setTalk((t) => ({ ...t, phase: "idle", problem: p })); return; }
      ears.current = e;
    } else {
      const p = await checkMic();
      if (p) { setTalk((t) => ({ ...t, phase: "idle", problem: p })); return; }
      browserVoice.current = await lockVoice();
    }
    setTalk((t) => ({ ...t, on: true, engine: viaSarvam ? "sarvam" : "browser", lang: viaSarvam ? lang : "en-IN", started: Date.now() }));
  };
  const endCall = (problem: VoiceProblem | null = null) => { finish.current = null; hush(); ears.current?.close(); ears.current = null; setTalk((t) => ({ ...t, on: false, phase: "idle", words: "", problem, ended: true })); };
  useEffect(() => () => { hush(); ears.current?.close(); }, []);
  useEffect(() => {
    if (!talk.on || busy) return;
    const ctl = new AbortController(), sig = ctl.signal;
    const set = (x: Partial<Talk>) => { if (!sig.aborted) setTalk((t) => (t.on ? { ...t, ...x } : t)); };
    const viaSarvam = talk.engine === "sarvam";
    const sayLine = async (line: string): Promise<boolean> => {
      if (!viaSarvam) { set({ phase: "speaking", caption: line }); await speak(line, sig, browserVoice.current); return true; }
      set({ phase: "thinking" });
      const r = await sayAloud(line, talk.lang, sig, () => set({ phase: "speaking", caption: line }));
      if ("error" in r) { set({ phase: "idle", problem: r.error }); return false; }
      if (r.said) set({ caption: r.said });
      return true;
    };
    const hear = async (): Promise<Heard> => {
      set({ phase: "listening", words: "", problem: null });
      if (!viaSarvam) return listen((w) => set({ words: w }), sig, finish);
      const e = ears.current;
      if (!e) return { error: "failed" };
      finish.current = () => e.stop();
      const level = (v: number) => document.querySelector<HTMLElement>(".kv-wave")?.style.setProperty("--lvl", v.toFixed(2));
      const audio = await e.record(sig, level);
      finish.current = null;
      if (audio === "no-speech") return { error: "no-speech" };
      set({ phase: "thinking" });
      return hearSarvam(audio, sig);
    };
    (async () => {
      const fresh = log.filter((m) => m.who === "kaju" && m.id > heardTo.current);
      if (log.length) heardTo.current = Math.max(heardTo.current, log[log.length - 1].id);
      let line = skipSay.current ? "" : fresh.map((m) => (m.voice !== undefined ? m.voice : m.text)).filter(Boolean).join(" ");
      skipSay.current = false;
      let tries = 0;
      while (!sig.aborted) {
        if (line && !(await sayLine(line))) return;
        if (sig.aborted) return;
        if (at === "done" || at === "closed") { endCall(); return; }
        if (!AGAIN[at]) { set({ phase: "idle" }); return; }
        if (talk.muted) { set({ phase: "muted" }); return; }
        const h = await hear();
        if (sig.aborted) return;
        if ("error" in h) {
          if (h.error === "no-speech" && tries++ < 1) { line = `Sorry, I didn't hear you. ${AGAIN[at]}`; continue; }
          if (h.error === "denied" || h.error === "unsupported" || h.error === "no-mic") { endCall(h.error); return; }
          set({ phase: "idle", problem: h.error }); return;
        }
        /* Kaju answers in the language the caller speaks (Kannada or Hindi replies are machine-translated). */
        if (viaSarvam && h.lang && h.lang !== talk.lang && CALL_LANGS.some(([c]) => c === h.lang)) setTalk((t) => ({ ...t, lang: h.lang as string }));
        set({ words: h.text, phase: "thinking" });
        if (at === "review" && (yesNo(h.text) === "yes" || /\bsend\b/i.test(h.text))) { showMe(h.text, true); void send(); return; }
        void answer(h.text, { spoken: true });
        return;
      }
    })();
    return () => ctl.abort();
  }, [talk.on, talk.muted, at, again, busy, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const answerNow = () => { skipSay.current = true; setTalk((t) => ({ ...t, problem: null, muted: false })); setAgain((n) => n + 1); };

  const pick = (m: Mode) => { if (m === mode) return; if (m === "chat" && talk.on) endCall(); setMode(m); };
  const centres = (pub.data?.facilities ?? []).flatMap((c) => (c.lat !== null && c.lng !== null ? [{ lat: c.lat, lng: c.lng, name: c.name }] : []));
  const view = { at, chips, busy, thinking, log, err, ready, slug, facts };
  return (
    <div className="kb" data-at={at} data-mode={mode} data-busy={busy ? "1" : "0"} data-ai={ai ? "1" : "0"} data-reached={reached.join(" ")} data-sent-to={sent?.to}>
      <header className="kb-top">
        <Link href="/" className="kb-brand" aria-label="StrayPaw home"><img src="/icon-192.png" alt="" width={28} height={28} /><span>StrayPaw</span></Link>
        <span className="kb-app"><b>Kaju</b><span>Help after a dog bite</span></span>
        {pub.data?.programme?.illustrative ? <span className="kb-demo">Demo</span> : null}
        <a className="kb-108" href="tel:108" aria-label="Emergency: call 108"><Phone size={14} aria-hidden /><span>Emergency</span> <b>108</b></a>
      </header>
      <main id="main" className="kb-main">
        <div className="kb-head">
          <div>
            <h1>Bitten or scratched by a dog?</h1>
            <p>Tell Kaju what happened. Kaju gets you to care today and lets the nearest anti-rabies centre know you&apos;re coming.</p>
          </div>
          <div className="kb-modes" role="tablist" aria-label="How to talk to Kaju">
            <button type="button" role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "is-on" : undefined} onClick={() => pick("chat")} data-tour="mode-chat"><MessageCircle size={16} aria-hidden /> Chat</button>
            <button type="button" role="tab" aria-selected={mode === "call"} className={mode === "call" ? "is-on" : undefined} onClick={() => pick("call")} data-tour="mode-call"><Phone size={16} aria-hidden /> Call</button>
          </div>
        </div>
        <div className="kb-grid">
          {mode === "chat"
            ? <ChatView {...view} onSend={(t) => void answer(t)} example={at === "tell" ? BITE_EXAMPLE : at === "looks" ? LOOKS_EXAMPLE : null}
                picker={picking ? <PinPicker centres={centres} start={spot} onPick={(p) => placed(p, "pinned")} onCancel={() => setPicking(false)} /> : null}
                onDate={(iso) => void answer(dayWord(iso), { patch: { on: iso } })} />
            : <CallView {...view} talk={talk} sent={sent} sarvam={sarvam} onStart={(lang) => void startCall(lang)} onEnd={() => endCall()} onMute={() => setTalk((t) => ({ ...t, muted: !t.muted }))} onAnswer={answerNow} onDone={() => finish.current?.()} onChat={() => pick("chat")} onLang={(lang) => setTalk((t) => ({ ...t, lang }))}
                picker={picking ? <PinPicker centres={centres} start={spot} onPick={(p) => placed(p, "pinned")} onCancel={() => setPicking(false)} /> : null} />}
          <Report facts={facts} at={at} sent={sent} />
        </div>
        <p className="kb-foot">First aid follows WHO rabies guidance and India&apos;s National Rabies Control Programme. Kaju never assesses a wound or recommends treatment; a doctor decides.</p>
      </main>
    </div>
  );
}

type View = { at: At; chips: Chip[]; busy: boolean; thinking: boolean; log: Msg[]; err: string | null; ready: boolean; slug: string | null; facts: BiteFacts };

function Chips({ chips, busy }: { chips: Chip[]; busy: boolean }) {
  if (!chips.length || busy) return null;
  return (
    <div className="kb-quick" data-tour="bite-quick">
      {chips.map((c) => <button key={c.label} type="button" className={c.cls} onClick={c.go}>{c.icon === "pin" ? <MapPin size={15} aria-hidden /> : c.icon === "locate" ? <LocateFixed size={15} aria-hidden /> : c.icon === "send" ? <Check size={16} aria-hidden /> : null}{c.label}</button>)}
    </div>
  );
}

/* ── The chat ── */
function ChatView({ at, chips, busy, thinking, log, err, ready, slug, facts, onSend, example, onDate, picker }: View & { onSend: (t: string) => void; example: string | null; onDate: (iso: string) => void; picker: React.ReactNode }) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(today());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [log.length, busy, at]);
  const submit = () => { if (!text.trim() || !ready || busy) return; onSend(text); setText(""); };
  const tel = at === "phone";
  const hint = at === "tell" ? "Describe what happened…" : at === "where" ? "A landmark, street or area…" : at === "looks" ? "Colour, size, collar, marks…" : tel ? "Phone number" : "Type a reply, or ask anything…";
  const closed = at === "sending";
  return (
    <section className="kc" aria-label="Chat with Kaju">
      <div className="kc-head">
        <span className="kc-ava" aria-hidden><Kaju state={busy ? "thinking" : at === "done" ? "success" : "sitting"} size={44} still /></span>
        <span className="kc-who"><b>Kaju</b><small>{thinking ? "thinking…" : busy ? "typing…" : "Replies in seconds"}</small></span>
      </div>
      <div className="kc-log" ref={box} aria-live="polite">
        <ol>{log.map((m) => <Bubble key={m.id} m={m} slug={slug} facts={facts} />)}</ol>
        {busy ? <p className="kc-typing" aria-label="Kaju is typing"><i /><i /><i /></p> : null}
      </div>
      {err ? <p className="kb-err" role="alert">{err}</p> : null}
      <div className="kc-foot">
        <Chips chips={chips} busy={busy} />
        {at === "date" ? <form className="kb-quick" data-tour="bite-quick" onSubmit={(e) => { e.preventDefault(); onDate(date); }}><input type="date" aria-label="The date it happened" value={date} min={daysAgo(30)} max={today()} onChange={(e) => setDate(e.target.value)} /><button type="submit" className="is-go">Use this date</button></form> : null}
        {closed ? null : <form className="kc-compose" data-tour="bite-compose" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {example && !busy && !text ? <button type="button" className="kc-ex" onClick={() => setText(example)} title="Fill in an example"><Wand2 size={14} aria-hidden /> Example</button> : null}
          <textarea aria-label="Message Kaju" rows={1} value={text} maxLength={600} placeholder={hint} inputMode={tel ? "tel" : undefined}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
          <button type="submit" className="kc-send" aria-label="Send to Kaju" disabled={!text.trim() || !ready || busy}><Send size={18} aria-hidden /></button>
        </form>}
      </div>
      {picker}
    </section>
  );
}

function Bubble({ m, slug, facts }: { m: Msg; slug: string | null; facts: BiteFacts }) {
  const c = m.card;
  return (
    <li className={`kc-m is-${m.who}${m.tone ? ` is-${m.tone}` : ""}${c ? ` has-${c.kind}` : ""}`} data-tour={m.tour}>
      {m.spoken ? <Mic size={13} aria-label="Said aloud" className="kc-said" /> : null}
      {!c ? (m.tone === "aid" ? <><b>First, wash the wound</b> with soap and running water for 15 minutes.</> : m.text)
        : c.kind === "danger" ? <><b>Quick safety check.</b> Is any of this true?<ul><li>Heavy bleeding, or a deep wound</li><li>Several bites, or bites on the face, head, neck or hands</li><li>A young child, or someone unwell</li></ul></>
        : c.kind === "urgent" ? <><b>This needs emergency care.</b> Call <a href="tel:108">108</a> now, or go to the nearest hospital emergency.</>
        : c.kind === "review" ? <ReviewCard f={facts} />
        : c.kind === "here" ? <span className="kc-here"><MapPin size={15} aria-hidden /><span><b>{c.how === "located" ? "My location" : "Pinned on the map"}</b>{c.area ? <small>Near {c.area}</small> : null}</span></span>
        : c.kind === "sent" ? <span className="kc-sent" data-tour="bite-sent"><span className="kc-ok" aria-hidden><Check size={14} strokeWidth={3} /></span><span><b>Sent to {c.to}.</b> They know you&apos;re coming.{c.hours ? ` Open ${c.hours.toLowerCase()}.` : ""}</span></span>
        : <>{m.text}{slug ? <Centres slug={slug} first={c.first} /> : <p>Go to the nearest government hospital.</p>}</>}
    </li>
  );
}

function ReviewCard({ f }: { f: BiteFacts }) {
  return (
    <div className="kc-card" data-tour="bite-review">
      <p className="kc-card-h">Your report</p>
      <dl>
        <div><dt>When</dt><dd>{f.on ? dayWord(f.on) : "Not given"}{f.when ? ` (${f.when})` : ""}</dd></div>
        <div><dt>Where</dt><dd>{[f.area, f.place].filter(Boolean).join(" · ") || (f.pinned ? "Pinned on the map" : "Not given")}</dd></div>
        <div><dt>Dog</dt><dd>{f.species && f.species !== "dog" ? `${SPECIES[f.species]} (not a dog)` : f.ownership === "owned" ? "Someone's pet" : f.ownership === "community" ? "Street or community dog" : "Owner not known"}</dd></div>
        <div><dt>Looked like</dt><dd>{f.looks || "Not given"}</dd></div>
        <div><dt>Call back</dt><dd>{f.callback === "yes" && f.phone ? `Yes, on ${f.phone}` : "No"}</dd></div>
      </dl>
    </div>
  );
}

/* ── The call: a phone call, not a dashboard. Kaju's face, the line it is saying in large type, what it heard
   beneath, a voice line that moves with whoever is speaking, and the three controls of any phone. ── */
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function Wave({ phase }: { phase: Talk["phase"] }) {
  return <span className={`kv-wave is-${phase}`} aria-hidden>{Array.from({ length: 21 }, (_, i) => <i key={i} style={{ "--i": i, "--k": (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7))).toFixed(2) } as React.CSSProperties} />)}</span>;
}
function CallView({ at, chips, busy, log, err, ready, slug, talk, sent, sarvam, onStart, onEnd, onMute, onAnswer, onDone, onChat, onLang, picker }: View & { talk: Talk; sent: Sent | null; sarvam: boolean | null; onStart: (lang: string) => void; onEnd: () => void; onMute: () => void; onAnswer: () => void; onDone: () => void; onChat: () => void; onLang: (lang: string) => void; picker: React.ReactNode }) {
  const [tick, setTick] = useState(() => Date.now());
  const [endedAt, setEndedAt] = useState(0);
  const [lang, setLang] = useState("en-IN");
  useEffect(() => { if (!talk.on) return; const id = window.setInterval(() => setTick(Date.now()), 500); return () => window.clearInterval(id); }, [talk.on]);
  useEffect(() => { if (talk.ended) setEndedAt(Date.now()); }, [talk.ended]);
  const live = talk.on || talk.phase === "connecting";
  const lastKaju = [...log].reverse().find((m) => m.who === "kaju" && m.text);
  const pose: KajuState = talk.problem ? "concerned" : !live ? (sent ? "success" : talk.ended ? "goodbye" : "sitting") : talk.phase === "speaking" ? "explaining" : talk.phase === "listening" ? "listening" : talk.phase === "thinking" ? "thinking" : talk.phase === "connecting" ? "looking" : "headTilt";
  const status = talk.phase === "connecting" ? "Calling…" : talk.phase === "speaking" ? "Speaking" : talk.phase === "listening" ? "Listening" : talk.phase === "thinking" || busy ? "Thinking" : talk.phase === "muted" ? "Muted" : "Your turn";
  const line = talk.phase === "connecting" ? "Connecting you to Kaju" : talk.caption || lastKaju?.text || "";
  const langName = CALL_LANGS.find(([c]) => c === talk.lang)?.[1] ?? "English";
  if (!live) return (
    <section className={`kv is-off${talk.ended || talk.problem ? " is-ended" : ""}`} aria-label="Call Kaju">
      <div className="kv-card">
        <div className="kv-face"><Kaju state={pose} size={112} still={!talk.ended} /></div>
        {talk.ended || talk.problem ? <>
          <h2>{talk.problem ? "The call stopped" : "Call ended"}</h2>
          <p className="kv-sub">{talk.problem ? problemText(talk.problem) : sent ? `${sent.to} knows you're coming. ${clock(endedAt - talk.started)}` : `Call again, or carry on in the chat. ${clock(endedAt - talk.started)}`}</p>
        </> : <>
          <h2>Kaju</h2>
          <p className="kv-sub">StrayPaw&apos;s helpline after a dog bite. Talk as you would to a person; Kaju fills the report and tells the clinic.</p>
          {sarvam ? <div className="kv-langs" role="radiogroup" aria-label="Language">{CALL_LANGS.map(([c, l]) => <button key={c} type="button" role="radio" aria-checked={lang === c} className={lang === c ? "is-on" : undefined} onClick={() => { setLang(c); onLang(c); }}>{l}</button>)}</div> : null}
        </>}
        <button type="button" className="kv-call" onClick={() => onStart(lang)} disabled={!ready || sarvam === null} data-tour="bite-call"><Phone size={20} aria-hidden /> {ready && sarvam !== null ? (talk.ended ? "Call again" : "Call Kaju") : "One moment…"}</button>
        {talk.ended || talk.problem ? <button type="button" className="kv-link" onClick={onChat}>Continue in the chat</button> : <p className="kv-fine">Free · No name asked · {sarvam ? "English, ಕನ್ನಡ, हिन्दी" : "English"}</p>}
      </div>
      {sent && slug ? <div className="kv-centres"><Centres slug={slug} first={sent.to} /></div> : null}
    </section>
  );
  return (
    <section className={`kv is-live is-${talk.phase}`} aria-label="Call with Kaju">
      <div className="kv-bar">
        <span className="kv-dot" aria-hidden /><b>Kaju</b><span className="kv-state" role="status">{status}</span>
        <span className="kv-time">{clock(tick - talk.started)}{talk.engine === "sarvam" ? ` · ${langName}` : ""}</span>
      </div>
      <div className="kv-stage">
        <div className="kv-face is-small"><Kaju state={pose} size={84} /></div>
        <Wave phase={busy && talk.phase === "idle" ? "thinking" : talk.phase} />
        <p className="kv-line" aria-live="polite">{line}</p>
        <p className="kv-you">{talk.words ? <>“{talk.words}”</> : talk.phase === "listening" ? "Go ahead, I'm listening." : " "}</p>
      </div>
      {err ? <p className="kb-err" role="alert">{err}</p> : null}
      <Chips chips={chips} busy={busy} />
      <div className="kv-controls">
        <button type="button" className="kv-btn" onClick={onMute} aria-pressed={talk.muted}>{talk.muted ? <MicOff size={22} aria-hidden /> : <Mic size={22} aria-hidden />}<span>{talk.muted ? "Unmute" : "Mute"}</span></button>
        <button type="button" className="kv-end" onClick={onEnd} aria-label="End call"><PhoneOff size={26} aria-hidden /></button>
        {talk.phase === "listening" ? <button type="button" className="kv-btn" onClick={onDone}><Check size={22} aria-hidden /><span>Done</span></button>
          : talk.phase === "idle" || talk.phase === "muted" ? <button type="button" className="kv-btn" onClick={onAnswer}><Mic size={22} aria-hidden /><span>Answer</span></button>
          : <button type="button" className="kv-btn" onClick={onChat}><MessageCircle size={22} aria-hidden /><span>Chat</span></button>}
      </div>
      {picker}
    </section>
  );
}

/* The report Kaju is preparing for the clinic: a live receipt that writes itself as the person speaks or types. */
function Report({ facts: f, at, sent }: { facts: BiteFacts; at: At; sent: Sent | null }) {
  const rows: [string, string | null][] = [
    ["What happened", f.kind || f.species ? `${f.kind ? KIND[f.kind] : "A bite"} by a ${animalWord(f)}${f.ownership && f.ownership !== "unknown" ? ` (${OWNER[f.ownership]})` : ""}` : null],
    ["Who was hurt", f.person ? WHO[f.person] : null],
    ["Area", f.area],
    ["Where", f.place ?? (f.pinned ? "Pinned on the map" : null)],
    ["When", f.on ? `${dayWord(f.on)}${f.when ? ` (${f.when})` : ""}` : null],
    /* A young child is itself on the danger list, so the report does not also say "none" when one was bitten. */
    ["Danger signs", f.danger === "no" ? (f.person === "child" ? "A child was bitten; none of the other signs" : "None of the listed signs") : f.danger === "yes" ? "Yes: emergency care advised" : null],
    ["Looked like", f.looks],
    ["Call back", f.callback === "yes" ? (f.phone ? `Yes, on ${f.phone}` : "Yes") : f.callback === "no" ? "No" : null],
  ];
  const filled = rows.filter(([, v]) => v);
  const needs = (["where", "when", "looks"] as const).filter((k) => !f.skipped.includes(k) && (k === "where" ? !(f.area || f.place || f.pinned) : k === "when" ? !f.on : !f.looks));
  const status = sent ? `Sent to ${sent.to} · ${sent.time}` : at === "review" ? "Ready. Waiting for your OK" : filled.length ? "Writing as you talk" : "Starts when you tell Kaju";
  return (
    <aside className={`kb-report${sent ? " is-sent" : at === "review" ? " is-ready" : ""}`} aria-label="The report Kaju is preparing" data-tour="bite-report">
      <div className="kb-r-h"><b>Report for the clinic</b><span className="kb-r-s" role="status">{sent ? <Check size={13} strokeWidth={3} aria-hidden /> : <i aria-hidden />}{status}</span></div>
      {filled.length ? <dl>{filled.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        : <p className="kb-r-empty">What you tell Kaju appears here, line by line. You check it before anything is sent.</p>}
      {filled.length && !sent && needs.length && at !== "review" ? <p className="kb-r-todo">Still to ask: {needs.map((k) => ({ where: "where", when: "when", looks: "what the dog looked like" }[k])).join(", ")}</p> : null}
      <p className="kb-r-n">Nothing is sent until you confirm. Your name is never asked.</p>
    </aside>
  );
}

/* Where to go: the centres the programme lists publicly; the one told about the person first. */
function Centres({ slug, first }: { slug: string; first: string | null }) {
  const pub = useRead<Pub>(() => call<Pub>("oh_public_services", { p_programme_slug: slug }), `pub:${slug}`);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const r = (d: number) => (d * Math.PI) / 180, R = 6371;
      const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    };
    return (pub.data?.facilities ?? []).map((c) => ({ ...c, d: me && c.lat !== null && c.lng !== null ? km(me, { lat: c.lat, lng: c.lng }) : null }))
      .sort((a, b) => (a.name === first ? -1 : b.name === first ? 1 : (a.d ?? 1e9) - (b.d ?? 1e9)));
  }, [pub.data, me, first]);
  const locate = () => {
    if (!navigator.geolocation) { setLocating("denied"); return; }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition((p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating("idle"); }, () => setLocating("denied"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  };
  if (pub.loading && !pub.data) return <p className="kb-wait">Finding centres…</p>;
  if (pub.error || !pub.data?.programme) return <p>Go to the nearest government hospital. The list of centres could not be loaded just now.</p>;
  const shown = all ? list : list.slice(0, first ? 2 : 3);
  const tone: Record<string, string> = { green: "is-ok", amber: "is-warn", flame: "is-bad" };
  return (
    <div className="kb-centres">
      <ul>
        {shown.map((c) => (
          <li key={c.id} className={c.name === first ? "is-first" : undefined}>
            <p className="kb-c-h"><b>{c.name}</b>{c.name === first ? <em>Expecting you</em> : c.d !== null ? <span>{c.d < 1 ? "under 1 km" : `${c.d.toFixed(1)} km`}</span> : null}</p>
            <p className="kb-c-m">{[c.area, c.hours].filter(Boolean).join(" · ")}{c.phone && /\d/.test(c.phone) ? <> · <a href={`tel:${c.phone.replace(/\s/g, "")}`}>Call</a></> : null}{c.lat !== null && c.lng !== null ? <> · <a href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`} target="_blank" rel="noopener noreferrer">Map</a></> : null}</p>
            <ul className="kb-c-s">
              {["wound_care", "arv", "rig"].map((s) => {
                const v = c.services.find((x) => x.service === s), ref = c.refers.find((r) => r.service === s);
                const st = v?.status ?? (ref ? "refers" : "not_verified"), k = SERVICE_STATUS[st] ?? { label: "Refers elsewhere", tone: "" };
                return <li key={s}><span>{SERVICE_LABEL[s]}</span><b className={tone[k.tone] ?? ""}>{k.label}</b>{st === "not_verified" && v ? <small>last confirmed {relDay(v.verified_at).toLowerCase()}</small> : ref ? <small>go to {ref.to}</small> : null}</li>;
              })}
            </ul>
          </li>
        ))}
      </ul>
      <p className="kb-c-tools">
        {list.length > shown.length ? <button type="button" onClick={() => setAll(true)}>Show all {list.length} centres</button> : null}
        {!first ? <button type="button" onClick={locate} disabled={locating === "busy"}><LocateFixed size={14} aria-hidden /> {me ? "Nearest first" : locating === "busy" ? "Finding you…" : "Nearest to me"}</button> : null}
        {locating === "denied" ? <small>Location is off; the list is in name order.</small> : null}
      </p>
    </div>
  );
}
