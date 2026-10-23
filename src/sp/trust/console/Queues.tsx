"use client";

/* Trust console · what is waiting on a person: new reports, partner
   requests, content reports, feedback and outcomes to verify. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Clock, ExternalLink, MapPin, X } from "lucide-react";
import { animalTag, givenName } from "@/lib/animal-name";
import { describesInjury } from "@/lib/sensitive-photo";
import { day, since } from "../../ui";
import { Portrait } from "../../ui/Portrait";
import { publicLocality } from "../../ui/place";
import { send, type Read } from "./api";
import { Contact, Filters, Inspector, Line, lower, NoneMatch, Pane, Photo, ReceiptLine, Search, Table, useReceipt, type Col } from "./parts";
import type { ContentReport, Feedback, PartnersRead, PendingCase, Sighting } from "./types";

export type P<T> = { secret: string; read: Read<T> | undefined; reload: () => Promise<void>; empty: ReactNode };
const place = (z: string | null) => publicLocality(z) ?? z ?? "Place not given";

/* ── new reports (sightings) ──────────────────────────────────────── */
type Settings = { autoApproval: boolean; photoCheck: boolean } | null;
const sightingTitle = (s: Sighting) => givenName(s.nickname) ?? s.nickname?.trim() ?? "New animal";
const reporter = (s: Sighting) => s.reporter_kind === "organisation" ? `${s.volunteer_name || "Volunteer"} for an organisation` : s.reporter_kind === "signed-in" ? (s.reporter_name || "Signed-in reporter") : s.reporter_kind === "guest" ? (s.reporter_name || "Guest") : (s.reporter_name || "Not recorded");

/* One report at a time is the default: photo, words, checks, one decision
   (A approve, R reject, → skip). The table is there for searching. */
export function Sightings(props: P<Sighting[]> & { settings: Settings }) {
  const [mode, setMode] = useState<"one" | "table">("one");
  const n = props.read?.data?.length ?? 0;
  const tabs = <Filters label="How to review" value={mode} onChange={setMode} options={[{ key: "one", label: "One at a time" }, { key: "table", label: "Table", n }]} />;
  return mode === "one" ? <ReviewOne {...props} tabs={tabs} /> : <SightingsTable {...props} tabs={tabs} />;
}

type Verdict = { ok: boolean; reason: string; injury?: boolean };
function ReviewOne({ secret, read, reload, empty, settings, tabs }: P<Sighting[]> & { settings: Settings; tabs: ReactNode }) {
  const rows = useMemo(() => read?.data ?? [], [read]);
  const [at, setAt] = useState(0);
  const [r, setR] = useReceipt();
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | "checking">>({});
  const cur = rows[Math.min(at, Math.max(0, rows.length - 1))] ?? null;
  const passing = rows.filter((x) => x.passes).length;
  const busy = r === "pending";

  const act = useCallback(async (action: "approve" | "reject", dogId?: string) => {
    if (!cur || busy) return;
    setR("pending");
    const a = await send(secret, `sighting:${cur.id}`, "/api/admin/sightings", { json: { action, id: cur.id, ...(dogId ? { dogId } : {}) } },
      action === "approve" ? `“${sightingTitle(cur)}” approved ${dogId ? `as a sighting of ${animalTag({ id: dogId })}` : "as a new animal"}` : `“${sightingTitle(cur)}” rejected`);
    setR(a);
    if (a.ok) await reload();
  }, [cur, busy, secret, reload, setR]);
  const skip = useCallback(() => setAt((i) => (rows.length ? (i + 1) % rows.length : 0)), [rows.length]);
  async function approvePassing() {
    setR("pending");
    const a = await send<{ approved?: string[] }>(secret, "sighting:passing", "/api/admin/sightings", { json: { action: "approve_passing" } }, (b) => `${b.approved?.length ?? 0} approved that pass every check`);
    setR(a);
    if (a.ok) { setAt(0); await reload(); }
  }

  useEffect(() => {
    if (!cur || !settings?.photoCheck || verdicts[cur.id] || !cur.photo_url) return;
    setVerdicts((v) => ({ ...v, [cur.id]: "checking" }));
    send<{ verdict?: Verdict }>(secret, `photo:${cur.id}`, "/api/admin/sightings", { json: { action: "photo_check", id: cur.id } }, "Photo checked")
      .then((a) => setVerdicts((v) => ({ ...v, [cur.id]: a.ok && a.body.verdict ? a.body.verdict : { ok: false, reason: "Photo check unavailable" } })));
  }, [cur, settings, verdicts, secret]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!cur || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "a" || e.key === "A") { e.preventDefault(); void act("approve"); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); void act("reject"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); skip(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [cur, act, skip]);

  const v = cur ? verdicts[cur.id] : undefined;
  return (
    <div className="cn-list op-review">
      <div className="cn-tools">
        {tabs}
        {settings && <span className={`pill ${settings.autoApproval ? "is-care" : "is-plain"}`}>Auto-approval {settings.autoApproval ? "on" : "off"}{settings.autoApproval && settings.photoCheck ? " · photo check on" : ""}</span>}
        {passing > 1 && <button type="button" className="btn is-s is-ink" disabled={busy} onClick={approvePassing}>Approve the {passing} that pass every check</button>}
      </div>
      <ReceiptLine r={r} />
      {!rows.length && empty}
      {cur && (
        <article className="op-card" aria-label="Report under review">
          <div className="op-card-photo"><Portrait src={cur.photo_url} tag={cur.nickname ?? "Report"} sensitive={describesInjury(cur.notes, cur.mood_tags) || (v !== undefined && v !== "checking" && v.injury === true)} size="l" alt="The reported animal" /></div>
          <div className="op-card-body">
            <p className="mono small">{rows.indexOf(cur) + 1} of {rows.length}</p>
            <h2 className="op-card-h">{sightingTitle(cur)}</h2>
            <p className="op-meta"><MapPin size={14} aria-hidden /> {place(cur.zone)}</p>
            <p className="op-meta"><Clock size={14} aria-hidden /> {since(cur.created_at)} · {reporter(cur)}</p>
            {cur.notes && <blockquote className="tr-notes">{cur.notes}</blockquote>}
            {!!cur.mood_tags?.length && <p className="op-tags">{cur.mood_tags.map((t) => <span key={t} className={`pill ${t === "injured" || t === "sick" ? "is-urgent" : "is-plain"}`}>{t}</span>)}</p>}
            {cur.checks && (
              <ul className="tr-checks" aria-label="Automatic approval checks">
                {cur.checks.map((c) => <li key={c.id} className={c.ok ? "is-ok" : "is-no"}>{c.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}{c.label}</li>)}
                {settings?.photoCheck && cur.photo_url && (v === "checking" || !v ? <li className="is-wait"><Clock size={14} aria-hidden />Checking the photo…</li> : <li className={v.ok ? "is-ok" : "is-no"}>{v.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}Photo: {v.reason}</li>)}
              </ul>
            )}
            {cur.claimed_dog_id && <p className="tr-claim">The reporter says this is <Link className="link" href={`/animal/${cur.claimed_dog_id}`} target="_blank">{animalTag({ id: cur.claimed_dog_id })}</Link>. Compare the record before linking: a likeness alone never makes two animals one.</p>}
            <div className="op-do">
              <button type="button" className="btn is-flame" disabled={busy} onClick={() => act("approve")}>Approve as new <kbd>A</kbd></button>
              {cur.claimed_dog_id && <button type="button" className="btn is-ink" disabled={busy} onClick={() => act("approve", cur.claimed_dog_id!)}>Approve as that animal</button>}
              <button type="button" className="btn" disabled={busy} onClick={() => act("reject")}>Reject <kbd>R</kbd></button>
              <button type="button" className="btn is-ghost" disabled={busy || rows.length < 2} onClick={skip}>Skip <kbd>→</kbd></button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function SightingsTable({ secret, read, reload, empty, tabs }: P<Sighting[]> & { tabs: ReactNode }) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "pass" | "held">("all");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((s) => (f === "all" || (f === "pass" ? s.passes === true : s.passes === false)) && (!q || `${lower(s.nickname)} ${lower(s.zone)} ${lower(s.notes)} ${lower(s.reporter_name)}`.includes(q.toLowerCase())));
  const cur = rows.find((s) => s.id === sel) ?? null;

  async function act(action: "approve" | "reject", dogId?: string) {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `sighting:${cur.id}`, "/api/admin/sightings", { json: { action, id: cur.id, ...(dogId ? { dogId } : {}) } },
      action === "approve" ? `“${sightingTitle(cur)}” approved ${dogId ? `as a sighting of ${animalTag({ id: dogId })}` : "as a new animal"}` : `“${sightingTitle(cur)}” rejected`);
    setR(a);
    if (a.ok) { setSel(null); await reload(); }
  }

  const cols: Col<Sighting>[] = [
    { key: "photo", head: "Photo", className: "is-photo", cell: (s) => <Photo src={s.photo_url} size="s" alt="" sensitive={describesInjury(s.notes, s.mood_tags)} /> },
    { key: "name", head: "Report", primary: true, cell: (s) => sightingTitle(s) },
    { key: "place", head: "Place", cell: (s) => place(s.zone) },
    { key: "when", head: "Reported", className: "mono", cell: (s) => since(s.created_at) },
    { key: "who", head: "By", cell: reporter },
    { key: "checks", head: "Automatic checks", cell: (s) => s.passes === undefined ? <span className="cn-unk">Not given</span> : s.passes ? <span className="pill is-care">Passes all</span> : <span className="pill is-caution">{(s.checks ?? []).filter((c) => !c.ok).length} not met</span> },
  ];

  return (
    <Pane receipt={r} idle="Choose a report to see its photo, notes and checks."
      tools={<>
        {tabs}
        <Search value={q} onChange={setQ} placeholder="Search name, place, notes" />
        <Filters label="Filter by checks" value={f} onChange={setF} options={[{ key: "all", label: "All", n: rows.length }, { key: "pass", label: "Pass every check", n: rows.filter((s) => s.passes === true).length }, { key: "held", label: "Held for a person", n: rows.filter((s) => s.passes === false).length }]} />
      </>}
      inspector={cur && (
        <Inspector kicker="New report" title={sightingTitle(cur)} onClose={() => setSel(null)}>
          <Photo src={cur.photo_url} alt="The reported animal" sensitive={describesInjury(cur.notes, cur.mood_tags)} />
          <dl className="ledger">
            <Line k="Place">{place(cur.zone)}</Line>
            <Line k="Reported">{day(cur.created_at)} · {since(cur.created_at)}</Line>
            <Line k="By">{reporter(cur)}</Line>
            {!!cur.mood_tags?.length && <Line k="Tags">{cur.mood_tags.join(", ")}</Line>}
          </dl>
          {cur.notes && <blockquote className="tr-notes">{cur.notes}</blockquote>}
          {cur.checks && <ul className="tr-checks" aria-label="Automatic approval checks">{cur.checks.map((c) => <li key={c.id} className={c.ok ? "is-ok" : "is-no"}>{c.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}{c.label}</li>)}</ul>}
          {cur.claimed_dog_id && <p className="tr-claim">The reporter says this is <Link className="link" href={`/animal/${cur.claimed_dog_id}`} target="_blank">{animalTag({ id: cur.claimed_dog_id })}</Link>. Compare the record before linking: a likeness alone never makes two animals one.</p>}
          <div className="cn-do">
            <button type="button" className="btn is-s is-flame" disabled={r === "pending"} onClick={() => act("approve")}>Approve as new</button>
            {cur.claimed_dog_id && <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={() => act("approve", cur.claimed_dog_id!)}>Approve as that animal</button>}
            <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("reject")}>Reject</button>
          </div>
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setQ(""); setF("all"); }} /> : null}
      {shown.length > 0 && <Table label="New reports table" rows={shown} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}

/* ── partner requests ─────────────────────────────────────────────── */
export function Partners({ secret, read, reload, empty, onOrgs }: P<PartnersRead> & { onOrgs: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const rows = read?.data?.requests ?? [];
  const cur = rows.find((x) => x.id === sel) ?? null;
  async function act(action: "approve" | "reject") {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `partner:${cur.id}`, "/api/admin/partners", { json: { action, id: cur.id } }, action === "approve" ? `${cur.org_name} approved: the organisation exists and the requester has access` : `${cur.org_name}'s request rejected`);
    setR(a);
    if (a.ok) { setSel(null); await reload(); }
  }
  const cols: Col<(typeof rows)[number]>[] = [
    { key: "org", head: "Organisation", primary: true, cell: (x) => x.org_name },
    { key: "area", head: "Area", cell: (x) => x.area ?? <span className="cn-unk">Not given</span> },
    { key: "who", head: "Account email", cell: (x) => x.email ?? <span className="cn-unk">Not found</span> },
    { key: "when", head: "Asked", className: "mono", cell: (x) => since(x.created_at) },
  ];
  return (
    <Pane receipt={r} idle="Choose a request to approve or reject it."
      tools={<p className="small">Approving creates the organisation and gives this person access. Their team and codes are set up in <button type="button" className="link cn-inline" onClick={onOrgs}>Organisations</button>.</p>}
      inspector={cur && (
        <Inspector kicker="Partner request" title={cur.org_name} onClose={() => setSel(null)}>
          <dl className="ledger">
            <Line k="Area">{cur.area ?? <span className="cn-unk">Not given</span>}</Line>
            <Line k="Account">{cur.email ? <Contact value={cur.email} /> : <span className="cn-unk">Email not found</span>}</Line>
            {cur.contact && cur.contact !== cur.email && <Line k="Contact">{<Contact value={cur.contact} />}</Line>}
            <Line k="Asked">{day(cur.created_at)} · {since(cur.created_at)}</Line>
          </dl>
          {cur.message && <blockquote className="tr-notes">{cur.message}</blockquote>}
          <div className="cn-do">
            <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={() => act("approve")}>Approve</button>
            <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("reject")}>Reject</button>
          </div>
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && <Table label="Partner requests table" rows={rows} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}

/* ── shared by content reports and feedback ───────────────────────── */
function statusPill(s: string) {
  return <span className={`pill ${s === "open" ? "is-caution" : s === "actioned" ? "is-care" : "is-plain"}`}>{s}</span>;
}

/* ── content reports ──────────────────────────────────────────────── */
export function Reports({ secret, read, reload, empty }: P<ContentReport[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [f, setF] = useState<"open" | "actioned" | "dismissed" | "all">("open");
  const [note, setNote] = useState("");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((x) => f === "all" || x.status === f);
  const cur = rows.find((x) => x.id === sel) ?? null;
  async function act(action: "actioned" | "dismissed" | "open") {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `report:${cur.id}`, "/api/admin/reports", { json: { id: cur.id, action, ...(action !== "open" && note.trim() ? { note: note.trim() } : {}) } },
      action === "open" ? "Report reopened" : `Report marked ${action}${cur.reporter_email ? "; the server emails the reporter" : ""}`);
    setR(a);
    if (a.ok) { setNote(""); await reload(); }
  }
  const cols: Col<ContentReport>[] = [
    { key: "reason", head: "Reason", primary: true, cell: (x) => x.reason },
    { key: "status", head: "Status", cell: (x) => statusPill(x.status) },
    { key: "who", head: "Reporter", cell: (x) => x.reporter_email ?? <span className="cn-unk">No email left</span> },
    { key: "when", head: "Received", className: "mono", cell: (x) => since(x.created_at) },
  ];
  return (
    <Pane receipt={r} idle="Choose a report to read it and resolve it."
      tools={<Filters label="Filter by status" value={f} onChange={(k) => { setF(k); setSel(null); }} options={(["open", "actioned", "dismissed", "all"] as const).map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), n: k === "all" ? rows.length : rows.filter((x) => x.status === k).length }))} />}
      inspector={cur && (
        <Inspector kicker="Content report" title={cur.reason} onClose={() => setSel(null)}>
          <dl className="ledger">
            <Line k="Status">{statusPill(cur.status)}</Line>
            <Line k="Received">{day(cur.created_at)} · {since(cur.created_at)}</Line>
            <Line k="Reporter">{cur.reporter_email ? <Contact value={cur.reporter_email} /> : <span className="cn-unk">No email left</span>}</Line>
            {cur.link && <Line k="Content"><a className="link cn-contact" href={cur.link} target="_blank" rel="noopener noreferrer">Open what was reported <ExternalLink size={13} aria-hidden /></a></Line>}
            {cur.resolution && <Line k="Note">{cur.resolution}</Line>}
          </dl>
          {cur.details && <blockquote className="tr-notes">{cur.details}</blockquote>}
          {cur.status === "open" ? (
            <>
              <label className="field"><span className="label">Note to the reporter <span className="small">(optional; included in the email and kept with the report)</span></span><textarea className="textarea cn-note" value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <div className="cn-do">
                <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={() => act("actioned")}>Actioned &amp; notify</button>
                <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("dismissed")}>Dismiss</button>
              </div>
              <p className="small">Either answer emails the reporter if they left an address.</p>
            </>
          ) : <div className="cn-do"><button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("open")}>Reopen</button></div>}
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => setF("all")} /> : null}
      {shown.length > 0 && <Table label="Content reports table" rows={shown} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}

/* ── feedback ─────────────────────────────────────────────────────── */
const KIND: Record<string, { label: string; cls: string }> = { problem: { label: "Broken", cls: "is-caution" }, idea: { label: "Idea", cls: "is-info" }, praise: { label: "Good", cls: "is-care" } };
export function FeedbackQueue({ secret, read, reload, empty }: P<Feedback[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [f, setF] = useState<"open" | "closed" | "all">("open");
  const [kind, setKind] = useState<"all" | "problem" | "idea" | "praise">("all");
  const [note, setNote] = useState("");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((x) => (f === "all" || (f === "open" ? x.status === "open" : x.status !== "open")) && (kind === "all" || x.kind === kind));
  const cur = rows.find((x) => x.id === sel) ?? null;
  async function act(action: "actioned" | "dismissed" | "open") {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `feedback:${cur.id}`, "/api/admin/feedback", { json: { id: cur.id, action, ...(action !== "open" && note.trim() ? { note: note.trim() } : {}) } }, action === "open" ? "Feedback reopened" : action === "actioned" ? "Feedback marked done" : "Feedback dismissed");
    setR(a);
    if (a.ok) { setNote(""); await reload(); }
  }
  const k = (x: Feedback) => KIND[x.kind] ?? { label: x.kind, cls: "is-plain" };
  const cols: Col<Feedback>[] = [
    { key: "kind", head: "Kind", cell: (x) => <span className={`pill ${k(x).cls}`}>{k(x).label}</span> },
    { key: "msg", head: "Message", primary: true, className: "is-clip", cell: (x) => x.message },
    { key: "page", head: "Page", className: "mono", cell: (x) => x.page ?? "—" },
    { key: "status", head: "Status", cell: (x) => statusPill(x.status) },
    { key: "when", head: "Received", className: "mono", cell: (x) => since(x.created_at) },
  ];
  return (
    <Pane receipt={r} idle="Choose a message to read it in full."
      tools={<>
        <Filters label="Filter by status" value={f} onChange={(v) => { setF(v); setSel(null); }} options={[{ key: "open", label: "Open", n: rows.filter((x) => x.status === "open").length }, { key: "closed", label: "Closed", n: rows.filter((x) => x.status !== "open").length }, { key: "all", label: "All", n: rows.length }]} />
        <Filters label="Filter by kind" value={kind} onChange={setKind} options={[{ key: "all", label: "Every kind" }, { key: "problem", label: "Broken" }, { key: "idea", label: "Idea" }, { key: "praise", label: "Good" }]} />
      </>}
      inspector={cur && (
        <Inspector kicker={`Feedback · ${k(cur).label}`} title={cur.page ?? "No page recorded"} onClose={() => setSel(null)}>
          <p className="cn-message">{cur.message}</p>
          <dl className="ledger">
            <Line k="Status">{statusPill(cur.status)}</Line>
            <Line k="Received">{day(cur.created_at)} · {since(cur.created_at)}</Line>
            <Line k="Reply to">{cur.email ? <Contact value={cur.email} /> : <span className="cn-unk">No address left</span>}</Line>
            {cur.resolution && <Line k="Note">{cur.resolution}</Line>}
          </dl>
          {cur.status === "open" ? (
            <>
              <label className="field"><span className="label">Note <span className="small">(optional; kept with the record, not sent)</span></span><textarea className="textarea cn-note" value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <div className="cn-do">
                <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={() => act("actioned")}>Done</button>
                <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("dismissed")}>Dismiss</button>
              </div>
              <p className="small">No automatic reply is sent. Write back from the address above.</p>
            </>
          ) : <div className="cn-do"><button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => act("open")}>Reopen</button></div>}
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setF("all"); setKind("all"); }} /> : null}
      {shown.length > 0 && <Table label="Feedback table" rows={shown} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}

/* ── outcomes to verify ───────────────────────────────────────────── */
export function Verify({ secret, read, reload, empty }: P<PendingCase[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const rows = read?.data ?? [];
  const cur = rows.find((x) => x.id === sel) ?? null;
  async function verify() {
    if (!cur) return;
    setR("pending");
    const a = await send<{ verified?: boolean }>(secret, `verify:${cur.id}`, "/api/admin/cases", { json: { action: "verify", id: cur.id } }, (b) => b.verified === false ? `The server accepted the request for “${cur.title}” but reported it was not verified` : `Outcome of “${cur.title}” verified`);
    setR(a);
    if (a.ok) { setSel(null); await reload(); }
  }
  const proof = (c: PendingCase) => [c.before_url && "before", c.after_url && "after"].filter(Boolean).join(" + ") || "none";
  const cols: Col<PendingCase>[] = [
    { key: "title", head: "Case", primary: true, cell: (c) => c.title },
    { key: "place", head: "Place", cell: (c) => place(c.zone) },
    { key: "outcome", head: "Outcome", cell: (c) => c.resolution ?? <span className="cn-unk">Not recorded</span> },
    { key: "proof", head: "Photos", cell: (c) => proof(c) === "none" ? <span className="cn-unk">None</span> : proof(c) },
    { key: "when", head: "Resolved", className: "mono", cell: (c) => c.resolved_at ? since(c.resolved_at) : "—" },
    { key: "who", head: "By", cell: (c) => c.assignee_name ?? <span className="cn-unk">Not recorded</span> },
  ];
  return (
    <Pane receipt={r} idle="Choose a resolved case to compare its before and after photographs."
      inspector={cur && (
        <Inspector kicker="Outcome to verify" title={cur.title} onClose={() => setSel(null)}>
          <div className="cn-proof">
            <figure><Photo src={cur.before_url} alt="Before" sensitive /><figcaption className="k">Before</figcaption></figure>
            <figure><Photo src={cur.after_url} alt="After" sensitive /><figcaption className="k">After</figcaption></figure>
          </div>
          <dl className="ledger">
            <Line k="Outcome">{cur.resolution ?? <span className="cn-unk">Not recorded</span>}</Line>
            <Line k="Resolved">{day(cur.resolved_at)}</Line>
            <Line k="By">{cur.assignee_name ?? <span className="cn-unk">Not recorded</span>}</Line>
            {cur.dog_id && <Line k="Animal"><Link className="link" href={`/animal/${cur.dog_id}`} target="_blank">{animalTag({ id: cur.dog_id })}</Link></Line>}
          </dl>
          {cur.outcome_note && <blockquote className="tr-notes">{cur.outcome_note}</blockquote>}
          <div className="cn-do"><button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={verify}>Verify outcome</button></div>
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && <Table label="Outcomes to verify table" rows={rows} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}
