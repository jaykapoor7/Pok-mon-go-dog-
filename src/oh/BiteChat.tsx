"use client";

/* Help after an animal bite, with Kaju: the chat and the voice call a resident would use. Both are one conversation
   in one order: first aid, the person's own words, what Kaju understood, the fixed danger-sign question, the advice
   to see a doctor today, an offer to tell the nearest anti-rabies centre, only the details still missing, the report
   to confirm, and where to go. Beside it, the report Kaju is preparing fills in as the person speaks or types.

   Kaju reads the words with fixed rules on the device (src/oh/biteIntake.ts); no AI model reads anything. The call
   uses the browser's own speech recognition and speech (src/oh/voiceAgent.ts); a public phone number is planned for
   the pilot. The first aid, the danger-sign question and the advice are the reviewed fixed steps; nothing here
   assesses a wound or recommends treatment. Nothing is sent until the person confirms. Location never leaves the
   device. */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, LocateFixed, MessageCircle, Mic, MicOff, Phone, PhoneOff, Send, Wand2 } from "lucide-react";
import { Kaju } from "@/kaju/Kaju";
import type { KajuState } from "@/kaju/poses";
import { call, relDay, today, useRead, SERVICE_LABEL, SERVICE_STATUS, SPECIES } from "./data";
import { readBite, type BiteDraft } from "./biteIntake";
import { canSpeak, checkMic, digits, listen, problemText, speak, whenWord, yesNo, type VoiceProblem } from "./voiceAgent";

type Facility = { id: string; name: string; kind: string; area: string | null; address: string | null; phone: string | null; hours: string | null; lat: number | null; lng: number | null; services: { service: string; status: string; verified_at: string; valid_until: string }[]; refers: { service: string; to: string; to_id: string }[] };
type Pub = { programme: { name: string; illustrative: boolean; areas: { id: string; name: string }[] } | null; facilities: Facility[] };
type At = "tell" | "danger" | "urgent" | "notify" | "when" | "date" | "area" | "animal" | "looks" | "place" | "call" | "phone" | "review" | "sending" | "done" | "closed";
type Form = { on: string; area: string; place: string; species: string; animal: string; phone: string };
type Card = { kind: "danger" } | { kind: "urgent" } | { kind: "review"; f: Form; area: string | null; when: string | null } | { kind: "sent"; to: string; hours: string | null } | { kind: "centres"; first: string | null };
type Msg = { id: number; who: "kaju" | "me"; text: string; voice?: string; card?: Card; tone?: "aid" | "urgent"; spoken?: boolean; tour?: string };
type Talk = { on: boolean; phase: "connecting" | "speaking" | "listening" | "idle" | "muted"; words: string; problem: VoiceProblem | null; started: number; ended: boolean; muted: boolean };
type Mode = "chat" | "call";
type Known = "when" | "area" | "animal" | "looks" | "place";
type Sent = { to: string; hours: string | null; time: string };

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
/** The words the guided demo offers with one click. */
export const BITE_EXAMPLE = "A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance.";
export const LOOKS_EXAMPLE = "Brown dog, no collar, usually near the bus stop on 100 Feet Road";
const dayWord = (iso: string) => iso === today() ? "Today" : iso === daysAgo(1) ? "Yesterday" : new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const WHO: Record<string, string> = { self: "You", someone: "Someone else", child: "A child" };
const KIND: Record<string, string> = { bite: "A bite", scratch: "A scratch", lick_broken_skin: "A lick on broken skin" };
const EMPTY: Form = { on: today(), area: "", place: "", species: "dog", animal: "", phone: "" };
/* The questions, in the order Kaju asks them, and what Kaju says again when an answer is not clear. */
const QUESTION: Record<"when" | "area" | "animal" | "looks" | "place" | "call", string> = {
  when: "When did it happen?", area: "Which area was it in?", animal: "What animal was it?",
  looks: "What did the animal look like? Its colour, size, a collar, any marks.", place: "Where is it usually seen? A landmark or a street.",
  call: "May the clinic call you about this?",
};
const ASK: Partial<Record<At, string>> = {
  tell: "Tell me what happened.", danger: "Is any of this true? Say yes or no.", urgent: "Shall I tell the clinic you are coming? Say yes or no.",
  notify: "Shall I tell the clinic you are coming? Say yes or no.", when: "Say today, yesterday, or earlier.", area: "Say the name of the area.",
  animal: "Say dog, cat, monkey, or another animal.", looks: "Describe the animal: its colour, size, a collar.", place: "Say a landmark or a street, or say skip.",
  call: "May the clinic call you? Say yes or no.", phone: "Say your phone number.", review: "Say send, or start again.",
};
const OPENING: Msg[] = [
  { id: 1, who: "kaju", text: "Hello, I'm Kaju. I can help you get care after an animal bite or scratch, and let the clinic know you're coming.", voice: "Hello, I'm Kaju. I can help you get care after an animal bite or scratch, and let the clinic know you are coming." },
  { id: 2, who: "kaju", tone: "aid", text: "First, wash the wound with soap and running water for at least 15 minutes.", voice: "First, wash the wound with soap and running water, for at least fifteen minutes." },
  { id: 3, who: "kaju", text: "What happened? Tell me in your own words." },
];

export function BiteHelp({ slug }: { slug: string | null }) {
  const pub = useRead<Pub>(() => (slug ? call<Pub>("oh_public_services", { p_programme_slug: slug }) : Promise.resolve({ data: null, error: null })), `pub:${slug}`);
  const areas = pub.data?.programme?.areas ?? [];
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? null;
  const ready = !slug || !!pub.data || !!pub.error;

  const [mode, setMode] = useState<Mode>("chat");
  const [at, setAt] = useState<At>("tell");
  const [log, setLog] = useState<Msg[]>(OPENING);
  const [queue, setQueue] = useState<Msg[]>([]);
  const [f, setF] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState<BiteDraft | null>(null);
  const [danger, setDanger] = useState<"none" | "yes" | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [reached, setReached] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [talk, setTalk] = useState<Talk>({ on: false, phase: "idle", words: "", problem: null, started: 0, ended: false, muted: false });
  const [again, setAgain] = useState(0);
  const known = useRef<Set<Known>>(new Set());
  const nextId = useRef(10), spoken = useRef(false), heardTo = useRef(0), skipSay = useRef(false), finish = useRef<(() => void) | null>(null);
  const reach = (m: string) => setReached((r) => (r.includes(m) ? r : [...r, m]));
  const instant = mode === "call" || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* The person's message shows at once; Kaju's follow, one at a time, after a short "typing" pause in the chat. */
  const say = (me: string | null, ...bots: Omit<Msg, "id" | "who">[]) => {
    const sp = spoken.current; spoken.current = false;
    if (me) setLog((l) => [...l, { id: nextId.current++, who: "me", text: me, spoken: sp }]);
    if (bots.length) setQueue((q) => [...q, ...bots.map((b) => ({ ...b, id: nextId.current++, who: "kaju" as const }))]);
  };
  useEffect(() => {
    if (!queue.length) return;
    const m = queue[0];
    const t = window.setTimeout(() => { setLog((l) => [...l, m]); setQueue((q) => q.slice(1)); }, instant ? 0 : Math.min(1000, 360 + m.text.length * 5));
    return () => window.clearTimeout(t);
  }, [queue, instant]);
  const typing = queue.length > 0;

  /* ── The conversation ── */
  const understood = (d: BiteDraft) => {
    const bits = [d.kind === "scratch" ? "a scratch" : d.kind === "lick_broken_skin" ? "a lick on broken skin" : "a bite",
      d.species ? `by ${d.ownership === "community" ? "a street" : d.ownership === "owned" ? "someone's" : "a"} ${SPECIES[d.species].toLowerCase()}` : null,
      d.area ? `in ${d.area.name}` : null, d.on ? (d.when ?? dayWord(d.on).toLowerCase()) : null].filter(Boolean).join(", ");
    return `Thank you. I understood ${bits}.${d.wantsCare ? " You're looking for medical help." : ""}${d.signs.length ? ` You mentioned ${d.signs.join(", ")}.` : ""}`;
  };
  const tell = (words: string) => {
    const w = words.trim();
    if (!w) return;
    const d = readBite(w, areas);
    setDraft(d);
    setF((x) => ({ ...x, ...(d.on ? { on: d.on } : {}), ...(d.area ? { area: d.area.id } : {}), ...(d.species ? { species: d.species } : {}), ...(d.looks ? { animal: d.looks } : {}), ...(d.place ? { place: d.place } : {}) }));
    for (const [k, v] of [["when", d.on], ["area", d.area], ["animal", d.species], ["looks", d.looks], ["place", d.place]] as const) if (v) known.current.add(k);
    say(w, { text: understood(d), tour: "bite-understood" },
      { text: "One safety question. Is any of this true? Heavy bleeding or a deep wound. Several bites, or bites on the face, head, neck or hands. A young child, or someone unwell or unable to care for themselves.", voice: "One safety question. Is there heavy bleeding or a deep wound? Several bites, or a bite on the face, head, neck or hands? Or is it a young child, or someone unwell? Say yes or no.", card: { kind: "danger" } });
    reach("understood"); setAt("danger");
  };
  const urgent = (me: string) => {
    setDanger("yes");
    say(me, { tone: "urgent", card: { kind: "urgent" }, text: "Get emergency help now. Call 108 for an ambulance, or go to the nearest hospital emergency department.", voice: "Get emergency help now. Call 1 0 8 for an ambulance, or go to the nearest hospital emergency department." },
      { text: "The nearest anti-rabies centres, with what each has confirmed:", voice: "The nearest centres are on your screen.", card: { kind: "centres", first: null } },
      { text: "Shall I tell the nearest centre you're coming?", voice: "Shall I tell the nearest centre you are coming?" });
    reach("danger"); setAt("urgent");
  };
  const noDanger = (me: string) => {
    setDanger("none");
    say(me, { text: "Please see a doctor today, even if the wound looks small or the animal seemed healthy. The doctor decides on vaccination.", voice: "Please see a doctor today, even if the wound looks small. The doctor decides on vaccination." },
      { text: "I can tell the nearest anti-rabies centre you're coming, so they're ready for you. Shall I?", voice: "I can tell the nearest anti-rabies centre you are coming, so they are ready for you. Shall I?", tour: "bite-notify" });
    reach("danger"); setAt("notify");
  };
  const nextOf = (after: At): "when" | "area" | "animal" | "looks" | "place" | "call" => {
    const order = ["when", "area", "animal", "looks", "place", "call"] as const;
    const from = (order as readonly string[]).indexOf(after);
    for (const s of order.slice(from + 1)) if (s === "call" || !known.current.has(s)) return s;
    return "call";
  };
  const askNext = (after: At, me: string | null, pre?: string) => {
    const n = nextOf(after);
    say(me, ...(pre ? [{ text: pre }] : []), { text: QUESTION[n], tour: "bite-ask" });
    setAt(n);
  };
  const notify = (me: string) => { reach("ask"); askNext("notify", me, "A few details for the clinic and the animal team."); };
  const centresOnly = (me: string) => { say(me, { text: "The nearest anti-rabies centres, with what each has confirmed:", voice: "The nearest centres are on your screen, with what each has confirmed.", card: { kind: "centres", first: null } }, { text: "Take care, and please see a doctor today." }); setAt("closed"); };
  const whatNot = (me: string) => say(me, { text: "Please don't put chilli, turmeric, oil, lime or any home remedy on the wound, don't wait to see whether the animal becomes ill, and don't try to catch or hurt it." });
  const onWhen = (iso: string, me: string) => { setF((x) => ({ ...x, on: iso })); known.current.add("when"); askNext("when", me); };
  const onArea = (a: { id: string; name: string } | null, me: string) => { if (a) setF((x) => ({ ...x, area: a.id })); known.current.add("area"); askNext("area", me); };
  const onAnimal = (k: string, me: string) => { setF((x) => ({ ...x, species: k })); known.current.add("animal"); askNext("animal", me); };
  const onLooks = (v: string) => {
    /* A landmark said with the description ("…near the bus stop") answers the next question too. */
    const p = v ? readBite(v, areas).place : null;
    setF((x) => ({ ...x, animal: v, ...(p && !x.place ? { place: p } : {}) })); known.current.add("looks"); if (p) known.current.add("place");
    askNext("looks", v || "Skip");
  };
  const onPlace = (v: string) => { setF((x) => ({ ...x, place: v })); known.current.add("place"); askNext("place", v || "Skip"); };
  const review = (me: string, phone: string | null) => {
    const next = { ...f, phone: phone ?? "" };
    setF(next);
    say(me, { text: "Here is your report.", voice: `Here is your report. ${dayWord(next.on)}${draft?.when ? `, ${draft.when}` : ""}. ${areaName(next.area) ?? "Area not given"}${next.place ? `, ${next.place}` : ""}. ${SPECIES[next.species] ?? "An animal"}${next.animal ? `: ${next.animal}` : ""}.`, card: { kind: "review", f: next, area: areaName(next.area), when: draft?.when ?? null } },
      { text: "Shall I send it to the nearest anti-rabies centre? Your name isn't asked for.", voice: "Shall I send it to the nearest anti-rabies centre? Say send, or start again." });
    reach("review"); setAt("review");
  };
  const callMe = (me: string) => { say(me, { text: "What number should they call?" }); setAt("phone"); };
  const restart = (me = "Start again") => {
    setDraft(null); setDanger(null); known.current = new Set(); setF(EMPTY); setSent(null);
    say(me, { text: "What happened? Tell me in your own words." }); setAt("tell");
  };
  const send = async () => {
    setAt("sending"); setErr(null);
    say("Send the report");
    const phone = f.phone.trim() || null;
    const r = await call<{ facility: { name: string; hours: string | null } | null }>("oh_submit_bite_notice", { p_programme_slug: slug, p_happened_on: f.on, p_area: f.area || null, p_place: f.place || null, p_species: f.species, p_animal_description: f.animal || null, p_phone: phone, p_consent: !!phone, p_lat: null, p_lng: null });
    if (r.error) { setErr(r.error); setAt("review"); return; }
    const to = r.data?.facility ?? { name: "the programme", hours: null };
    setSent({ to: to.name, hours: to.hours, time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) });
    say(null,
      { card: { kind: "sent", to: to.name, hours: to.hours }, text: `Sent to ${to.name}. They know you're coming.`, voice: `Sent to ${to.name}. They know you are coming.${to.hours ? ` They are open ${to.hours.toLowerCase()}.` : ""}` },
      { text: "When the clinic records your visit, the animal team for your area is asked to find and observe the dog." },
      { text: "Where to go today:", voice: "This is not an appointment. Please see a doctor today.", card: { kind: "centres", first: to.name } });
    reach("sent"); setAt("done");
  };

  /** A typed or spoken answer, read as the matching button. */
  const interpret = (a: At, t: string): "next" | "unclear" => {
    const yn = yesNo(t);
    switch (a) {
      case "tell": if (t.trim().split(/\s+/).length < 3) return "unclear"; tell(t); return "next";
      case "danger": if (yn === "yes") { urgent(t); return "next"; } if (yn === "no") { noDanger(t); return "next"; } return "unclear";
      case "urgent": case "notify":
        if (/\b(not do|shouldn'?t|should not|avoid)\b/i.test(t)) { whatNot(t); return "next"; }
        if (yn === "yes" || /\b(tell|send|inform|let them know)\b/i.test(t)) { notify(t); return "next"; }
        if (yn === "no" || /\b(where|centres?|centers?|hospital|just show)\b/i.test(t)) { centresOnly(t); return "next"; }
        return "unclear";
      case "when": { const w = whenWord(t); if (w === "today") { onWhen(today(), t); return "next"; } if (w === "yesterday") { onWhen(daysAgo(1), t); return "next"; } if (w === "earlier") { say(t, { text: "Please choose the date." }); setAt("date"); return "next"; } return "unclear"; }
      case "area": { const hit = readBite(t, areas).area; if (hit) { onArea(hit, t); return "next"; } if (/\b(not sure|don'?t know|no idea|skip)\b/i.test(t)) { onArea(null, t); return "next"; } return "unclear"; }
      case "animal": { const sp = readBite(t, areas).species; if (sp) { onAnimal(sp, t); return "next"; } return "unclear"; }
      case "looks": onLooks(/^\s*(skip|nothing|don'?t know)\b/i.test(t) ? "" : t); return "next";
      case "place": onPlace(/^\s*(skip|nothing|don'?t know)\b/i.test(t) ? "" : t); return "next";
      case "call": if (yn === "yes") { callMe(t); return "next"; } if (yn === "no") { review(t, null); return "next"; } return "unclear";
      case "phone": { const d = digits(t); if (d.length >= 8 && d.length <= 13) { review(t, d); return "next"; } return "unclear"; }
      case "review": if (/\b(start again|restart|start over|change|wrong)\b/i.test(t)) { restart(t); return "next"; } if (yn === "yes" || /\bsend\b/i.test(t)) { void send(); return "next"; } return "unclear";
      default: return "unclear";
    }
  };
  const typed = (t: string) => {
    const w = t.trim();
    if (!w || typing || at === "sending") return;
    if (interpret(at, w) === "unclear") say(w, { text: at === "tell" ? "Tell me a little more: what happened, where and when?" : "Sorry, I didn't catch that. Choose one of the answers below, or say it another way." });
  };

  /* The answers to tap, the same in the chat and on the call. */
  const quick: [string, () => void, string?][] =
    at === "danger" ? [["Yes", () => urgent("Yes")], ["No, none of these", () => noDanger("No, none of these")]] :
    at === "urgent" ? [["Yes, tell the clinic", () => notify("Yes, tell the clinic"), "is-go"]] :
    at === "notify" ? [["Yes, tell the clinic", () => notify("Yes, tell the clinic"), "is-go"], ["No, just show me where to go", () => centresOnly("No, just show me where to go")], ["What should I not do?", () => whatNot("What should I not do?")]] :
    at === "when" ? [["Today", () => onWhen(today(), "Today")], ["Yesterday", () => onWhen(daysAgo(1), "Yesterday")], ["Earlier", () => { say("Earlier", { text: "Please choose the date." }); setAt("date"); }]] :
    at === "area" ? [...areas.map((a): [string, () => void] => [a.name, () => onArea(a, a.name)]), ["Not sure", () => onArea(null, "Not sure")]] :
    at === "animal" ? Object.entries(SPECIES).map(([k, v]): [string, () => void] => [v, () => onAnimal(k, v)]) :
    at === "looks" ? [["Skip", () => onLooks("")]] :
    at === "place" ? [["Skip", () => onPlace("")]] :
    at === "call" ? [["Yes, call me", () => callMe("Yes, call me")], ["No, don't call me", () => review("No, don't call me", null)]] :
    at === "review" ? [["Send the report", () => void send(), "is-go"], ["Start again", () => restart()]] :
    at === "done" || at === "closed" ? [["Start a new report", () => restart("Start a new report")]] : [];

  /* ── The call: each new message from Kaju said aloud, then one answer heard and read like a tap. ── */
  const startCall = async () => {
    setMode("call");
    const lastMe = [...log].reverse().find((m) => m.who === "me");
    heardTo.current = lastMe ? lastMe.id : 0;
    setTalk({ on: false, phase: "connecting", words: "", problem: null, started: Date.now(), ended: false, muted: false });
    const p = await checkMic();
    if (p) { setTalk((t) => ({ ...t, on: false, phase: "idle", problem: p })); return; }
    setTalk((t) => ({ ...t, on: true, phase: "connecting", started: Date.now() }));
  };
  const endCall = (problem: VoiceProblem | null = null) => { finish.current = null; try { window.speechSynthesis?.cancel(); } catch { /* fine */ } setTalk((t) => ({ ...t, on: false, phase: "idle", words: "", problem, ended: true })); };
  useEffect(() => {
    if (!talk.on || typing) return;
    const ctl = new AbortController(), sig = ctl.signal;
    const set = (x: Partial<Talk>) => { if (!sig.aborted) setTalk((t) => (t.on ? { ...t, ...x } : t)); };
    (async () => {
      const fresh = log.filter((m) => m.who === "kaju" && m.id > heardTo.current);
      if (log.length) heardTo.current = Math.max(heardTo.current, log[log.length - 1].id);
      let line: string | null = skipSay.current ? null : fresh.map((m) => m.voice ?? m.text).join(" ");
      skipSay.current = false;
      let tries = 0;
      while (!sig.aborted) {
        if (line && canSpeak()) { set({ phase: "speaking", words: "" }); await speak(line, sig); }
        if (sig.aborted) return;
        if (at === "done" || at === "closed") { endCall(); return; }
        if (!ASK[at]) { set({ phase: "idle" }); return; }
        if (talk.muted) { set({ phase: "muted" }); return; }
        set({ phase: "listening", words: "", problem: null });
        const h = await listen((w) => set({ words: w }), sig, finish);
        if (sig.aborted) return;
        if ("error" in h) {
          if (h.error === "no-speech" && tries++ < 1) { line = `Sorry, I didn't hear you. ${ASK[at]}`; continue; }
          if (h.error === "denied" || h.error === "unsupported" || h.error === "no-mic") { endCall(h.error); return; }
          set({ phase: "idle", problem: h.error }); return;
        }
        set({ words: h.text });
        spoken.current = true;
        const r = interpret(at, h.text);
        spoken.current = false;
        if (r === "next") return;
        if (tries++ < 2) { line = `Sorry, I didn't catch that. ${ASK[at]}`; continue; }
        set({ phase: "idle" }); return;
      }
    })();
    return () => ctl.abort();
  }, [talk.on, talk.muted, at, again, typing, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const answerNow = () => { skipSay.current = true; setTalk((t) => ({ ...t, problem: null, muted: false })); setAgain((n) => n + 1); };

  const pick = (m: Mode) => { if (m === mode) return; if (m === "chat" && talk.on) endCall(); setMode(m); };
  const view = { at, quick, typing, log, err, ready, slug };
  return (
    <div className="kb" data-at={at} data-mode={mode} data-reached={reached.join(" ")} data-sent-to={sent?.to}>
      <header className="kb-top">
        <Link href="/" className="kb-brand" aria-label="StrayPaw home"><img src="/icon-192.png" alt="" width={28} height={28} /><span>StrayPaw</span></Link>
        <span className="kb-app"><b>Kaju</b><span>Help after an animal bite</span></span>
        {pub.data?.programme?.illustrative ? <span className="kb-demo">Demonstration · fictional records</span> : null}
        <a className="kb-108" href="tel:108" aria-label="Emergency: call 108"><Phone size={14} aria-hidden /><span>Emergency</span> <b>108</b></a>
      </header>
      <main id="main" className="kb-main">
        <div className="kb-head">
          <div>
            <h1>Bitten or scratched by an animal?</h1>
            <p>Kaju helps you get care today and tells the nearest anti-rabies centre you&apos;re coming. Chat, or call and talk.</p>
          </div>
          <div className="kb-modes" role="tablist" aria-label="How to talk to Kaju">
            <button type="button" role="tab" aria-selected={mode === "chat"} className={mode === "chat" ? "is-on" : undefined} onClick={() => pick("chat")} data-tour="mode-chat"><MessageCircle size={16} aria-hidden /> Chat</button>
            <button type="button" role="tab" aria-selected={mode === "call"} className={mode === "call" ? "is-on" : undefined} onClick={() => pick("call")} data-tour="mode-call"><Phone size={16} aria-hidden /> Call</button>
          </div>
        </div>
        <div className="kb-grid">
          {mode === "chat"
            ? <ChatView {...view} onSend={typed} example={at === "tell" ? BITE_EXAMPLE : at === "looks" ? LOOKS_EXAMPLE : null} onDate={(iso) => { setF((x) => ({ ...x, on: iso })); known.current.add("when"); askNext("when", dayWord(iso)); }} />
            : <CallView {...view} talk={talk} sent={sent} onStart={() => void startCall()} onEnd={() => endCall()} onMute={() => setTalk((t) => ({ ...t, muted: !t.muted }))} onAnswer={answerNow} onDone={() => finish.current?.()} onChat={() => pick("chat")} />}
          <Report draft={draft} f={f} at={at} danger={danger} areaName={areaName(f.area)} sent={sent} known={known.current} />
        </div>
        <p className="kb-foot">Prototype for the Bengaluru One Health pilot, awaiting clinical review. First aid follows WHO rabies guidance and India&apos;s National Rabies Control Programme; the first aid, the safety question and the advice are fixed steps. Kaju reads your words with fixed rules on this device: no AI model reads them, and nothing here assesses a wound or recommends treatment.</p>
      </main>
    </div>
  );
}

type View = { at: At; quick: [string, () => void, string?][]; typing: boolean; log: Msg[]; err: string | null; ready: boolean; slug: string | null };

function Quick({ quick, typing }: { quick: View["quick"]; typing: boolean }) {
  if (!quick.length || typing) return null;
  return <div className="kb-quick" data-tour="bite-quick">{quick.map(([l, go, cls]) => <button key={l} type="button" className={cls} onClick={go}>{l === "Send the report" ? <Check size={16} aria-hidden /> : null}{l}</button>)}</div>;
}

/* ── The chat ── */
function ChatView({ at, quick, typing, log, err, ready, slug, onSend, example, onDate }: View & { onSend: (t: string) => void; example: string | null; onDate: (iso: string) => void }) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(today());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [log.length, typing, at]);
  const submit = () => { if (!text.trim() || !ready) return; onSend(text); setText(""); };
  const tel = at === "phone";
  const hint = at === "tell" ? "Describe what happened…" : at === "looks" ? "Colour, size, collar, marks…" : at === "place" ? "A landmark or street…" : tel ? "Phone number" : "Type a reply…";
  const closed = at === "sending" || at === "done" || at === "closed";
  return (
    <section className="kc" aria-label="Chat with Kaju">
      <div className="kc-head">
        <span className="kc-ava" aria-hidden><Kaju state={typing ? "thinking" : at === "done" ? "success" : "sitting"} size={44} still /></span>
        <span className="kc-who"><b>Kaju</b><small>{typing ? "typing…" : "StrayPaw's assistant"}</small></span>
      </div>
      <div className="kc-log" ref={box} aria-live="polite">
        <ol>{log.map((m) => <Bubble key={m.id} m={m} slug={slug} />)}</ol>
        {typing ? <p className="kc-typing" aria-label="Kaju is typing"><i /><i /><i /></p> : null}
      </div>
      {err ? <p className="kb-err" role="alert">{err}</p> : null}
      <div className="kc-foot">
        <Quick quick={quick} typing={typing} />
        {at === "date" ? <form className="kb-quick" data-tour="bite-quick" onSubmit={(e) => { e.preventDefault(); onDate(date); }}><input type="date" aria-label="The date it happened" value={date} min={daysAgo(30)} max={today()} onChange={(e) => setDate(e.target.value)} /><button type="submit" className="is-go">Use this date</button></form> : null}
        {closed ? null : <form className="kc-compose" data-tour="bite-compose" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {example && !typing ? <button type="button" className="kc-ex" onClick={() => setText(example)} title="Fill in an example"><Wand2 size={14} aria-hidden /> Example</button> : null}
          <textarea aria-label="Message Kaju" rows={1} value={text} maxLength={600} placeholder={hint} inputMode={tel ? "tel" : undefined}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
          <button type="submit" className="kc-send" aria-label="Send to Kaju" disabled={!text.trim() || !ready}><Send size={18} aria-hidden /></button>
        </form>}
      </div>
    </section>
  );
}

function Bubble({ m, slug }: { m: Msg; slug: string | null }) {
  const c = m.card;
  return (
    <li className={`kc-m is-${m.who}${m.tone ? ` is-${m.tone}` : ""}${c ? ` has-${c.kind}` : ""}`} data-tour={m.tour}>
      {m.spoken ? <Mic size={13} aria-label="Said aloud" className="kc-said" /> : null}
      {!c ? (m.tone === "aid" ? <><b>First, wash the wound</b> with soap and running water for at least 15 minutes.</> : m.text)
        : c.kind === "danger" ? <><b>One safety question.</b> Is any of this true?<ul><li>Heavy bleeding, or a deep wound</li><li>Several bites, or bites on the face, head, neck or hands</li><li>A young child, or someone unwell or unable to care for themselves</li></ul></>
        : c.kind === "urgent" ? <><b>Get emergency help now.</b> Call <a href="tel:108">108</a> for an ambulance, or go to the nearest hospital emergency department.</>
        : c.kind === "review" ? <ReviewCard c={c} />
        : c.kind === "sent" ? <span className="kc-sent" data-tour="bite-sent"><span className="kc-ok" aria-hidden><Check size={14} strokeWidth={3} /></span><span><b>Sent to {c.to}.</b> They know you&apos;re coming.{c.hours ? ` Open ${c.hours.toLowerCase()}.` : ""}</span></span>
        : <>{m.text}{slug ? <Centres slug={slug} first={c.first} /> : <p>Go to the nearest government hospital.</p>}</>}
    </li>
  );
}

function ReviewCard({ c }: { c: Extract<Card, { kind: "review" }> }) {
  const { f } = c;
  return (
    <div className="kc-card" data-tour="bite-review">
      <p className="kc-card-h">Your report</p>
      <dl>
        <div><dt>When</dt><dd>{dayWord(f.on)}{c.when ? ` (${c.when})` : ""}</dd></div>
        <div><dt>Area</dt><dd>{c.area ?? "Not given"}</dd></div>
        {f.place ? <div><dt>Where</dt><dd>{f.place}</dd></div> : null}
        <div><dt>Animal</dt><dd>{SPECIES[f.species] ?? f.species}</dd></div>
        <div><dt>Looked like</dt><dd>{f.animal || "Not given"}</dd></div>
        <div><dt>Call back</dt><dd>{f.phone ? `Yes, on ${f.phone}` : "No"}</dd></div>
      </dl>
    </div>
  );
}

/* ── The call ── */
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function CallView({ at, quick, typing, log, err, ready, slug, talk, sent, onStart, onEnd, onMute, onAnswer, onDone, onChat }: View & { talk: Talk; sent: Sent | null; onStart: () => void; onEnd: () => void; onMute: () => void; onAnswer: () => void; onDone: () => void; onChat: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [endedAt, setEndedAt] = useState(0);
  useEffect(() => { if (!talk.on) return; const id = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(id); }, [talk.on]);
  useEffect(() => { if (talk.ended) setEndedAt(Date.now()); }, [talk.ended]);
  const live = talk.on || talk.phase === "connecting";
  const lastKaju = [...log].reverse().find((m) => m.who === "kaju");
  const pose: KajuState = talk.problem ? "concerned" : !live ? (sent ? "success" : talk.ended ? "goodbye" : "sitting") : talk.phase === "speaking" ? "explaining" : talk.phase === "listening" ? "listening" : talk.phase === "connecting" ? "looking" : "headTilt";
  const status = talk.phase === "connecting" ? "Connecting…" : talk.phase === "speaking" ? "Kaju is speaking" : talk.phase === "listening" ? "Listening…" : talk.phase === "muted" ? "Microphone off" : "Your turn";
  const caption = talk.phase === "listening" || (talk.words && talk.phase !== "speaking") ? (talk.words ? `“${talk.words}”` : ASK[at] ?? "") : lastKaju?.text ?? "";
  return (
    <section className={`kv${live ? " is-live" : ""} is-${talk.phase}${sent && slug && !live ? " has-centres" : ""}`} aria-label="Call Kaju">
      <div className="kv-head">
        <span className="kv-who"><i className={live ? "is-on" : undefined} aria-hidden /> Kaju helpline</span>
        <span className="kv-time">{live ? clock(now - talk.started) : talk.ended ? `Call ended · ${clock(endedAt - talk.started)}` : "Bite and scratch help"}</span>
      </div>
      <div className="kv-stage">
        <div className="kv-kaju" aria-hidden><span className="kv-ring" /><span className="kv-ring" /><Kaju state={pose} size={176} /></div>
        {live ? <>
          <p className="kv-status" role="status">{status}</p>
          <p className="kv-caption" aria-live="polite">{caption}</p>
        </> : talk.ended || talk.problem ? <>
          <p className="kv-status">{talk.problem ? "The call could not continue" : sent ? "Report sent" : "Call ended"}</p>
          <p className="kv-caption">{talk.problem ? problemText(talk.problem) : sent ? `Sent to ${sent.to} at ${sent.time}. They know you're coming.` : "You can call again, or carry on in the chat."}</p>
        </> : <>
          <p className="kv-status">Talk to Kaju</p>
          <p className="kv-caption">Kaju asks what happened, checks for danger signs and tells the clinic you&apos;re coming. Just talk, as on a phone call.</p>
        </>}
      </div>
      {err ? <p className="kb-err" role="alert">{err}</p> : null}
      {live ? <Quick quick={quick} typing={typing} /> : null}
      {sent && slug && !live ? <div className="kv-centres"><Centres slug={slug} first={sent.to} /></div> : null}
      <div className="kv-controls">
        {live ? <>
          <button type="button" className="kv-btn" onClick={onMute} aria-pressed={talk.muted}>{talk.muted ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}<span>{talk.muted ? "Unmute" : "Mute"}</span></button>
          <button type="button" className="kv-end" onClick={onEnd} aria-label="End call"><PhoneOff size={24} aria-hidden /></button>
          {talk.phase === "listening" ? <button type="button" className="kv-btn" onClick={onDone}><Check size={20} aria-hidden /><span>Done</span></button>
            : <button type="button" className="kv-btn" onClick={onAnswer} disabled={talk.phase === "speaking" || talk.phase === "connecting"}><Mic size={20} aria-hidden /><span>Answer</span></button>}
        </> : <div className="kv-start">
          <button type="button" className="kv-call" onClick={onStart} disabled={!ready} data-tour="bite-call"><Phone size={22} aria-hidden /> {ready ? (talk.ended ? "Call again" : "Call Kaju") : "One moment…"}</button>
          {talk.ended || talk.problem ? <button type="button" className="kv-link" onClick={onChat}>Continue in the chat</button> : null}
        </div>}
      </div>
      <p className="kv-note">A public Kaju helpline number comes with the pilot. In this demo the call runs in your browser, with its own speech recognition and voice (English for now): allow the microphone when asked.</p>
    </section>
  );
}

/* The report Kaju is preparing, filled in as the person speaks or types. */
function Report({ draft, f, at, danger, areaName, sent, known }: { draft: BiteDraft | null; f: Form; at: At; danger: "none" | "yes" | null; areaName: string | null; sent: Sent | null; known: Set<Known> }) {
  const started = !!draft;
  const rows: [string, string | null][] = [
    ["What happened", draft?.kind ? KIND[draft.kind] : started ? "Not said" : null],
    ["Animal", known.has("animal") ? `${SPECIES[f.species] ?? f.species}${draft?.ownership === "community" ? ", street or community" : draft?.ownership === "owned" ? ", someone's pet" : ""}` : null],
    ["Area", areaName ?? (known.has("area") ? "Not sure" : null)],
    ["When", known.has("when") ? `${dayWord(f.on)}${draft?.when ? ` (${draft.when})` : ""}` : null],
    ["Who was hurt", draft?.person ? WHO[draft.person] : null],
    ["Danger signs", danger === "none" ? "None of the listed signs" : danger === "yes" ? "Yes: emergency help advised" : null],
    ["Looked like", f.animal || (known.has("looks") ? "Not given" : null)],
    ["Where it is seen", f.place || (known.has("place") ? "Not given" : null)],
    ["Call back", at === "review" || sent ? (f.phone ? `Yes, on ${f.phone}` : "No") : null],
  ];
  const status = sent ? `Sent to ${sent.to}, ${sent.time}` : at === "review" ? "Ready: waiting for your OK to send" : started ? "Filling in from what you said" : "Starts when you tell Kaju what happened";
  return (
    <aside className={`kb-report${sent ? " is-sent" : at === "review" ? " is-ready" : ""}`} aria-label="The report Kaju is preparing" data-tour="bite-report">
      <p className="kb-r-h"><b>Kaju&apos;s report</b><span>{rows.filter(([, v]) => v).length} of {rows.length}</span></p>
      <p className="kb-r-s" role="status">{sent ? <Check size={14} strokeWidth={3} aria-hidden /> : null}{status}</p>
      <dl>{rows.map(([k, v]) => <div key={k} className={v ? "is-in" : undefined}><dt>{k}</dt><dd>{v ?? "—"}</dd></div>)}</dl>
      <p className="kb-r-n">Read on this device by fixed rules; no AI model reads your words. Nothing is sent until you confirm, and your name is not asked for.</p>
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
      {pub.data.programme.illustrative ? <p className="kb-fict" role="note">Demonstration: these centres are invented. Do not travel to them.</p> : null}
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
