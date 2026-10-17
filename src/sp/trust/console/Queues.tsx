"use client";

/* Trust console · what is waiting on a person: new reports, partner
   requests, content reports, feedback and outcomes to verify. */

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { animalTag, givenName } from "@/lib/animal-name";
import { describesInjury } from "@/lib/sensitive-photo";
import { day, since } from "../../ui";
import { publicLocality } from "../../ui/place";
import { send, type Read } from "./api";
import { Contact, Filters, Inspector, Line, lower, NoneMatch, Pane, Photo, ReceiptLine, Search, Table, useReceipt, type Col } from "./parts";
import type { ContentReport, Feedback, PartnersRead, PendingCase, Sighting } from "./types";

export type P<T> = { secret: string; read: Read<T> | undefined; reload: () => Promise<void>; empty: ReactNode };
const place = (z: string | null) => publicLocality(z) ?? z ?? "Place not given";

/* ── new reports (sightings) ──────────────────────────────────────── */
export function Sightings({ secret, read, reload, empty }: P<Sighting[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "pass" | "held">("all");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((s) => (f === "all" || (f === "pass" ? s.passes === true : s.passes === false)) && (!q || `${lower(s.nickname)} ${lower(s.zone)} ${lower(s.notes)} ${lower(s.reporter_name)}`.includes(q.toLowerCase())));
  const cur = rows.find((s) => s.id === sel) ?? null;
  const title = (s: Sighting) => givenName(s.nickname) ?? s.nickname?.trim() ?? "New animal";
  const who = (s: Sighting) => s.reporter_kind === "organisation" ? `${s.volunteer_name || "Volunteer"} for an organisation` : s.reporter_kind === "signed-in" ? (s.reporter_name || "Signed-in reporter") : s.reporter_kind === "guest" ? (s.reporter_name || "Guest") : (s.reporter_name || "Not recorded");

  async function act(action: "approve" | "reject", dogId?: string) {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `sighting:${cur.id}`, "/api/admin/sightings", { json: { action, id: cur.id, ...(dogId ? { dogId } : {}) } },
      action === "approve" ? `“${title(cur)}” approved ${dogId ? `as a sighting of ${animalTag({ id: dogId })}` : "as a new animal"}` : `“${title(cur)}” rejected`);
    setR(a);
    if (a.ok) { setSel(null); await reload(); }
  }

  const cols: Col<Sighting>[] = [
    { key: "photo", head: "Photo", className: "is-photo", cell: (s) => <Photo src={s.photo_url} size="s" alt="" sensitive={describesInjury(s.notes, s.mood_tags)} /> },
    { key: "name", head: "Report", primary: true, cell: (s) => title(s) },
    { key: "place", head: "Place", cell: (s) => place(s.zone) },
    { key: "when", head: "Reported", className: "mono", cell: (s) => since(s.created_at) },
    { key: "who", head: "By", cell: who },
    { key: "checks", head: "Automatic checks", cell: (s) => s.passes === undefined ? <span className="cn-unk">Not given</span> : s.passes ? <span className="pill is-care">Passes all</span> : <span className="pill is-caution">{(s.checks ?? []).filter((c) => !c.ok).length} not met</span> },
  ];

  return (
    <Pane receipt={r} idle="Choose a report to see its photo, notes and checks."
      tools={<>
        <Search value={q} onChange={setQ} placeholder="Search name, place, notes" />
        <Filters label="Filter by checks" value={f} onChange={setF} options={[{ key: "all", label: "All", n: rows.length }, { key: "pass", label: "Pass every check", n: rows.filter((s) => s.passes === true).length }, { key: "held", label: "Held for a person", n: rows.filter((s) => s.passes === false).length }]} />
        <Link className="btn is-s is-ink" href="/trust">Review one at a time</Link>
      </>}
      inspector={cur && (
        <Inspector kicker="New report" title={title(cur)} onClose={() => setSel(null)}>
          <Photo src={cur.photo_url} alt="The reported animal" sensitive={describesInjury(cur.notes, cur.mood_tags)} />
          <dl className="ledger">
            <Line k="Place">{place(cur.zone)}</Line>
            <Line k="Reported">{day(cur.created_at)} · {since(cur.created_at)}</Line>
            <Line k="By">{who(cur)}</Line>
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
