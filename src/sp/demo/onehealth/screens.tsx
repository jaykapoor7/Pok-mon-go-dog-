"use client";

/* The six screens of the One Health demo, each a picture of the real StrayPaw workspace for that role, moved on
   step by step (`b`). Every record is illustrative. Anything not in StrayPaw today carries the dashed "Proposed"
   mark. Copy follows the product's own rules: categories and dose dates are the clinician's, partners see no
   patient details, small counts are hidden, Kaju prepares and people confirm. */

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Activity, AlertTriangle, BarChart3, Building2, Camera, CheckCircle2, ClipboardList, FileCheck2, FlaskConical, FolderKanban,
  Handshake, Home, Inbox, LayoutGrid, Lock, MapPin, Mic, PawPrint, Phone, Radar, Route, ShieldCheck, Sparkles, Stethoscope, Syringe, Users,
} from "lucide-react";
import { AvailTag, Chip, Frame, Head, KajuCard, Props, hl, useReveal, type NavI, type Place } from "./parts";
import { CASE, type ChapterId } from "./story";

type S = { b: number; k: string };

/* ── 1. Citizen: a call with Kaju in Kannada ─────────────────────────────────────────────── */

type Line = { who: "kaju" | "me"; kn: string; en: string; at: number; ms?: number; secs?: number; extra?: ReactNode };
const CENTRE = (
  <div className="ohd-centre">
    <p><MapPin size={14} aria-hidden /><b lang="kn">ಬೋಧನಾ ಆಸ್ಪತ್ರೆ ರೇಬೀಸ್ ನಿರೋಧಕ ಚಿಕಿತ್ಸಾಲಯ</b></p>
    <p className="ohd-centre-en">{CASE.clinic} · 2.1 km · open 24 hours</p>
    <p className="ohd-centre-s"><span><CheckCircle2 size={12} aria-hidden />Vaccine</span><span><CheckCircle2 size={12} aria-hidden />Immunoglobulin</span><small>confirmed today 07:30</small></p>
  </div>
);
const CALL: Line[] = [
  { who: "kaju", at: 0, kn: "ನಮಸ್ಕಾರ, ನಾನು ಕಾಜು. ಏನಾಯಿತು ಎಂದು ಹೇಳಿ.", en: "Hello, I'm Kaju. Tell me what happened." },
  { who: "me", at: 0, ms: 1600, secs: 7, kn: "ಜಯನಗರ 4ನೇ ಬ್ಲಾಕ್ ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಒಂದು ನಾಯಿ ನನ್ನ ಕೈಗೆ ಕಚ್ಚಿತು. ರಕ್ತ ಬರುತ್ತಿದೆ.", en: "A dog bit my hand near the Jayanagar 4th Block bus stop. It's bleeding." },
  { who: "kaju", at: 1, kn: "ಈಗಲೇ ಗಾಯವನ್ನು ಸೋಪು ಮತ್ತು ಹರಿಯುವ ನೀರಿನಿಂದ 15 ನಿಮಿಷ ತೊಳೆಯಿರಿ. ಗಾಯ ಆಳವಾಗಿದೆಯೇ, ಅಥವಾ ಮುಖ, ತಲೆ, ಕುತ್ತಿಗೆ ಅಥವಾ ಕೈಗೆ ಕಚ್ಚಿದೆಯೇ?", en: "Wash the wound now with soap and running water for 15 minutes. Is the wound deep, or is the bite on the face, head, neck or hands?" },
  { who: "me", at: 2, secs: 3, kn: "ಹೌದು, ಕೈಗೆ. ಸ್ವಲ್ಪ ಆಳವಾಗಿದೆ.", en: "Yes, on my hand. It's a little deep." },
  { who: "kaju", at: 2, ms: 1400, kn: "ಈಗಲೇ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ. ಲಸಿಕೆ ಮತ್ತು ಇಮ್ಯುನೋಗ್ಲೋಬ್ಯುಲಿನ್ ಇರುವ ಹತ್ತಿರದ ಕೇಂದ್ರ ಇದು. ರಕ್ತ ನಿಲ್ಲದಿದ್ದರೆ 108ಕ್ಕೆ ಕರೆ ಮಾಡಿ.", en: "See a doctor now. This is the nearest centre with vaccine and immunoglobulin. If the bleeding does not stop, call 108.", extra: CENTRE },
  { who: "kaju", at: 3, kn: "ನೀವು ಬರುವ ಮೊದಲು ನಿಮ್ಮ ವರದಿಯನ್ನು ಆಸ್ಪತ್ರೆಗೆ ಕಳುಹಿಸಲೇ? ಡೋಸ್ ನೆನಪಿಸಲು ಅವರು ನಿಮಗೆ ಕರೆ ಮಾಡಬಹುದೇ?", en: "Shall I send your report to the hospital before you arrive? May they call you to remind you of doses?" },
  { who: "me", at: 3, ms: 1800, secs: 6, kn: "ಹೌದು, ಎರಡಕ್ಕೂ ಸರಿ. ನಾಯಿ ಕಂದು ಬಣ್ಣದ್ದು, ಕೊರಳಪಟ್ಟಿ ಇಲ್ಲ. ಯಾವಾಗಲೂ ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ ಇರುತ್ತದೆ.", en: "Yes to both. The dog is brown, no collar. It's always near the bus stop." },
  { who: "kaju", at: 3, ms: 3800, kn: "ಕಳುಹಿಸಲಾಗಿದೆ. ಇದು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅಲ್ಲ, ದಯವಿಟ್ಟು ಈಗಲೇ ಹೋಗಿ. ನಾಯಿಯನ್ನು ಹಿಡಿಯಲು ಅಥವಾ ಓಡಿಸಲು ಪ್ರಯತ್ನಿಸಬೇಡಿ.", en: "Sent. This is not an appointment, so please go now. Do not try to catch or chase the dog." },
];

const RULES: { at: number[]; t: string; d: string }[] = [
  { at: [0], t: "Her language", d: "Kannada, English or Hindi. Kaju follows if she switches." },
  { at: [1], t: "First aid", d: "Fixed steps from WHO and national rabies guidance, reviewed by clinicians. Never generated." },
  { at: [2], t: "Danger signs", d: "One fixed question. Any yes: go now, or call 108. Kaju does not judge the wound." },
  { at: [2], t: "Nearest centre", d: "Only centres that confirmed vaccine and immunoglobulin in the last 7 days." },
  { at: [3], t: "Her consent", d: "Nothing is sent, and no one calls her, unless she says yes." },
];

export function Citizen({ b, k }: S) {
  const show = useReveal(b, k);
  const log = useRef<HTMLOListElement>(null);
  const shown = CALL.filter((l) => show(l.at, l.ms ?? 0)).length;
  const speaking = CALL.some((l) => l.who === "me" && l.at === b && !show(l.at, l.ms ?? 0) && b < 4);
  useEffect(() => { const el = log.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [shown]);
  return (
    <div className="ohd-cit">
      <section className="ohd-phone" aria-label="Kaju Voice call in Kannada, illustrative">
        <div className="ohd-phone-top">
          <span className="ohd-kav" aria-hidden><Sparkles size={14} /></span>
          <span><b>Kaju</b><small><span lang="kn">ಕನ್ನಡ</span> · Kannada · voice</small></span>
          <span className="ohd-live"><i aria-hidden />{b >= 4 ? "Call ended · 3:17" : `On call · ${["0:12", "1:08", "2:41", "3:05"][b]}`}</span>
        </div>
        <ol className="ohd-call" ref={log} aria-live="off" tabIndex={0} aria-label="The call, in Kannada with English">
          {CALL.map((l, i) => show(l.at, l.ms ?? 0) ? (
            <li key={i} className={`ohd-msg is-${l.who}${l.at === b ? " is-new" : ""}`}>
              {l.who === "me" ? <span className="ohd-wave" aria-label={`Voice message, ${l.secs} seconds`}><Mic size={12} aria-hidden /><i /><i /><i /><i /><i /><i /><i /><small>0:0{l.secs}</small></span> : null}
              <p lang="kn" className="ohd-kn">{l.kn}</p>
              <p className="ohd-en">{l.en}</p>
              {l.extra}
            </li>
          ) : null)}
          {speaking ? <li className="ohd-msg is-me is-typing" aria-hidden><span className="ohd-wave is-live"><Mic size={12} /><i /><i /><i /><i /><i /><i /><i /></span></li> : null}
          {show(3, 4400) ? <li className="ohd-sent"><CheckCircle2 size={14} aria-hidden />Report sent to {CASE.clinic}</li> : null}
        </ol>
        <div className="ohd-phone-foot">
          <span className={`ohd-mic${speaking ? " is-on" : ""}`} aria-hidden><Mic size={20} /></span>
          <small>Illustrative call. <b>Proposed</b>: bite reports through Kaju.</small>
        </div>
      </section>

      <div className="ohd-cit-side" tabIndex={0} aria-label="How the call works">
        {b < 4 ? (
          <>
            <p className="ohd-side-k">How the call stays safe</p>
            <ul className="ohd-rules">
              {RULES.map((r) => <li key={r.t} className={hl(r.at.includes(b), r.at[0] > b ? "is-later" : "")}><b>{r.t}</b><span>{r.d}</span></li>)}
            </ul>
          </>
        ) : (
          <KajuCard title="Intake for the clinic, prepared by Kaju" s="proposed" className={hl(true)}>
            <p className="ohd-kcard-sub">From a Kannada call, {CASE.day}, 08:14 to 08:17. Sent with her consent.</p>
            <Props items={[
              ["What happened", <>Dog bite on the hand, bleeding, &ldquo;a little deep&rdquo; (her words)</>],
              ["When and where", <>About 08:10 · {CASE.area} {CASE.spot}</>],
              ["Danger signs she reported", <span key="d" className="ohd-chips"><Chip tone="bad">Bite on the hand</Chip><Chip tone="bad">Deep wound</Chip></span>],
              ["First aid", "Told to wash the wound for 15 minutes"],
              ["The dog", "Brown, no collar, usually at the bus stop"],
              ["Going to", CASE.clinic],
              ["Reminder calls", "Agreed"],
            ]} />
            <p className="ohd-ask-h"><AlertTriangle size={14} aria-hidden />Not covered by the call, for the clinician to ask</p>
            <ul className="ohd-ask"><li>Earlier rabies vaccination</li><li>Age</li><li>Whether she washed the wound</li></ul>
            <p className="ohd-fine">Her words in Kannada and the English translation travel with the report. Nothing here is a clinical assessment.</p>
          </KajuCard>
        )}
      </div>
    </div>
  );
}

/* ── 2. Hospital: the bite register, the record, the category, the course ─────────────────── */

const CLINIC: Place = { name: CASE.clinic, initials: "TH", kind: "Healthcare · Human" };
const HEALTH_NAV: NavI[] = [
  { label: "Today", icon: Home }, { label: "Bite cases", icon: ClipboardList, n: 1 }, { label: "PEP", icon: Syringe },
  { label: "Referrals", icon: Route }, { label: "Facilities", icon: Building2 }, { label: "Surveillance", icon: Activity },
];
const BITE_ROWS: { code: string; ref: string; cat: string; tone: "warn" | "bad" | "accent"; sp: string; area: string; course: string; ctone: "warn" | "accent" | "ok" | "bad"; next: string; late?: boolean }[] = [
  { code: "BX-2611-9C1D", ref: "OPD-ILL-0409 · 5–14", cat: "Category III", tone: "bad", sp: "Dog", area: "HSR Layout", course: "In course", ctone: "accent", next: "Today" },
  { code: "BX-2611-27E0", ref: "OPD-ILL-0398 · 30–49", cat: "Category II", tone: "accent", sp: "Dog", area: "BTM Layout", course: "In course", ctone: "accent", next: "Today" },
  { code: "BX-2611-B7A3", ref: "OPD-ILL-0391 · 50+", cat: "Category III", tone: "bad", sp: "Cat", area: "Koramangala", course: "In course", ctone: "accent", next: "Overdue 3 days", late: true },
  { code: "BX-2610-11F8", ref: "OPD-ILL-0350 · 15–29", cat: "Category II", tone: "accent", sp: "Dog", area: "Indiranagar", course: "Completed", ctone: "ok", next: "—" },
];
const DOSES = [{ n: 1, on: "16 Nov" }, { n: 2, on: "19 Nov" }, { n: 3, on: "23 Nov" }, { n: 4, on: "14 Dec" }];

export function Hospital({ b, k }: S) {
  const show = useReveal(b, k);
  const signed = show(2, 2600);
  const toast = b === 2 && signed ? "Category III recorded in your name." : b === 4 && show(4, 600) ? "Dose 1 recorded. Follow-up sent to Animal Care Trust." : null;
  if (b === 0) {
    return (
      <Frame place={CLINIC} nav={HEALTH_NAV} active="Bite cases" crumb={["Healthcare", "Bite cases"]}>
        <Head eyebrow={<>{CASE.clinic} <Chip>Illustrative</Chip></>} title="Bite cases" sub={<><b className="num">1</b> waiting for a clinician, <b className="num">1</b> with a dose overdue. Categories and doses are entered by clinicians.</>} />
        <p className="ohd-views"><span className="is-on">All <small>5</small></span><span>Waiting for a clinician <small>1</small></span><span>In course <small>3</small></span><span className="ohd-hide-s">Dose overdue <small>1</small></span></p>
        <table className="ohd-table">
          <thead><tr><th style={{ width: "36%" }}>Presentation</th><th>Category</th><th className="ohd-hide-s">Animal</th><th className="ohd-hide-s">Area</th><th>Course</th><th className="ohd-hide-s">Next dose</th></tr></thead>
          <tbody>
            <tr className={hl(true, "is-new")}>
              <td><b className="num">{CASE.code}</b><small>{CASE.ref} · age not given</small><small className="ohd-came"><Phone size={12} aria-hidden />Kaju Voice, Kannada<AvailTag s="proposed" small /></small><small>She reported: hand, bleeding</small></td>
              <td><Chip tone="warn">Not assessed</Chip></td><td className="ohd-hide-s">Dog</td><td className="ohd-hide-s">{CASE.area}</td><td><Chip tone="warn">Waiting for a clinician</Chip></td><td className="ohd-hide-s">—</td>
            </tr>
            {BITE_ROWS.map((r) => (
              <tr key={r.code}><td><b className="num">{r.code}</b><small>{r.ref}</small></td><td><Chip tone={r.tone}>{r.cat}</Chip></td><td className="ohd-hide-s">{r.sp}</td><td className="ohd-hide-s">{r.area}</td><td><Chip tone={r.ctone}>{r.course}</Chip></td><td className={`ohd-hide-s ohd-nw${r.late ? " is-late" : ""}`}>{r.next}</td></tr>
            ))}
          </tbody>
        </table>
      </Frame>
    );
  }
  const cat = b > 2 || signed;
  const modal = b === 2 && !signed ? (
        <div className="ohd-modal" role="dialog" aria-label="Record category III">
          <div className="ohd-modal-in">
            <h4>Record category III</h4>
            <p className="ohd-sub">Signed by {CASE.clinician} at {CASE.clinic}</p>
            <p className="ohd-tick"><span aria-hidden><CheckCircle2 size={16} /></span>This is my clinical assessment of this exposure.</p>
            <p className="ohd-fine">The record shows category III, assessed by you. StrayPaw records it; it does not assess.</p>
            <p className="ohd-modal-act"><span className="ohd-btn is-quiet">Cancel</span><span className={`ohd-btn${show(2, 1600) ? " is-press" : ""}`}>Record category III</span></p>
          </div>
        </div>
  ) : null;
  const asked = b >= 2;
  return (
    <Frame place={CLINIC} nav={HEALTH_NAV} active="Bite cases" crumb={["Healthcare", "Bite cases", CASE.ref]} toast={toast} overlay={modal}>
      <Head icon={<Stethoscope size={18} />} title={<span className="num">{CASE.ref}</span>} sub={<>{CASE.code} · Dog bite on 16 November in {CASE.area}</>}
        chips={<>{cat ? <Chip tone="bad">Category III</Chip> : <Chip tone="warn">Category not recorded</Chip>}{b >= 3 ? <Chip tone="accent">In course</Chip> : <Chip>No course</Chip>}</>} />
      <div className="ohd-rec">
        <div>
          <h4 className="ohd-h4">Presentation</h4>
          <Props items={[
            ["Category", <span key="c" className={hl(b === 2)}>{cat ? <>Category III <small>· {CASE.clinician}</small></> : <span className="ohd-catbtns"><span>Category I</span><span>Category II</span><span className={b === 2 ? "is-press" : undefined}>Category III</span></span>}</span>],
            ["Wound washing", asked ? "Washed at home, 15 minutes" : <span className="ohd-muted">To ask</span>],
            ["Presented", "16 November, 08:52"],
            ["Came by", "Kaju Voice notice, Kannada"],
            ["Age", asked ? "15–29" : <span className="ohd-muted">To ask</span>],
            ["Earlier vaccination", asked ? "None" : <span className="ohd-muted">To ask</span>],
            ["Animal", "Dog, street or community"],
            ["Looked like", "Brown, no collar"],
            ["Where it is", `Usually at the ${CASE.spot}`],
          ]} />
          <div className={hl(b === 3 || b === 4, "ohd-block")}>
            <h4 className="ohd-h4">Course</h4>
            {b < 3 ? <p className="ohd-sub">{cat ? "Prescribe from here." : "Record the category first. Then prescribe from here."}</p> : (
              <>
                <p className="ohd-note-l">Intradermal, 2 sites (updated Thai Red Cross) · immunoglobulin {b >= 4 ? "given into and around the wound, 16 Nov" : "prescribed"} · prescribed by {CASE.clinician}, 16 Nov</p>
                <ul className="ohd-list">
                  {DOSES.map((d) => {
                    const given = d.n === 1 && b >= 4;
                    return <li key={d.n}><span><b>Dose {d.n}</b><small>{given ? `Given 16 Nov by ${CASE.nurse} · batch ARV-ILL-1103` : `Due ${d.on}`}</small></span>{given ? <Chip tone="ok">Given</Chip> : d.n === 1 ? <Chip tone="accent">Today</Chip> : <Chip>Due</Chip>}</li>;
                  })}
                </ul>
                <p className="ohd-fine">StrayPaw does not calculate a schedule. Every dose date here was entered by the clinician.</p>
              </>
            )}
          </div>
        </div>
        <div>
          <KajuCard title="From the caller, prepared by Kaju" s="proposed" className={hl(b === 1)}>
            <p className="ohd-kcard-sub">Kannada call, 08:14 · translated</p>
            <p className="ohd-kcard-p">Dog bite on the hand, bleeding, &ldquo;a little deep&rdquo;. About 08:10 at the {CASE.spot}. Told to wash for 15 minutes. Agreed to reminder calls.</p>
            <p className="ohd-ask-h"><AlertTriangle size={14} aria-hidden />To ask at the desk</p>
            <ul className="ohd-ask is-check">
              <li className={asked ? "is-done" : undefined}>Earlier rabies vaccination{asked ? <small>None</small> : null}</li>
              <li className={asked ? "is-done" : undefined}>Age{asked ? <small>15–29</small> : null}</li>
              <li className={asked ? "is-done" : undefined}>Whether she washed the wound{asked ? <small>Yes</small> : null}</li>
            </ul>
          </KajuCard>
          {b >= 4 ? (
            <div className={hl(b === 4, "ohd-block is-rise")}>
              <h4 className="ohd-h4">Animal follow-up <small>Shared without patient details</small></h4>
              <ul className="ohd-list"><li><span><b>Find and observe the dog</b><small>{CASE.ngo} · due 17 Nov</small></span><Chip tone="accent">Sent</Chip></li></ul>
              <h4 className="ohd-h4">Reminder calls</h4>
              <p className="ohd-sub">Agreed. Phone calls from the clinic, logged here. SMS and WhatsApp are not connected.</p>
            </div>
          ) : null}
          <p className="ohd-lock"><Lock size={13} aria-hidden /><span>Patient details stay with this facility. Partners see only the animal facts needed for a follow-up. Kaju does not read this record.</span></p>
        </div>
      </div>
    </Frame>
  );
}

/* ── 3. Veterinary team and NGO: the request, the dog, its vaccination, the observation ─────── */

const NGO: Place = { name: CASE.ngo, initials: "AC", kind: "NGO workspace" };
const NGO_NAV: NavI[] = [
  { label: "Today", icon: Home }, { label: "Inbox", icon: Inbox, n: 4 }, { label: "Cases", icon: ClipboardList }, { label: "Animals", icon: PawPrint },
  { label: "Operations", icon: Route }, { label: "Programmes", icon: FolderKanban },
];
const INBOX = [
  { t: "Dog hit by a two-wheeler, cannot stand", s: "Near the flower market gate", place: "Ward 12", from: "Resident", src: "Citizen report", st: "New", tone: "accent" as const, when: "1 h" },
  { t: "Puppies under a parked lorry", s: "Four or five, mother nearby", place: "Ward 05", from: "Shopkeeper", src: "Citizen report", st: "New", tone: "accent" as const, when: "3 h" },
  { t: "Same dog reported again at the bus stand", s: "Possible match", place: "Ward 05", from: "Resident", src: "Citizen report", st: "Possible duplicate", tone: "warn" as const, when: "Yesterday" },
];
const OBS = [{ d: 0, on: "16 Nov" }, { d: 3, on: "19 Nov" }, { d: 7, on: "23 Nov" }, { d: 10, on: "26 Nov" }];

export function VetNgo({ b, k }: S) {
  const show = useReveal(b, k);
  if (b <= 1) {
    return (
      <Frame place={NGO} nav={NGO_NAV} active="Inbox" crumb={["NGO", "Inbox"]}>
        <Head title="Inbox" sub={<><b className="num">4</b> to triage. Reports from residents and requests from partners arrive here before they become a case.</>} />
        <table className="ohd-table">
          <thead><tr><th>Report</th><th className="ohd-hide-s">Place</th><th className="ohd-hide-s">From</th><th>State</th><th className="ohd-hide-s">Received</th></tr></thead>
          <tbody>
            <tr className={hl(b === 0, "is-new is-sel")}>
              <td><b>Find and observe the dog: Category III bite</b><small>Partner request · brown, no collar, usually at the bus stop</small></td>
              <td className="ohd-hide-s">{CASE.area}, 4th Block</td><td className="ohd-hide-s">Teaching Hospital</td><td><Chip tone="bad">Urgent · due 17 Nov</Chip></td><td className="ohd-hide-s">18 min</td>
            </tr>
            {INBOX.map((r) => <tr key={r.t}><td><b>{r.t}</b><small>{r.s}</small></td><td className="ohd-hide-s">{r.place}</td><td className="ohd-hide-s">{r.from}</td><td><Chip tone={r.tone}>{r.st}</Chip></td><td className="ohd-hide-s">{r.when}</td></tr>)}
          </tbody>
        </table>
        <div className="ohd-split">
          <div className={hl(b === 0, "ohd-block")}>
            <h4 className="ohd-h4">What the hospital shared</h4>
            <Props items={[
              ["Date", "Mon 16 Nov, about 08:10"],
              ["Place", `${CASE.area} ${CASE.spot}`],
              ["Animal", "Dog: brown, no collar, usually at the bus stop"],
              ["Exposure", "Category III, recorded by the clinician"],
              ["Asked", "Find the dog and observe it for 10 days"],
            ]} />
            <p className="ohd-lock"><Lock size={13} aria-hidden /><span>Patient details stay with the hospital: no name, age, phone or record number.</span></p>
          </div>
          {b === 1 ? (
            show(1, 1500) ? (
              <KajuCard title="Possible match, suggested by Kaju" s="today" className={hl(true, "is-rise")}>
                <p className="ohd-match"><span className="ohd-dog" aria-hidden><PawPrint size={18} /></span><span><b className="num">{CASE.dog}</b> · brown female, no collar, left ear notch<small>Registered 140 m from the bus stop · last seen 2 Nov by Field team A</small></span></p>
                <p className="ohd-modal-act"><span className="ohd-btn">Open the record</span><span className="ohd-btn is-quiet">Not this dog</span></p>
                <p className="ohd-fine">A suggested match stays a suggestion until someone on the team confirms it.</p>
              </KajuCard>
            ) : <p className="ohd-think"><Sparkles size={14} aria-hidden />Kaju is checking the animal register near the bus stop…</p>
          ) : null}
        </div>
      </Frame>
    );
  }
  if (b === 2) {
    return (
      <Frame place={NGO} nav={NGO_NAV} active="Animals" crumb={["NGO", "Animals", CASE.dog]}>
        <Head icon={<PawPrint size={18} />} title="Brown female, no collar" sub={<><span className="num">{CASE.dog}</span> · {CASE.area} {CASE.spot}</>}
          chips={<><Chip tone="ok">Sterilised</Chip><Chip tone="ok">Vaccinated · Mar 2026</Chip><Chip>Identity verified</Chip></>} />
        <div className="ohd-rec">
          <div>
            <Props items={[["Sex", "Female"], ["Age", "3–5 years"], ["Marks", "Left ear notch, white chest patch"], ["Area", `${CASE.area}, ward drive area`], ["Last seen", "2 Nov · Field team A"]]} />
            <div className="ohd-photo" aria-label="Photos on record: 3"><Camera size={18} aria-hidden /><span>3 photos on record</span></div>
          </div>
          <div>
            <h4 className="ohd-h4">Vaccination and care</h4>
            <ol className="ohd-tl">
              <li className={hl(true)}><b>Anti-rabies vaccine</b><small>3 Mar 2026 · batch ARV-ILL-0326 · {CASE.area} ward drive · {CASE.vet}</small></li>
              <li><b>Sterilised and ear-notched</b><small>3 Mar 2026 · {CASE.vet}</small></li>
              <li><b>Seen at the bus stop</b><small>2 Nov 2026 · Field team A</small></li>
              <li className="is-next"><b>Revaccination due</b><small>Mar 2027 · the programme&rsquo;s 12-month interval, set by its veterinary lead</small></li>
            </ol>
            <KajuCard title="Kaju" s="today" className="is-rise">
              <p className="ohd-kcard-p">Vaccinated 8 months ago, within the programme&rsquo;s interval. This does not end the 10-day observation; the hospital decides about the course.</p>
            </KajuCard>
          </div>
        </div>
      </Frame>
    );
  }
  const photo = b > 3 || show(3, 3200);
  return (
    <Frame place={NGO} nav={NGO_NAV} active="Cases" crumb={["NGO", "Requests", `${CASE.area} bite follow-up`]} toast={b === 4 && show(4, 800) ? "Outcome sent to the hospital." : null}>
      <Head icon={<Handshake size={18} />} title="Find and observe the dog" sub={<>From {CASE.clinic} · {CASE.area} {CASE.spot} · due 17 Nov</>}
        chips={b >= 4 ? <Chip tone="ok">Done</Chip> : <Chip tone="accent">In progress</Chip>} />
      <div className="ohd-rec">
        <div>
          <Props items={[["The dog", <><span className="num">{CASE.dog}</span> · confirmed by {CASE.coordinator}</>], ["Assigned to", `${CASE.vet}, field veterinarian`], ["Asked by", "Teaching Hospital Anti-Rabies Clinic"]]} />
          <div className={hl(b === 3, "ohd-block")}>
            <h4 className="ohd-h4">Observation <small>Prepared by Kaju · approved by {CASE.coordinator}</small></h4>
            <ul className="ohd-list">
              {OBS.map((o) => {
                const done = o.d === 0 || b >= 4;
                return <li key={o.d}><span><b>Day {o.d} · {o.on}</b><small>{o.d === 0 ? `Found and known by the ear notch · healthy, eating${photo ? " · photo added" : ""}` : done ? (o.d === 10 ? "Alive and healthy" : "Healthy") : "Planned"}</small></span>{done ? <Chip tone="ok">{o.d === 0 ? "Seen" : "Healthy"}</Chip> : <Chip>Planned</Chip>}</li>;
              })}
            </ul>
          </div>
        </div>
        <div>
          {b === 3 ? (
            <KajuCard title="Kaju noticed" s="today" className={hl(!photo, "is-rise")}>
              <p className="ohd-kcard-p">{photo ? <><Camera size={13} aria-hidden /> {CASE.vet} added a photo. The day 0 visit is complete.</> : <>The day 0 visit was saved without a photo. Add one, so the dog can be recognised on day 3?</>}</p>
            </KajuCard>
          ) : null}
          {b >= 4 ? (
            <div className={hl(true, "ohd-block is-rise")}>
              <h4 className="ohd-h4">Reported to the hospital <small>26 Nov</small></h4>
              <p className="ohd-kcard-p">Alive and healthy on day 10. Identified as <span className="num">{CASE.dog}</span>, vaccinated 3 Mar 2026.</p>
              <p className="ohd-fine">The clinician decides about the course. Had the dog fallen ill or died, the team would send a sample to the reference laboratory, and a positive result would alert the programme.</p>
            </div>
          ) : null}
          <p className="ohd-lock"><FlaskConical size={13} aria-hidden /><span>Samples go to the reference laboratory with their chain of custody. Only a named scientist releases a result.</span></p>
        </div>
      </div>
    </Frame>
  );
}

/* ── 4. Municipality: actions between partners, coverage, what is unresolved ───────────────── */

const OFFICE: Place = { name: "Municipal Animal Husbandry & Health", initials: "MH", kind: "Government & Programmes" };
const GOV_NAV: NavI[] = [
  { label: "Overview", icon: BarChart3 }, { label: "Programmes", icon: FolderKanban }, { label: "Partners", icon: Handshake },
  { label: "Verification", icon: ShieldCheck }, { label: "Surveillance", icon: Radar }, { label: "Reports", icon: FileCheck2 },
];
const ACTIONS: { t: string; from: string; to: string; due: string; st: string; tone: "ok" | "bad" | "warn" | "accent"; case?: boolean }[] = [
  { t: `Find and observe the dog · ${CASE.area}`, from: "Teaching Hospital", to: CASE.ngo, due: "17 Nov", st: "Closed · healthy on day 10", tone: "ok", case: true },
  { t: "Find and observe the dog · Whitefield", from: "Health centre, Whitefield", to: "Municipal field team", due: "26 Nov", st: "Overdue 1 day", tone: "bad" },
  { t: "Confirm vaccine stock · BTM Layout", from: "Programme", to: "Health centre, BTM Layout", due: "27 Nov", st: "Waiting", tone: "warn" },
  { t: "Vaccination drive · Whitefield", from: "Programme", to: CASE.ngo, due: "1 Dec", st: "Scheduled", tone: "accent" },
];
const COVER: { area: string; pct: number | null; n?: string; est?: string; stale?: boolean }[] = [
  { area: "Jayanagar", pct: 74, n: "303 of 410", est: "Jan 2025", stale: true },
  { area: "Koramangala", pct: 71, n: "248 of 350", est: "Aug 2026" },
  { area: "BTM Layout", pct: 66, n: "211 of 320", est: "Jul 2026" },
  { area: "HSR Layout", pct: 58, n: "220 of 380", est: "Sep 2026" },
  { area: "Whitefield", pct: 49, n: "255 of 520", est: "Jun 2026" },
  { area: "Yelahanka", pct: null },
];

export function Municipality({ b, k }: S) {
  const show = useReveal(b, k);
  const sent = show(4, 4200);
  return (
    <Frame place={OFFICE} nav={GOV_NAV} active="Overview" crumb={["Government", "Overview"]} toast={sent && b === 4 ? "Weekly brief sent by the programme officer." : null}>
      <Head eyebrow={<>{CASE.programme}</>} title="Programme overview" sub="Week of 23 to 29 November. Each figure opens the records it counts." />
      <div className="ohd-figs">
        <div><b className="num">41</b><span>Bite presentations this week</span></div>
        <div><b className="num">3</b><span>Actions open between partners</span></div>
        <div><b className="num">2 of 5</b><span>Areas at 70% dog vaccination</span></div>
        <div><b className="num">4</b><span>Doses overdue, counts only</span></div>
      </div>

      <section className={hl(b === 0, "ohd-block")} aria-label="Actions between partners">
        <h4 className="ohd-h4">Actions between partners</h4>
        <table className="ohd-table">
          <thead><tr><th>Action</th><th className="ohd-hide-s">From → to</th><th className="ohd-hide-s">Due</th><th>State</th></tr></thead>
          <tbody>{ACTIONS.map((a) => <tr key={a.t} className={a.case ? hl(b === 0, "is-sel") : undefined}><td><b>{a.t}</b><small className="ohd-show-s">{a.to} · due {a.due}</small></td><td className="ohd-hide-s">{a.from} → {a.to}</td><td className="ohd-hide-s ohd-nw">{a.due}</td><td><Chip tone={a.tone}>{a.st}</Chip></td></tr>)}</tbody>
        </table>
      </section>

      <section className={hl(b === 1, "ohd-block")} aria-label="Dog vaccination coverage">
        <h4 className="ohd-h4">Dog vaccination coverage <small>Verified vaccinations against the latest dated estimate · target 70%</small></h4>
        {b >= 2 ? (
          <KajuCard title="Kaju flagged" s="proposed" className={hl(b === 2, "is-rise")}>
            <p className="ohd-kcard-p">Jayanagar&rsquo;s 74% rests on a January 2025 population estimate. If the number of dogs has grown, coverage may read too high. A new estimate before the next drive would settle it.</p>
          </KajuCard>
        ) : null}
        <ul className="ohd-cov">
          {COVER.map((c) => (
            <li key={c.area} className={c.stale ? hl(b === 2) : undefined}>
              <span className="ohd-cov-a">{c.area}</span>
              {c.pct === null ? <span className="ohd-cov-none">No estimate, so no figure</span> : (
                <>
                  <span className="ohd-bar-t" aria-hidden><i style={{ width: `${c.pct}%` }} /><em style={{ left: "70%" }} /></span>
                  <span className="ohd-cov-v"><b className="num">{c.pct}%</b><small>{c.n} · est. {c.est}</small></span>
                  {c.pct < 70 ? <Chip tone="warn">Below target</Chip> : c.stale && b >= 2 ? <Chip tone="warn">Estimate 22 months old</Chip> : <span className="ohd-chip-gap" />}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={hl(b === 3, "ohd-block")} aria-label="Needs a decision">
        <h4 className="ohd-h4">Unresolved, needs a decision</h4>
        <ul className="ohd-alerts">
          <li className="is-urgent"><b>Whitefield follow-up is a day overdue</b><small>Municipal field team was asked to find the dog by 26 Nov. No visit is recorded.</small></li>
          <li className="is-urgent"><b>Health centre, BTM Layout: anti-rabies vaccine not available</b><small>Confirmed by the duty medical officer this morning. Patients are referred to the Teaching Hospital.</small></li>
          <li><b>4 vaccine doses overdue across 2 health centres</b><small>Counts only. Patient details stay with the facilities, which make the reminder calls.</small></li>
          <li><b>Coverage below 70% in HSR Layout and Whitefield</b><small>Whitefield&rsquo;s drive starts 1 Dec.</small></li>
        </ul>
      </section>

      {b >= 4 ? (
        <KajuCard title="Weekly brief, draft prepared by Kaju" s="proposed" className={hl(true, "is-rise")}>
          <ul className="ohd-brief">
            <li>{CASE.area} bite follow-up closed: the dog was alive and healthy on day 10.</li>
            <li>Whitefield follow-up is a day overdue. Suggest asking {CASE.ngo}, which works the next ward.</li>
            <li>BTM Layout health centre has no vaccine; its patients go to the Teaching Hospital.</li>
            <li>2 of 5 areas are at 70%. Jayanagar&rsquo;s figure rests on a January 2025 estimate.</li>
          </ul>
          <p className="ohd-task"><b>New task, suggested owner</b><span>Re-estimate Jayanagar&rsquo;s dog population · {CASE.unit} · by 15 Dec</span></p>
          <p className="ohd-modal-act">{sent ? <Chip tone="ok">Sent and assigned by the programme officer, 27 Nov</Chip> : <><span className={`ohd-btn${show(4, 2800) ? " is-press" : ""}`}>Review and send</span><span className="ohd-btn is-quiet">Edit</span></>}</p>
          <p className="ohd-fine">Nothing is sent or assigned until the officer confirms.</p>
        </KajuCard>
      ) : null}
    </Frame>
  );
}

/* ── 5. Researchers: approved datasets, an evaluation, suppression, a request ──────────────── */

const UNIT: Place = { name: CASE.unit, initials: "PE", kind: "Research" };
const RES_NAV: NavI[] = [
  { label: "Datasets", icon: LayoutGrid }, { label: "Explore", icon: BarChart3 }, { label: "Maps & Analysis", icon: Radar },
  { label: "Studies", icon: FolderKanban }, { label: "Reports", icon: FileCheck2 },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const SERIES = [
  { name: "Jayanagar", cls: "is-a", v: [31, 28, 30, 24, 21, 19, 17, 15, 14, 12] },
  { name: "Whitefield", cls: "is-b", v: [22, 25, 23, 26, 24, 27, 25, 28, 26, 29] },
];

function Trend({ drive }: { drive: boolean }) {
  const W = 560, H = 200, L = 32, R = 104, T = 12, B = 28, max = 35;
  const x = (i: number) => L + (i * (W - L - R)) / (MONTHS.length - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <svg className="ohd-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dog-bite exposures per month, January to October, Jayanagar falling from 31 to 12 after its March drive, Whitefield rising from 22 to 29. Illustrative numbers.">
      {[0, 10, 20, 30].map((g) => <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="ohd-grid" /><text x={L - 8} y={y(g) + 4} textAnchor="end" className="ohd-axis">{g}</text></g>)}
      {MONTHS.map((m, i) => <text key={m} x={x(i)} y={H - 8} textAnchor="middle" className="ohd-axis">{m}</text>)}
      {drive ? <g className="ohd-drive"><line x1={x(2)} x2={x(2)} y1={T} y2={H - B} /><text x={x(2) + 6} y={T + 10}>Jayanagar drive</text></g> : null}
      {SERIES.map((s) => (
        <g key={s.name} className={`ohd-series ${s.cls}`}>
          <polyline pathLength={1} points={s.v.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {s.v.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={4}><title>{`${s.name}, ${MONTHS[i]}: ${v}`}</title></circle>)}
          <text x={W - R + 10} y={y(s.v[s.v.length - 1]) + 4} className="ohd-dlabel">{s.name} {s.v[s.v.length - 1]}</text>
        </g>
      ))}
    </svg>
  );
}

export function Research({ b, k }: S) {
  const show = useReveal(b, k);
  if (b === 0 || b === 4) {
    const sent = show(4, 3400);
    return (
      <Frame place={UNIT} nav={RES_NAV} active="Datasets" crumb={["Research", "Datasets"]} toast={b === 4 && sent ? "Request sent to the programme's data steward." : null}>
        <Head eyebrow={<>{CASE.unit} <Chip>Illustrative</Chip></>} title="Datasets" sub={<><b className="num">2</b> datasets approved for you. Aggregated only; no record identifies a person.</>} />
        <table className={`ohd-table${b === 0 ? " " + hl(true) : ""}`}>
          <thead><tr><th>Dataset</th><th className="ohd-hide-s">Approved by</th><th>Version</th><th className="ohd-hide-s">Until</th></tr></thead>
          <tbody>
            <tr><td><b>Bite exposures by week, area, animal and category</b><small>Counts below 5 are hidden</small></td><td className="ohd-hide-s">Programme data steward</td><td>v3</td><td className="ohd-hide-s">31 Mar 2027</td></tr>
            <tr><td><b>Dog vaccination coverage by area and month</b><small>Verified vaccinations against dated estimates</small></td><td className="ohd-hide-s">Programme data steward</td><td>v2</td><td className="ohd-hide-s">31 Mar 2027</td></tr>
            {b === 4 && sent ? <tr className="is-new"><td><b>PEP course completion by facility and month</b><small>Requested 27 Nov</small></td><td className="ohd-hide-s" colSpan={3}><Chip tone="warn">Waiting for the steward</Chip></td></tr> : null}
          </tbody>
        </table>
        <p className="ohd-lock"><Lock size={13} aria-hidden /><span>Patient-level records never leave the treating facility. Access is approved by the programme&rsquo;s data steward, versioned, and can be withdrawn.</span></p>
        {b === 4 ? (
          <KajuCard title="Data request, drafted by Kaju" s="proposed" className={hl(true, "is-rise")}>
            <Props items={[
              ["Dataset", "PEP course completion by facility and month, aggregated"],
              ["Purpose", "Compare course completion before and after reminder calls began"],
              ["Fields", "Facility, month, courses started, completed, did not return"],
              ["Protection", "Counts below 5 hidden"],
              ["To", "Programme data steward"],
            ]} />
            <p className="ohd-modal-act">{sent ? <Chip tone="warn">Waiting for the steward</Chip> : <span className={`ohd-btn${show(4, 2200) ? " is-press" : ""}`}>Send to the steward</span>}</p>
            <p className="ohd-fine">Kaju cannot approve access. The steward decides, and access can be withdrawn.</p>
          </KajuCard>
        ) : null}
      </Frame>
    );
  }
  return (
    <Frame place={UNIT} nav={RES_NAV} active="Explore" crumb={["Research", "Explore"]}>
      <Head eyebrow="Study · dog vaccination and bites" title="Did the Jayanagar drive change bite exposures?" sub="Jayanagar had a vaccination drive in March; Whitefield did not. Illustrative numbers: no finding is claimed." />
      <section className={hl(b === 1, "ohd-block")} aria-label="Exposures per month">
        <h4 className="ohd-h4">Dog-bite exposures per month <small>Category II and III, all facilities</small></h4>
        <p className="ohd-legend"><span className="is-a">Jayanagar</span><span className="is-b">Whitefield</span></p>
        <Trend drive={b >= 2} />
      </section>
      {b >= 2 ? (
        <section className={hl(b === 2, "ohd-block is-rise")} aria-label="Coverage">
          <h4 className="ohd-h4">Verified dog vaccination coverage <small>From the coverage dataset</small></h4>
          <table className="ohd-table is-num">
            <thead><tr><th>Area</th><th>Jan</th><th>Mar</th><th>Jun</th><th>Oct</th></tr></thead>
            <tbody><tr><td><b>Jayanagar</b></td><td>38%</td><td>71%</td><td>73%</td><td>74%</td></tr><tr><td><b>Whitefield</b></td><td>46%</td><td>47%</td><td>48%</td><td>49%</td></tr></tbody>
          </table>
        </section>
      ) : null}
      {b >= 3 ? (
        <section className={hl(b === 3, "ohd-block is-rise")} aria-label="Jayanagar, week of 16 November">
          <h4 className="ohd-h4">Jayanagar, week of 16 November</h4>
          <table className="ohd-table is-num">
            <thead><tr><th>Animal</th><th>Category</th><th>Exposures</th></tr></thead>
            <tbody>
              <tr className="is-sel"><td><b>Dog</b><small>Includes this morning&rsquo;s bite</small></td><td>III</td><td>7</td></tr>
              <tr><td><b>Dog</b></td><td>II</td><td>9</td></tr>
              <tr><td><b>Cat</b></td><td>II</td><td><span className="ohd-sup">fewer than 5</span></td></tr>
              <tr><td><b>Monkey</b></td><td>III</td><td><span className="ohd-sup">fewer than 5</span></td></tr>
            </tbody>
          </table>
          <p className="ohd-fine">Shown total: 16, with 2 hidden counts that are not added in. No name, phone, age or record number is in this dataset.</p>
        </section>
      ) : null}
    </Frame>
  );
}

/* ── 6. Kaju across the case ──────────────────────────────────────────────────────────── */

const STEPS: { when: string; who: ChapterId; label: string; did: string; by: string; s: "today" | "proposed" }[] = [
  { when: "Mon 08:14", who: "citizen", label: "Citizen", did: "Took her report in Kannada and gave the fixed first-aid steps.", by: "She chose to call", s: "proposed" },
  { when: "08:16", who: "citizen", label: "Citizen", did: "Found the nearest centre that confirmed vaccine and immunoglobulin.", by: "Services confirmed by the centres", s: "proposed" },
  { when: "08:17", who: "hospital", label: "Hospital", did: "Sent the intake to the clinic and listed what the call did not cover.", by: "Sent with her consent", s: "proposed" },
  { when: "08:52", who: "hospital", label: "Hospital", did: "Stayed out of the clinical record while the clinician assessed and prescribed.", by: CASE.clinician, s: "today" },
  { when: "09:10", who: "vet-ngo", label: "Vet & NGO", did: "Suggested the likely dog and brought up its vaccination record.", by: `${CASE.coordinator} confirmed the dog`, s: "today" },
  { when: "09:12", who: "vet-ngo", label: "Vet & NGO", did: "Prepared the day 3, 7 and 10 checks; noticed a visit without a photo.", by: `${CASE.coordinator} approved`, s: "today" },
  { when: "Fri 27 Nov", who: "municipality", label: "Municipality", did: "Drafted the weekly brief and flagged a 22-month-old estimate.", by: "The programme officer sent it", s: "proposed" },
  { when: "Quarterly", who: "research", label: "Researchers", did: "Drafted a data request for the steward.", by: "The steward decides", s: "proposed" },
];
const NEVER = [
  "Assesses a wound, sets a category or chooses a dose date.",
  "Reads a clinical record, a patient's identity or their doses.",
  "Merges two animal records or confirms a match on its own.",
  "Approves data access, verifies a claim or releases a payment.",
  "Sends a message or creates a task without a person's confirmation.",
  "Shows a number it did not read from the records.",
];
const TODAY = [
  "Bite register, clinician-entered PEP courses and logged reminder calls",
  "Follow-up requests between partners, without patient details",
  "Animal register with vaccination and sterilisation history",
  "Dog vaccination coverage against the 70% target",
  "Aggregated research datasets with small counts hidden",
  "Kaju's suggested matches, prepared follow-ups and approvals",
];
const PROPOSED = [
  "Bite reports by voice and chat in Kannada through Kaju",
  "Kaju's intake for clinics, with the questions still to ask",
  "Kaju flags on old or missing programme data, and weekly briefs",
  "Kaju-drafted data requests for the steward",
];
const BEFORE = [
  "Clinical review of the Kannada wording and first-aid steps",
  "Ethics and data-protection approval",
  "A verified list of anti-rabies centres and who confirms their services",
  "Official ward boundaries and the ward split between NGOs",
  "SMS or WhatsApp registration for reminders",
];

export function KajuAll({ b }: S) {
  return (
    <section className="ohd-sum" aria-label="Kaju across the case" data-scroll tabIndex={0}>
      <div className={hl(b === 0, "ohd-sum-tl")}>
        <h3 className="ohd-h">One case, start to finish</h3>
        <p className="ohd-sub"><span className="num">{CASE.code}</span> · a dog bite in {CASE.area} · 16 to 27 November</p>
        <ol className="ohd-steps-tl">
          {STEPS.map((x) => (
            <li key={x.when + x.did}><span className="ohd-when">{x.when}</span><span className={`ohd-who is-${x.who}`}>{x.label}</span><span className="ohd-did"><b>{x.did}</b><small>{x.by}</small></span><AvailTag s={x.s} small /></li>
          ))}
        </ol>
      </div>
      {b >= 1 ? (
        <div className={hl(b === 1, "ohd-sum-never is-rise")}>
          <h4 className="ohd-h4">Kaju never</h4>
          <ul>{NEVER.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      ) : null}
      {b >= 2 ? (
        <div className={hl(b === 2, "ohd-sum-cols is-rise")}>
          <div><h4 className="ohd-h4"><AvailTag s="today" /></h4><ul>{TODAY.map((n) => <li key={n}>{n}</li>)}</ul></div>
          <div><h4 className="ohd-h4"><AvailTag s="proposed" /> in this application</h4><ul>{PROPOSED.map((n) => <li key={n}>{n}</li>)}</ul></div>
          <div><h4 className="ohd-h4"><Users size={14} aria-hidden /> Before real use</h4><ul>{BEFORE.map((n) => <li key={n}>{n}</li>)}</ul></div>
        </div>
      ) : null}
      {b >= 2 ? (
        <div className="ohd-end is-rise">
          <p>That is the whole case: one record, five partners, Kaju alongside.</p>
          <p className="ohd-cover-go"><Link className="ohd-go" href="/demo">Book a walkthrough</Link><a className="ohd-go is-line" href="#citizen">Watch from the start</a></p>
        </div>
      ) : null}
    </section>
  );
}

export const SCREENS: Record<ChapterId, (p: S) => ReactNode> = {
  citizen: (p) => <Citizen {...p} />,
  hospital: (p) => <Hospital {...p} />,
  "vet-ngo": (p) => <VetNgo {...p} />,
  municipality: (p) => <Municipality {...p} />,
  research: (p) => <Research {...p} />,
  kaju: (p) => <KajuAll {...p} />,
};
