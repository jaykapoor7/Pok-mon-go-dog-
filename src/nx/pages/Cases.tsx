"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, TrustChip } from "../ui";
import { Failed, Props, Skeleton, day, errText } from "../kit";
import { useLive, type Workspace } from "../live";
import { loadCaseFile, type CaseFile } from "@/lib/case-file";
import { careNote } from "@/lib/care-note";
import { isCriticalCondition, isHistorical, isOpenClass, isReasonless, isStaleFact, readCases, shortCode, statusLabel, STATUS_TONE, type CaseFact } from "../data/ngo";
import { animalLine, withAnimalName } from "../animalLabel";
import { useAnimalRefs } from "../data/animals";
import { SAMPLE_CASES, sampleFollowups, sampleHistory, type CaseRow } from "../data/ngo-sample";
import { RecordList, type RCol, type RView } from "./ngo/RecordList";
import { CaseNext, FollowupList, SampleNext, TryLink, cohortOf, useMembers } from "./ngo/parts";

/* Every case the organisation holds, on one list with views instead of separate pages: today's open work, mine, nobody's,
   critical, follow-ups due, and the cohorts that wait on a person's decision (quiet for months, imported and never
   confirmed, closed without a reason). The drawer carries the case's next step, so most work never leaves the list. */

const sev = (v: string | null) => (v ? v.replace(/^./, (c) => c.toUpperCase()) : "Normal");
const ddmm = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null);

function views(me: string | null): RView<CaseRow>[] {
  return [
    { id: "open", label: "Open", test: (r) => r.open && !r.historical && !r.stale },
    { id: "mine", label: "Mine", test: (r) => r.open && !!me && r.assigneeId === me },
    { id: "unassigned", label: "Unassigned", test: (r) => r.open && !r.historical && r.who === "Unassigned" },
    { id: "critical", label: "Critical and high", test: (r) => r.open && !r.historical && r.crit },
    { id: "due", label: "Follow-up due", test: (r) => !r.historical && r.dueSoon },
    { id: "decide", label: "Needs a decision", test: (r) => r.open && !r.historical && r.stale },
    { id: "imported", label: "Imported, not confirmed", test: (r) => r.open && r.historical },
    { id: "reason", label: "Missing reason", test: (r) => r.reasonless },
    { id: "resolved", label: "Resolved", test: (r) => !r.open },
  ];
}
/* The cohorts that only exist on some registers are shown when they hold something. */
const OPTIONAL = new Set(["decide", "imported", "reason"]);
const cols: RCol<CaseRow>[] = [
  { label: "Case", width: "minmax(0, 1.8fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.title}</b><small><span className="num">{r.code}</span>{r.animal ? ` · ${r.animal}` : ""}<span className="nr-dsk"> · {r.kind}</span><span className="nx-only-s"> · {r.place} · {r.who === "Unassigned" ? "nobody yet" : r.who}{r.overdue ? <b style={{ color: "var(--bad)", display: "inline", fontWeight: 500 }}> · Follow-up late</b> : null}</span></small></span></span> },
  { label: "Status", width: "136px", render: (r) => <Chip tone={r.tone}>{r.open ? (r.crit && r.tone === "bad" ? "Critical" : r.status) : r.status}</Chip> },
  { label: "Place", width: "minmax(0, .9fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.place}</span> },
  { label: "Held by", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2" style={r.who === "Unassigned" ? { color: "var(--ink-3)" } : undefined}>{r.who === "Unassigned" ? "Nobody yet" : r.who}</span> },
  { label: "Next", width: "minmax(0, 1.1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.due ? <><span style={r.overdue ? { color: "var(--bad)", fontWeight: 500 } : undefined}>{r.overdue ? "Late · " : ""}{r.due}</span>{r.next !== "—" ? ` · ${r.next}` : ""}</> : r.next}</span> },
  { label: "Updated", width: "88px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.updated}</span> },
];
const search = (r: CaseRow) => `${r.code} ${r.title} ${r.place} ${r.who} ${r.kind} ${r.animal ?? ""}`;

function toRow(c: CaseFact, now: number): CaseRow {
  const open = isOpenClass(c.status_class), historical = isHistorical(c), stale = open && isStaleFact(c, now), crit = isCriticalCondition(c.condition_class) || c.severity === "critical" || c.severity === "high";
  const dueAt = c.next_due ? Date.parse(c.next_due) : null, endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const status = !open ? statusLabel(c.status_class) : historical ? "Imported, not confirmed" : stale ? "Needs a decision" : c.status_class === "in_progress" ? "In progress" : c.assignee_name ? "Open" : "Unassigned";
  return {
    id: c.id, code: shortCode(c.case_code, c.id.slice(0, 8).toUpperCase()), title: c.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : c.title || "Untitled case",
    kind: c.condition_class && c.condition_class !== "Not recorded" && c.title ? c.title : sev(c.severity), severity: sev(c.severity), crit, place: c.zone ?? c.city ?? "Not recorded", who: c.assignee_name || "Unassigned", assigneeId: c.assignee_id,
    open, statusClass: c.status_class ?? "unknown", status, tone: !open ? STATUS_TONE[c.status_class ?? "unknown"] ?? "plain" : crit ? (isCriticalCondition(c.condition_class) || c.severity === "critical" ? "bad" : "warn") : stale ? "warn" : c.status_class === "in_progress" ? "accent" : "plain",
    next: c.next_action || (c.followups_upcoming ? `${c.followups_upcoming} follow-up${c.followups_upcoming === 1 ? "" : "s"}` : "—"), due: dueAt ? `Follow-up ${ddmm(c.next_due)}` : null, dueSoon: !!dueAt && dueAt <= endToday.getTime(), overdue: !!dueAt && dueAt < now,
    updated: ddmm(c.last_activity_at ?? c.occurred_at) ?? "—", updatedAt: Date.parse(c.last_activity_at ?? c.occurred_at ?? "") || 0, occurredAt: Date.parse(c.occurred_at ?? "") || 0,
    historical, stale, reasonless: isReasonless(c), trust: c.provenance && /import/i.test(c.provenance) ? "Imported" : "Recorded", animal: c.dog_id ? animalLine({ id: c.dog_id, name: c.animal_name, straypaw_id: c.straypaw_id }) : null, dogId: c.dog_id, href: `/ngo/cases/${c.id}`,
  };
}
/* Critical first, then whoever has waited longest (the classic queue's order); closed cases by their last activity. */
const order = (a: CaseRow, b: CaseRow) => Number(b.open) - Number(a.open) || (a.open ? Number(b.crit) - Number(a.crit) || a.occurredAt - b.occurredAt : b.updatedAt - a.updatedAt);

function useView(initial = "open") {
  const [v, setV] = useState(initial);
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("view"); if (q) setV(q); }, []);
  const set = useCallback((x: string) => { setV(x); try { const u = new URL(window.location.href); if (x === "open") u.searchParams.delete("view"); else u.searchParams.set("view", x); window.history.replaceState(window.history.state, "", u); } catch { /* address bar unchanged */ } }, []);
  return [v, set] as const;
}

function LiveCases({ org }: { org: Workspace }) {
  const live = useLive();
  const [data, setData] = useState<{ rows: CaseRow[]; openCapped: boolean; closedCapped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useView();
  const members = useMembers(true);
  const load = useCallback(async () => { const r = await readCases(org.org_id); if (r.error) { setError(errText(r.error)); return; } setError(null); const now = Date.now(); setData({ ...r.data!, rows: r.data!.rows.map((c) => toRow(c, now)).sort(order) }); }, [org.org_id]);
  useEffect(() => { void load(); }, [load]);
  /* Each case names its animal as the register does ("Dog 125", "Tiger (132)"), and a title written with the animal's
     code reads with that name instead; the list fills in the numbers once the organisation's animals are read. */
  const refs = useAnimalRefs(org.org_id, useMemo(() => (data?.rows ?? []).map((r) => r.dogId), [data]));
  const rows = useMemo(() => (data?.rows ?? []).map((r) => { const a = r.dogId ? refs?.get(r.dogId) : null; return a ? { ...r, animal: animalLine(a), title: withAnimalName(r.title, a), kind: withAnimalName(r.kind, a) } : r; }), [data, refs]);
  const all = views(live.userId);
  const vs = all.filter((v) => !OPTIONAL.has(v.id) || rows.some(v.test!) || v.id === view);
  const open = rows.filter((r) => r.open && !r.historical && !r.stale), crit = open.filter((r) => r.crit).length, nobody = open.filter((r) => r.who === "Unassigned").length;
  const imported = rows.filter((r) => r.open && r.historical).length, quiet = rows.filter((r) => r.open && !r.historical && r.stale).length;
  const actor = live.userId ? { id: live.userId, name: live.userName ?? "Team member" } : null;
  return (
    <Shell crumb={["NGO", "Cases"]}>
      <RecordList id="cases" title="Cases" sample={false} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => `${r.code}, ${r.title}`} columns={cols} views={vs} view={view} onView={setView} search={search} placeholder="Code, animal, place, person"
        sub={!data && !error ? "Reading cases…" : error ? "Cases could not be read. Nothing is shown as zero." : <><b className="num">{open.length}</b> open{crit ? <>, <span style={{ color: "var(--bad)" }}>{crit} critical or high</span></> : null}, {nobody} held by nobody, at {org.name}.{quiet ? ` ${quiet.toLocaleString("en-IN")} quiet for months need a decision.` : ""}{imported ? ` ${imported.toLocaleString("en-IN")} imported and not yet confirmed are kept apart, under “Imported, not confirmed”.` : ""}{data?.openCapped ? " Showing the newest 800 open cases." : ""}</>}
        action={<Link href="/ngo/cases/new" className="nx-btn is-keep nr-plus-dup"><Plus size={14} />New case</Link>}
        loading={!data && !error} error={error} onRetry={() => void load()} hrefOf={(r) => r.href}
        empty={{ none: "No cases yet", filtered: "No case in this view", hint: <>Open the first one with <Link className="nr-link" href="/ngo/cases/new">New case</Link>, or import the register you already keep.</> }}
        preview={(r) => ({ title: r.title, sub: <><span className="num">{r.code}</span> · {r.place} <Chip tone={r.tone}>{r.status}</Chip></>, href: r.href, hrefLabel: "Open the full case", body: actor ? <CaseDrawer key={r.id} id={r.id} animalName={r.dogId ? r.animal : null} role={org.role} actor={actor} members={members} onListChanged={load} /> : <p className="nx-sub">Sign in again to act on this case.</p> })} />
    </Shell>
  );
}

/** The drawer: the case's next step, its follow-ups and what happened last, read fresh with the member's session. */
function CaseDrawer({ id, animalName, role, actor, members, onListChanged }: { id: string; animalName: string | null; role: string; actor: { id: string; name: string }; members: ReturnType<typeof useMembers>; onListChanged: () => Promise<void> }) {
  const [file, setFile] = useState<CaseFile | null | "loading" | { error: string }>("loading");
  const gen = useRef(0);
  const read = useCallback(async () => { const v = ++gen.current; try { const f = await loadCaseFile(id); if (v === gen.current) setFile(f); } catch (e) { if (v === gen.current) setFile({ error: errText(e) }); } }, [id]);
  useEffect(() => { void read(); }, [read]);
  const changed = useCallback(async () => { await Promise.all([read(), onListChanged()]); }, [read, onListChanged]);
  if (file === "loading") return <Skeleton rows={5} label="Reading the case" />;
  if (file && "error" in file) return <Failed error={file.error} retry={() => void read()} />;
  if (!file) return <p className="nx-sub">This case is not in your organisation&apos;s records. It may have been removed.</p>;
  const { c, reg, updates, medical, animal } = file;
  const history = [
    ...updates.map((u) => ({ id: u.id, at: u.created_at, t: u.note || (u.to_status ? `Status → ${u.to_status.replace(/_/g, " ")}` : u.type.replace(/_/g, " ")), who: u.actor_name })),
    ...medical.map((m) => ({ id: m.id, at: m.event_date, t: `${m.kind.replace(/_/g, " ")}${careNote(m.notes) ? `: ${careNote(m.notes)}` : ""}`, who: m.performed_by })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 4);
  return (
    <>
      {reg.condition_text ? <p className="nx-sub" style={{ marginTop: -8, marginBottom: 12 }}>{reg.condition_text}</p> : null}
      <h3 className="nx-h3">Next step</h3>
      <CaseNext file={file} role={role} actor={actor} members={members} onChanged={changed} />
      <h3 className="nx-h3">Details</h3>
      <Props items={[
        ["Status", <Chip key="s" tone={STATUS_TONE[reg.status_class ?? "unknown"] ?? "plain"}>{statusLabel(reg.status_class)}</Chip>],
        ["Animal", c.dog_id ? <Link key="a" className="nr-link" href={`/ngo/animals/${c.dog_id}`}>{animalName ?? animalLine({ id: c.dog_id, name: animal?.name, straypaw_id: animal?.straypaw_id })}</Link> : "Not linked"],
        ["Place", [c.zone, reg.city].filter(Boolean).join(", ") || "Not recorded"],
        ["Held by", c.assignee_name ?? "Nobody yet"],
        ["Recorded", `${day(reg.occurred_at)}${reg.intake_channel ? ` via ${reg.intake_channel.replace(/_/g, " ")}` : ""}`],
        ...(reg.next_action ? [["Next action", reg.next_action] as [string, string]] : []),
        ["Record", <TrustChip key="t" trust={reg.provenance === "imported_historical_record" ? "Imported" : "Recorded"} />],
      ]} />
      <h3 className="nx-h3">Follow-ups <span className="nx-count">{file.followups.length}</span></h3>
      <FollowupList items={file.followups} onChanged={changed} />
      <h3 className="nx-h3">Latest <span className="nx-count">{updates.length + medical.length}</span></h3>
      {history.length ? <ul className="nr-items">{history.map((h) => <li key={h.id} className="nr-item"><span className="nr-item-t"><b>{h.t}</b><small>{day(h.at)}{h.who ? ` · ${h.who.includes("@") ? h.who.split("@")[0] : h.who}` : ""}</small></span></li>)}</ul> : <p className="nr-quiet">Nothing recorded on this case since it was opened.</p>}
      {cohortOf(file) === "history" ? <p className="nr-hint" style={{ marginTop: 10 }}>An imported case is not counted as today&apos;s work until a person confirms it.</p> : null}
    </>
  );
}

function SampleCases() {
  const all = views(null);
  const vs = all.filter((v) => !OPTIONAL.has(v.id) || SAMPLE_CASES.some(v.test!));
  const open = SAMPLE_CASES.filter((r) => r.open && !r.historical && !r.stale);
  return (
    <Shell crumb={["NGO", "Cases"]}>
      <RecordList id="cases" title="Cases" sample rows={SAMPLE_CASES} rowKey={(r) => r.id} rowLabel={(r) => `${r.code}, ${r.title}`} columns={cols} views={vs} search={search} placeholder="Code, animal, place, person"
        sub={<><b className="num">{open.length}</b> open, {open.filter((r) => r.crit).length} critical or high, {open.filter((r) => r.who === "Unassigned").length} held by nobody. Rescue, injury, sterilisation, vaccination and investigation in one list.</>}
        action={<Link href="/try" className="nx-btn is-keep nr-plus-dup" title="Opens the live demo, where this works"><Plus size={14} />New case</Link>}
        loading={false} empty={{ none: "No cases yet" }} hrefOf={(r) => r.href}
        preview={(r) => ({ title: r.title, sub: <><span className="num">{r.code}</span> · {r.place} {r.open ? <Chip tone={r.tone}>{r.status}</Chip> : <Chip tone="ok">Resolved</Chip>}</>, href: r.href, hrefLabel: "Open the full case", body: <>
          <h3 className="nx-h3">Next step</h3>
          {r.open ? <SampleNext held={r.who} /> : <p className="nr-quiet">Closed after field work.</p>}
          <h3 className="nx-h3">Details</h3>
          <Props items={[["Case", <span key="c" className="num">{r.code}</span>], ["Kind", r.kind], ["Severity", r.severity], ["Held by", r.who === "Unassigned" ? "Nobody yet" : r.who], ["Next", r.next], ["Due", r.due ?? "No date"], ["Record", <TrustChip key="t" trust={r.trust} />]]} />
          <h3 className="nx-h3">Follow-ups</h3>
          <FollowupList sample items={sampleFollowups(r.id)} onChanged={() => {}} />
          <h3 className="nx-h3">Latest</h3>
          <ul className="nr-items">{sampleHistory(r.id).slice(0, 3).map((h) => <li key={h.id} className="nr-item"><span className="nr-item-t"><b>{h.title}</b><small>{h.when} · {h.who}</small></span></li>)}</ul>
          <p style={{ marginTop: 14 }}><TryLink quiet sm>Act on this case in the live demo</TryLink></p>
        </> })} />
    </Shell>
  );
}

export function Cases() {
  const live = useLive();
  if (!live.ready || !live.org) return <SampleCases />; // in the server HTML, so it paints first; members never see it
  const org = live.orgFor("ngo");
  if (!org) return <Shell crumb={["NGO", "Cases"]}><div className="nx-page"><h1 className="nx-h1">Cases</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it has no case list of its own.</p></div></Shell>;
  return <LiveCases org={org} />;
}
