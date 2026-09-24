"use client";

/* ════════════════════════════════════════════════════════════════════
   The case file. One request for help, kept as a record.

   Read in the browser under the member's session (see lib/case-file.ts
   for why the server cannot). The head says what the case is and where it
   stands in one sentence; the clock draws its whole life; the ruled strip
   holds the four facts a field worker asks first; then what happened, the
   medical notes, the history and the place — including the other requests
   the same place and the same animal have produced. The panel beside it
   is the only place anything is changed.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Camera, Check, ExternalLink, Loader2, LogIn, MapPin, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { uploadPhoto } from "@/lib/actions";
import { addCaseFollowup, addCaseNote, addCasePhoto, setCaseMedical, updateCaseFollowupStatus } from "@/lib/case-actions";
import { loadCaseFile, type CaseFile as File_, type Neighbour } from "@/lib/case-file";
import { CLOSURE_META, INTAKE_META, STATUS_META, triageOf, type ClosureReason, type Intake, type StatusClass } from "@/lib/register/taxonomy";
import { CaseClock, span, type ClockInput } from "./CaseClock";
import { CaseDecision, isOpenClass } from "./CaseDecision";
import "./casefile.css";

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null | undefined) => { if (!iso) return "—"; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const shortCode = (code: string | null) => (!code ? null : code.length > 14 ? code.slice(0, 12) : code);
const condOf = (cls: string | null) => (cls && cls !== "Not recorded" ? cls : null);

export function CaseFile({ id }: { id: string }) {
  const { user, ready, openSignIn } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const [file, setFile] = useState<File_ | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setFile(await loadCaseFile(id)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read the case."); setFile(null); }
  }, [id]);

  useEffect(() => {
    if (!ready || !accessReady) return;
    if (!user || !member) { setFile(null); return; }
    load();
  }, [ready, accessReady, user, member, load]);

  if (!ready || !accessReady || file === undefined) return <main className="cf"><p className="cf-state"><Loader2 size={16} className="animate-spin" /> Opening the case…</p></main>;
  if (!user) return (
    <main className="cf">
      <div className="cf-gate">
        <h1>This case is kept by an organisation.</h1>
        <p>Cases hold what callers said and where an animal was found, so only the organisation that holds a case can open it. Sign in with your organisation account.</p>
        <button type="button" className="sys-btn" onClick={openSignIn}><LogIn size={16} /> Sign in</button>
      </div>
    </main>
  );
  if (!member) return (
    <main className="cf">
      <div className="cf-gate">
        <h1>Only the organisation that holds this case can open it.</h1>
        <p>Your account is not a member of an organisation yet. <Link href="/partner-apply">Ask for organisation access</Link>.</p>
      </div>
    </main>
  );
  if (!file) return (
    <main className="cf">
      <div className="cf-gate">
        <h1>No case with this link in your organisation&rsquo;s register.</h1>
        <p>{error ?? "It may belong to another organisation, or the link may be incomplete."} <Link href="/partner/cases">Back to all cases</Link>.</p>
      </div>
    </main>
  );
  return <Loaded file={file} reload={load} />;
}

function Loaded({ file, reload }: { file: File_; reload: () => Promise<void> }) {
  const { c, reg } = file;
  const now = Date.now();
  const open = isOpenClass(reg.status_class, c.status);
  const cond = condOf(reg.condition_class);
  const triage = cond ? triageOf(cond) : "Unclassified";
  const age = Math.max(0, Math.floor((now - Date.parse(reg.occurred_at)) / DAY));
  const quiet = Math.max(0, Math.floor((now - Date.parse(c.last_activity_at || reg.occurred_at)) / DAY));
  const stale = open && age > 90 && quiet > 30;
  const cls = (reg.status_class ?? (open ? "open" : "closed")) as StatusClass;
  const intake = reg.intake_channel ? INTAKE_META[reg.intake_channel as Intake] ?? reg.intake_channel : null;
  const code = shortCode(reg.case_code);
  // An imported title is "<condition as written> · <place>"; the place is already in the head.
  const said = (c.title ?? "").split(" · ")[0].trim();

  // When it closed, and how that date is known.
  const assumed = reg.resolved_at_source === "import_assumed";
  const closedAt = open ? null : (reg.resolved_at_source && c.resolved_at && !assumed ? c.resolved_at : reg.status_reviewed_at ?? (assumed ? c.resolved_at : c.last_activity_at));
  const closedHow: ClockInput["closedHow"] = open ? null : reg.status_reviewed_at && !(reg.resolved_at_source === "recorded") ? "reviewed" : assumed ? "assumed" : reg.resolved_at_source === "recorded" ? "recorded" : "derived";
  const closedClamped = closedAt ? new Date(Math.min(Date.parse(closedAt), now)).toISOString() : null;
  const closedDays = closedClamped ? Math.max(0, Math.round((Date.parse(closedClamped) - Date.parse(reg.occurred_at)) / DAY)) : null;

  const sentence = open
    ? <>Reported {day(reg.occurred_at)}{intake ? <> through {intake.toLowerCase().replace(/^the /, "the ")}</> : null}. Open for <b className={stale ? "is-hot" : ""}>{span(age)}</b>{quiet > 30 ? <>; nothing recorded for <b className="is-hot">{span(quiet)}</b></> : <>; last touched {quiet === 0 ? "today" : `${span(quiet)} ago`}</>}.</>
    : <>Reported {day(reg.occurred_at)}{intake ? <> through {intake.toLowerCase()}</> : null}. {cls === "closed" ? "Closed" : STATUS_META[cls]?.label ?? "Closed"}{closedClamped && !assumed ? <> {day(closedClamped)}{closedDays ? <>, after <b>{span(closedDays)}</b></> : null}</> : assumed ? <> — the import could not say when</> : null}.</>;

  return (
    <main className="cf">
      <header className="cf-mast">
        <div className="cf-id">
          <p className="cf-kicker">
            {code && <span className="cf-code sys-mono">{code}</span>}
            <span className={`cf-triage is-${triage.toLowerCase()}`}><i />{triage === "Unclassified" ? "Not triaged" : triage}</span>
            <span className={`cf-pill ${open ? "is-open" : ""}`}>{STATUS_META[cls]?.label ?? cls}</span>
            {reg.status_reviewed_at && <span className="cf-pill">Reviewed {day(reg.status_reviewed_at)}</span>}
            {reg.provenance === "imported_historical_record" && <span className="cf-kick-note">From the organisation&rsquo;s own register</span>}
          </p>
          <h1 className={cond ? "" : "is-muted"}>{cond ?? "Condition not recorded"}</h1>
          <p className="cf-place"><MapPin size={16} /> {c.zone || reg.city || "Place not recorded"}{reg.location_precision === "approximate" && <small>placed at the locality, not the spot</small>}</p>
          <p className="cf-line">{sentence}</p>
        </div>
        <AnimalCard file={file} />
      </header>

      <CaseClock opened={reg.occurred_at} firstAction={reg.first_action_at} lastActivity={c.last_activity_at} open={open}
        closedAt={closedClamped} closedHow={closedHow}
        closeLabel={closedHow === "assumed" ? "Closed · date not recorded" : `Closed ${closedClamped ? day(closedClamped) : ""}`}
        updates={file.updates} followups={file.followups} />

      <dl className="cf-known">
        <Fact t="First action" v={reg.first_action_at ? (() => { const d = Math.max(0, Math.round((Date.parse(reg.first_action_at) - Date.parse(reg.occurred_at)) / DAY)); return d === 0 ? "Same day" : `After ${span(d)}`; })() : null} w={reg.first_action_at ? day(reg.first_action_at) : "No first action recorded"} />
        <Fact t="With" v={c.assignee_name} w={c.assignee_name ? (c.assignee_id ? "Assigned in StrayPaw" : "") : open ? "Nobody has taken it" : ""} hot={open && !c.assignee_name} />
        <Fact t="Follow-ups" v={file.followups.length ? `${file.followups.filter((f) => f.status === "done").length} of ${file.followups.length} done` : null} w={(() => { const m = file.followups.filter((f) => f.status === "missed" || (f.status === "upcoming" && Date.parse(f.due_at) < now)).length; return m ? `${m} missed or overdue` : file.followups.length ? "None missed" : "None planned"; })()} hot={file.followups.some((f) => f.status === "missed" || (f.status === "upcoming" && Date.parse(f.due_at) < now))} />
        <Fact t="Care" v={reg.hospital || (c.resolution ? c.resolution[0].toUpperCase() + c.resolution.slice(1) : null)} w={reg.hospital ? "Hospital or clinic" : c.resolution ? "Resolution" : ""} />
      </dl>

      <div className="cf-body">
        <div className="cf-main">
          <Section n="01" title="What happened">
            {said && said.toLowerCase() !== (cond ?? "").toLowerCase() && <p className="cf-said">Recorded as <q>{said}</q>{reg.condition_text && reg.condition_text !== "Unknown" && !said.toLowerCase().includes(reg.condition_text.toLowerCase()) ? <>, condition noted as <q>{reg.condition_text}</q></> : null}.</p>}
            {c.description ? <p className="cf-prose">{c.description}</p> : <p className="cf-quiet">No field notes were written for this case.</p>}
            {reg.next_action && <p className="cf-said"><b>Next action on the register:</b> {reg.next_action}</p>}
            {c.outcome_note && <div className="cf-outcome"><p className="cf-h3">Outcome</p><p className="cf-prose">{c.outcome_note}</p></div>}
            <Photos file={file} reload={reload} />
          </Section>

          <Section n="02" title="Medical">
            <Medical file={file} reload={reload} />
          </Section>

          <Section n="03" title="History" lede={file.updates.length ? `${file.updates.length} ${file.updates.length === 1 ? "entry" : "entries"} since the case was opened in StrayPaw.` : "Nothing has been written into this case since it arrived."}>
            <History file={file} closedAt={closedClamped} assumed={assumed} />
          </Section>

          <Section n="04" title="The place" lede="Where a request comes from is part of the answer: a spot that keeps producing requests, or keeps producing animals nobody can find, needs something other than one more rescue.">
            <Place file={file} />
          </Section>
        </div>

        <aside className="cf-side">
          <CaseDecision file={file} member onChanged={reload} />
          <Followups file={file} reload={reload} />
          <Note file={file} reload={reload} />
          <Link href={`/fundraisers/new?title=${encodeURIComponent(c.title)}&case=${c.id}`} className="cf-side-link">Raise funds for this case <ArrowUpRight size={14} /></Link>
        </aside>
      </div>
    </main>
  );
}

function Fact({ t, v, w, hot }: { t: string; v: string | null | undefined; w: string; hot?: boolean }) {
  return (
    <div className={`cf-fact ${!v ? "is-unknown" : ""} ${hot ? "is-hot" : ""}`}>
      <dt>{t}</dt>
      <dd>{v || "Not recorded"}</dd>
      {w && <dd className="cf-fact-w">{w}</dd>}
    </div>
  );
}

function Section({ n, title, lede, children }: { n: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section className="cf-sec">
      <header><p className="cf-sec-n sys-mono">{n}</p><h2>{title}</h2>{lede && <p>{lede}</p>}</header>
      {children}
    </section>
  );
}

function AnimalCard({ file }: { file: File_ }) {
  const { c, animal } = file;
  if (!c.dog_id) return (
    <div className="cf-animal is-none">
      <p className="cf-h3">The animal</p>
      <p>No animal record is linked to this case. Linking one puts this request on the animal&rsquo;s own history, so the next person who meets it knows.</p>
      <Link href={`/partner/animals`} className="cf-side-link">Find the animal <ArrowUpRight size={14} /></Link>
    </div>
  );
  return (
    <Link href={`/partner/animals/${c.dog_id}`} className="cf-animal">
      <div className="cf-animal-ph">{animal?.photo ? <DogPhoto src={animal.photo} alt={animal.name ?? "The animal"} className="h-full w-full" /> : <span className="cf-animal-none" aria-hidden />}</div>
      <div>
        <p className="cf-h3">The animal</p>
        <p className="cf-animal-n">{animal?.name || "Unnamed"}</p>
        {animal?.straypaw_id && <p className="sys-mono cf-animal-id">{animal.straypaw_id}</p>}
        <span className="cf-side-link">Open its record <ArrowUpRight size={14} /></span>
      </div>
    </Link>
  );
}

function Photos({ file, reload }: { file: File_; reload: () => Promise<void> }) {
  const { c } = file;
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const shots = [
    ...(c.before_url ? [{ src: c.before_url, label: "Before" }] : []),
    ...(c.photos ?? []).map((src, i) => ({ src, label: `Photo ${i + 1}` })),
    ...(c.after_url ? [{ src: c.after_url, label: "After" }] : []),
  ];
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr(null);
    try { await addCasePhoto(c.id, await uploadPhoto(f)); await reload(); }
    catch { setErr("The photo was not saved. Please try again."); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="cf-photos">
      {shots.map((s) => (
        <figure key={s.src}><DogPhoto src={s.src} alt={s.label} className="cf-shot" /><figcaption>{s.label}</figcaption></figure>
      ))}
      <button type="button" className="cf-addphoto" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}<span>{shots.length ? "Add a photo" : "No photographs yet. Add one"}</span>
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      {err && <p className="cf-msg is-err">{err}</p>}
    </div>
  );
}

function Medical({ file, reload }: { file: File_; reload: () => Promise<void> }) {
  const [notes, setNotes] = useState(file.c.medical_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = notes.trim() !== (file.c.medical_notes ?? "").trim();
  return (
    <div className="cf-medical">
      <textarea rows={4} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        placeholder="Condition, diagnosis, treatment given, medication, vaccination, deworming, sterilisation…" aria-label="Medical notes" />
      <div className="cf-row">
        <button type="button" className="cf-btn" disabled={busy || !dirty} onClick={async () => {
          setBusy(true); setErr(null);
          try { const ok = await setCaseMedical(file.c.id, notes.trim()); if (!ok) throw new Error(); setSaved(true); await reload(); }
          catch { setErr("The notes were not saved. Please try again."); }
          finally { setBusy(false); }
        }}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {saved && !dirty ? "Saved" : "Save medical notes"}</button>
        {err && <span className="cf-msg is-err">{err}</span>}
      </div>
    </div>
  );
}

type Entry = { k: string; at: number; who: string | null; what: string; note?: string | null; tone?: "hot" | "blue" | "muted" };
const VERB: Record<string, string> = { created: "opened the case", claimed: "claimed the case", assigned: "", reopened: "reopened the case", note: "wrote", status_changed: "" };
const STATUS_WORD: Record<string, string> = { unverified: "reported", assigned: "assigned", in_progress: "in progress", resolved: "resolved", closed: "closed" };

function History({ file, closedAt, assumed }: { file: File_; closedAt: string | null; assumed: boolean }) {
  const { c, reg } = file;
  const rows: Entry[] = [{ k: "open", at: Date.parse(reg.occurred_at), who: null, what: reg.provenance === "imported_historical_record" ? "The request was received" : `${c.created_by_name ?? "Someone"} reported it`, tone: "muted" }];
  if (reg.first_action_at) rows.push({ k: "first", at: Date.parse(reg.first_action_at), who: null, what: "First field action recorded", tone: "blue" });
  for (const u of file.updates) {
    const what = u.type === "status_changed" ? `moved it from ${STATUS_WORD[u.from_status ?? ""] ?? "—"} to ${STATUS_WORD[u.to_status ?? ""] ?? "—"}` : u.type === "assigned" ? (u.note ?? "reassigned the case").replace(/^Assigned/, "assigned it") : VERB[u.type] ?? u.type;
    rows.push({ k: u.id, at: Date.parse(u.created_at), who: u.actor_name ?? "Someone", what, note: u.type === "note" || u.type === "status_changed" ? u.note : null, tone: /closed/.test(u.note ?? "") || u.to_status === "closed" ? "hot" : undefined });
  }
  for (const f of file.followups) if (f.status === "done" || f.status === "missed") rows.push({ k: `f${f.id}`, at: Date.parse(f.completed_at ?? f.due_at), who: null, what: f.status === "done" ? "Follow-up done" : "Follow-up missed", note: f.note, tone: f.status === "missed" ? "hot" : "blue" });
  if (closedAt && !file.updates.some((u) => u.to_status === "closed" || u.to_status === "resolved")) {
    rows.push({ k: "close", at: Date.parse(closedAt), who: null, what: assumed ? "Closed (the import could not say when; drawn at the report date)" : "Closed on the register", note: reg.closure_reason && reg.closure_reason !== "unspecified" ? CLOSURE_META[reg.closure_reason as ClosureReason]?.label : null });
  }
  rows.sort((a, b) => a.at - b.at);
  return (
    <ol className="cf-hist">
      {rows.map((r) => (
        <li key={r.k} className={r.tone ? `is-${r.tone}` : ""}>
          <time>{day(new Date(r.at).toISOString())}</time>
          <p>{r.who && <b>{r.who} </b>}{r.what}</p>
          {r.note && <p className="cf-hist-note">{r.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function Place({ file }: { file: File_ }) {
  const { c, reg, neighbours, sameAnimal } = file;
  const lost = neighbours.filter((n) => n.closure_reason === "could_not_locate").length;
  const noAction = neighbours.filter((n) => n.status_class === "no_action" || n.status_class === "not_attended").length;
  const openHere = neighbours.filter((n) => n.status_class === "open" || n.status_class === "in_progress").length;
  const since = neighbours.length ? new Date(neighbours[neighbours.length - 1].occurred_at ?? reg.occurred_at).getFullYear() : null;
  return (
    <div className="cf-place-b">
      {reg.h3_r8 ? (
        <>
          <p className="cf-said">
            {neighbours.length === 0 ? <>This is the only request recorded in its cell of the map (about 0.7 km²).</>
              : <><b>{neighbours.length}{neighbours.length >= 60 ? "+" : ""} other {neighbours.length === 1 ? "request" : "requests"}</b> recorded in the same cell since {since}{openHere ? <>, {openHere} still open</> : null}.{noAction ? <> {noAction} closed without field action{lost ? <>, {lost} because the animal could not be found</> : null}.</> : null}</>}
          </p>
          {neighbours.length > 0 && <Strip rows={neighbours} />}
          <p className="cf-row">
            <Link href={`/partner/map?cell=${reg.h3_r8}`} className="cf-btn">See the cell on the map</Link>
            <Link href={`/partner/reports?cell=${reg.h3_r8}`} className="cf-btn is-quiet">Its figures</Link>
          </p>
        </>
      ) : <p className="cf-quiet">This case has no place on the map yet, so it cannot be compared with its neighbours.</p>}

      {sameAnimal.length > 0 && (
        <div>
          <p className="cf-h3">Other requests for the same animal</p>
          <ul className="cf-list">{sameAnimal.map((n) => <NeighbourRow key={n.id} n={n} />)}</ul>
        </div>
      )}

      {c.lat != null && c.lng != null && (
        <div className="cf-return">
          <p><b>Return it where it was found.</b> If this animal is moved for treatment, it goes back to the same street: it holds territory there, and its food and its group are there.</p>
          <a href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer" className="cf-side-link">
            Open the {reg.location_precision === "approximate" ? "approximate place" : "place"} in Maps <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

/** The cell's other requests, month by month: each dot one request, stacked
    in its month, filled by how it ended. A place that keeps producing requests
    shows as a tall column; one where animals are never found shows hatched. */
function Strip({ rows }: { rows: Neighbour[] }) {
  const dated = rows.map((r) => ({ r, t: Date.parse(r.occurred_at ?? "") })).filter((x) => Number.isFinite(x.t));
  if (!dated.length) return null;
  const first = new Date(Math.min(...dated.map((x) => x.t)));
  const m0 = first.getFullYear() * 12 + first.getMonth();
  const today = new Date();
  const months = Math.max(1, today.getFullYear() * 12 + today.getMonth() - m0 + 1);
  const kind = (n: Neighbour) => n.status_class === "open" || n.status_class === "in_progress" ? "is-open" : n.status_class === "no_action" || n.status_class === "not_attended" ? (n.closure_reason === "could_not_locate" ? "is-lost" : "is-none") : "is-done";
  const order = { "is-done": 0, "is-none": 1, "is-lost": 2, "is-open": 3 } as const;
  const bins = new Map<number, Neighbour[]>();
  for (const { r, t } of dated) { const d = new Date(t); const k = d.getFullYear() * 12 + d.getMonth() - m0; bins.set(k, [...(bins.get(k) ?? []), r]); }
  const tall = Math.max(...[...bins.values()].map((b) => b.length));
  const years: { at: number; y: number }[] = [];
  for (let y = first.getFullYear() + 1; y <= today.getFullYear(); y++) years.push({ at: (y * 12 - m0) / months, y });
  return (
    <div className="cf-strip">
      <div className="cf-strip-plot" style={{ height: Math.min(12, tall) * 13 + 10 }}>
        {years.map((y) => <span key={y.y} className="cf-strip-yr" style={{ left: `${y.at * 100}%` }}>{y.y}</span>)}
        {[...bins].map(([k, list]) => list.sort((a, b) => order[kind(a)] - order[kind(b)]).slice(0, 12).map((n, i) => (
          <Link key={n.id} href={`/partner/cases/${n.id}`} className={`cf-strip-m ${kind(n)}`}
            style={{ left: `${((k + 0.5) / months) * 100}%`, bottom: 4 + i * 13 }}
            title={`${day(n.occurred_at)} · ${condOf(n.condition_class) ?? "Condition not recorded"} · ${STATUS_META[(n.status_class ?? "unknown") as StatusClass]?.short ?? ""}`}
            aria-label={`${condOf(n.condition_class) ?? "A request"}, ${day(n.occurred_at)}`} />
        )))}
      </div>
      <p className="cf-strip-key">
        <span><i className="is-done" /> closed after field work</span>
        <span><i className="is-none" /> closed without action</span>
        <span><i className="is-lost" /> animal not found</span>
        <span><i className="is-open" /> still open</span>
        <span className="cf-strip-dates">one dot, one request · {MON[first.getMonth()]} {first.getFullYear()} → today</span>
      </p>
    </div>
  );
}

function NeighbourRow({ n }: { n: Neighbour }) {
  return (
    <li><Link href={`/partner/cases/${n.id}`}>
      <span>{condOf(n.condition_class) ?? "Condition not recorded"}</span>
      <small>{day(n.occurred_at)} · {STATUS_META[(n.status_class ?? "unknown") as StatusClass]?.short ?? "—"}</small>
    </Link></li>
  );
}

function Followups({ file, reload }: { file: File_; reload: () => Promise<void> }) {
  const { c } = file;
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const now = Date.now();
  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setErr(null);
    try { const r = await fn(); if (r === false || r === null) throw new Error(); await reload(); }
    catch { setErr("That was not saved. Please try again."); }
    finally { setBusy(null); }
  };
  const list = [...file.followups].sort((a, b) => {
    const ao = a.status === "upcoming" ? 0 : 1, bo = b.status === "upcoming" ? 0 : 1;
    return ao - bo || Date.parse(a.due_at) - Date.parse(b.due_at);
  });
  return (
    <section className="cf-panel">
      <h2 className="cf-panel-h">Follow-ups</h2>
      {list.length ? (
        <ul className="cf-fus">
          {list.slice(0, 10).map((f) => {
            const late = f.status === "upcoming" && Date.parse(f.due_at) < now;
            return (
              <li key={f.id} className={late ? "is-late" : f.status === "done" ? "is-done" : f.status === "upcoming" ? "" : "is-off"}>
                <div><b>{day(f.due_at)}</b><small>{late ? "Overdue" : f.status === "upcoming" ? "Due" : f.status[0].toUpperCase() + f.status.slice(1)}{f.note ? ` · ${f.note}` : ""}</small></div>
                {f.status === "upcoming" && (
                  <span className="cf-fu-acts">
                    <button type="button" disabled={!!busy} onClick={() => act(f.id + "d", () => updateCaseFollowupStatus({ followupId: f.id, status: "done" }))}>Done</button>
                    <button type="button" disabled={!!busy} onClick={() => act(f.id + "m", () => updateCaseFollowupStatus({ followupId: f.id, status: "missed" }))}>Missed</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="cf-quiet">No follow-up is planned.</p>}
      <div className="cf-fu-add">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Follow-up date" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should happen then?" aria-label="What the follow-up is for" />
        <button type="button" className="cf-btn" disabled={!date || !!busy} onClick={() => act("add", async () => { const id = await addCaseFollowup({ caseId: c.id, dogId: c.dog_id, dueAt: date, note }); setDate(""); setNote(""); return id; })}>
          {busy === "add" ? <Loader2 size={15} className="animate-spin" /> : null} Plan a follow-up
        </button>
      </div>
      {err && <p className="cf-msg is-err">{err}</p>}
    </section>
  );
}

function Note({ file, reload }: { file: File_; reload: () => Promise<void> }) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <section className="cf-panel">
      <h2 className="cf-panel-h">Write in the history</h2>
      <div className="cf-note">
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, who called, what is next…" aria-label="A note for the case history" />
        <button type="button" aria-label="Add the note" disabled={!note.trim() || busy} onClick={async () => {
          setBusy(true);
          try { await addCaseNote(file.c.id, { id: user.id, name: user.name }, note.trim()); setNote(""); await reload(); }
          finally { setBusy(false); }
        }}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </div>
    </section>
  );
}
