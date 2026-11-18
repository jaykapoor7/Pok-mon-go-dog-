"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, MessageCircle, Sparkles, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { Confirm, Field, Modal, Props, TabBar, dayTime, errText, n, useAct, words } from "../kit";
import { REPORTS, type Tone } from "../fixtures";
import { useLive, type Workspace } from "../live";
import type { CareInboxItem } from "@/lib/careos/contract";
import { actWhatsApp, caseFromReport, fileReports, readDrives, readIncoming, readWhatsApp, type Drive, type Incoming, type WaState } from "../data/ngo";
import { SAMPLE_WA } from "../data/ngo-sample";
import { RecordList, type RCol, type RView } from "./ngo/RecordList";
import { TryLink } from "./ngo/parts";

/* Everything that arrives from outside, before it is work. A person decides what each report becomes: a case for the
   team, or an entry in a drive (which can register the animal). WhatsApp messages wait in their own threads, one per
   reporter, and one tap opens a case from a message. */

type Row = { id: string; what: string; note: string; place: string; from: string; source: string; state: string; tone: Tone; when: string; open: boolean; match?: string; photo?: string | null; help: boolean; raw?: Incoming };
type Part = "Reports" | "WhatsApp";
const MOOD: Record<string, string> = { injured: "Injured", sick: "Unwell", scared: "Scared", aggressive: "Defensive", friendly: "Friendly", hungry: "Hungry", puppy: "Puppy" };
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : m < 2880 ? "Yesterday" : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const COLS: RCol<Row>[] = [
  { label: "Report", width: "minmax(0, 1.9fr)", render: (r) => <span className="nx-cell-main"><span><b>{r.what}</b><small>{r.match ? "Possible match · " : ""}{r.note || "No note"}<span className="nx-only-s"> · {r.place}</span></small></span></span> },
  { label: "Place", width: "112px", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.place}</span> },
  { label: "From", width: "minmax(0, 1fr)", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.from}</span> },
  { label: "Source", width: "140px", hideOnPhone: true, render: (r) => <span className="nx-t2">{r.source}</span> },
  { label: "State", width: "132px", render: (r) => <Chip tone={r.tone}>{r.state}</Chip> },
  { label: "Received", width: "84px", hideOnPhone: true, render: (r) => <span className="nx-t3">{r.when}</span> },
];
const search = (r: Row) => `${r.what} ${r.note} ${r.place} ${r.from}`;

export function Inbox() {
  const live = useLive();
  const [part, setPart] = useState<Part>("Reports");
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("view"); if (v === "whatsapp") setPart("WhatsApp"); }, []);
  if (!live.ready) return <Shell crumb={["NGO", "Inbox"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  const org = live.orgFor("ngo");
  if (live.org && !org) return <Shell crumb={["NGO", "Inbox"]}><div className="nx-page"><h1 className="nx-h1">Inbox</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it has no report inbox.</p></div></Shell>;
  const tabs = <TabBar id="inbox" tabs={["Reports", "WhatsApp"] as Part[]} value={part} onChange={setPart} label="Where it came from" />;
  return (
    <Shell crumb={["NGO", "Inbox"]}>
      {part === "Reports" ? (org ? <LiveReports org={org} tabs={tabs} /> : <SampleReports tabs={tabs} />)
        : <div className="nx-page" style={{ maxWidth: "none" }}>
          <div className="nx-head"><div><h1 className="nx-h1">Inbox{org ? null : <Sample />}</h1><p className="nx-sub">Reports from your field team and residents on WhatsApp, one conversation per reporter. Reporters&apos; numbers never reach the workspace.</p></div></div>
          <div className="nr-bleed">{tabs}</div>
          {org ? <WhatsApp org={org} /> : <SampleWhatsApp />}
        </div>}
    </Shell>
  );
}

/* ── Reports ─────────────────────────────────────────────────────── */

function shape(source: string) {
  return (r: Incoming): Row => {
    const open = !/closed|resolved|dismiss|done|linked|convert|filed/i.test(r.status);
    const help = (r.mood_tags ?? []).some((m) => m === "injured" || m === "sick");
    return { id: r.id, what: r.nickname ? `“${r.nickname}”` : help ? "An animal needing help" : r.notes ? r.notes.split(/[.\n]/)[0].slice(0, 80) : "A sighting", note: r.notes ?? "", place: r.zone ?? "Place not given", from: r.reported_by || "Not recorded", source, state: words(r.status || "new"), tone: open ? (help ? "bad" : "accent") : "plain", when: ago(r.created_at), open, photo: r.photo_url, help, raw: r };
  };
}

function LiveReports({ org, tabs }: { org: Workspace; tabs: React.ReactNode }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    const [ours, community] = await Promise.all([readIncoming("ours"), readIncoming("community")]);
    if (ours.error || community.error) { setError(errText(ours.error ?? community.error)); setRows([]); return; }
    setError(null); const seen = new Set<string>();
    setRows([...(ours.data ?? []).map(shape("Sent to you")), ...(community.data ?? []).map(shape("Community near you"))].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
    setPicked((p) => new Set([...p].filter((id) => seen.has(id))));
  }, []);
  useEffect(() => { void load(); void readDrives().then((r) => setDrives(r.data ?? [])); }, [load]);
  const list = rows ?? [];
  const views: RView<Row>[] = [{ id: "open", label: "To triage", test: (r) => r.open }, { id: "help", label: "Injured or unwell", test: (r) => r.open && r.help }, { id: "done", label: "Handled", test: (r) => !r.open }, { id: "all", label: "All", test: () => true }];
  const toggle = (id: string) => setPicked((p) => { const x = new Set(p); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const waiting = list.filter((r) => r.open).length;
  return (
    <RecordList id="inbox" title="Inbox" sample={false} rows={list} rowKey={(r) => r.id} rowLabel={(r) => r.what} columns={COLS} views={views} search={search} placeholder="Find a report"
      sub={rows === null ? "Reading reports…" : <><b className="num">{n(waiting)}</b> to triage of {n(list.length)}. Reports from residents and the community near you arrive here before they become a case.{list.length >= 400 ? " Showing the 200 most recent from each source." : ""}</>}
      above={<div className="nr-bleed">{tabs}</div>} loading={rows === null} error={error} onRetry={() => void load()}
      select={{ ids: picked, toggle, label: (r) => `the report from ${r.place}` }}
      phoneTools={false} tools={picked.size ? <span className="nx-t3">{picked.size} chosen · <button type="button" className="nr-link" onClick={() => setPicked(new Set())}>clear</button></span> : <span className="nx-t3 nx-hide-s">Tick reports to file them together</span>}
      foot={picked.size ? <Decide ids={[...picked]} rows={list} drives={drives} onDone={async () => { setPicked(new Set()); await load(); }} /> : null}
      empty={{ none: "No reports yet", filtered: "Nothing in this view", hint: "Reports from residents appear here as they are sent." }}
      preview={(r) => ({ title: r.what, sub: <>{r.place} · {r.when} <Chip tone={r.tone}>{r.state}</Chip></>, body: <ReportBody r={r} picked={picked.has(r.id)} toggle={() => toggle(r.id)} /> })} />
  );
}

function ReportBody({ r, picked, toggle }: { r: Row; picked: boolean; toggle: () => void }) {
  const [show, setShow] = useState(false);
  const moods = (r.raw?.mood_tags ?? []).map((m) => MOOD[m] ?? m);
  return <>
    {r.photo ? <button type="button" className={`nr-veil ${show ? "" : "is-veiled"}`} onClick={() => setShow(true)} aria-label={show ? "Photo" : "Show the photo. It may show an injury."} style={{ marginBottom: 14 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.photo} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "cover" }} /></button> : null}
    <h3 className="nx-h3">What was reported</h3>
    <p style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{r.note || "The reporter left no note."}</p>
    {moods.length ? <div className="nr-chips">{moods.map((m) => <Chip key={m} tone={m === "Injured" || m === "Unwell" ? "bad" : "plain"}>{m}</Chip>)}</div> : null}
    <h3 className="nx-h3">Details</h3>
    <Props items={[["From", r.from], ["Source", r.source], ["Place", <span key="p">{r.place}{r.raw?.lat != null && r.raw?.lng != null ? <span className="nx-t3"> · pinned</span> : null}</span>], ["Received", r.when], ["Ear notch", r.raw?.sterilisation_status === "sterilised" ? "Seen" : r.raw?.sterilisation_status === "not_sterilised" ? "Not seen" : "Not recorded"]]} />
    {r.raw ? <div className="nr-acts" style={{ marginTop: 16 }}><Link href={caseFromReport(r.raw)} className="nx-btn is-sm">Open a case from it<ArrowRight size={13} /></Link><button type="button" className="nx-btn is-quiet is-sm" onClick={toggle} aria-pressed={picked}>{picked ? "Chosen for a drive" : "Choose for a drive"}</button></div> : null}
    <p className="nr-hint" style={{ marginTop: 10 }}>Its place and words carry over to the new case; you confirm them there. Nothing becomes a case on its own.</p>
  </>;
}

/** File the chosen reports into a drive, or open a case from exactly one. Filing records what was seen, not that it was treated. */
function Decide({ ids, rows, drives, onDone }: { ids: string[]; rows: Row[]; drives: Drive[]; onDone: () => Promise<void> }) {
  const [drive, setDrive] = useState("");
  const [claim, setClaim] = useState(true);
  const [ask, setAsk] = useState(false);
  const { busy, run } = useAct();
  const one = ids.length === 1 ? rows.find((r) => r.id === ids[0]) : null;
  const d = drives.find((x) => x.id === drive);
  return (
    <section className="nr-decide" aria-label="What the chosen reports become">
      <h2>{ids.length} {ids.length === 1 ? "report" : "reports"} chosen</h2>
      <div className="nr-decide-row"><b style={{ fontWeight: 500 }}>A case for your team</b>{one?.raw ? <Link className="nx-btn is-sm" href={caseFromReport(one.raw)}>Open a case from it<ArrowRight size={13} /></Link> : <span className="nx-t3">Choose exactly one report to open a case.</span>}</div>
      <div className="nr-decide-row"><b style={{ fontWeight: 500 }}>An entry in a drive</b>
        <select className="nr-sel" value={drive} onChange={(e) => setDrive(e.target.value)} aria-label="Drive"><option value="">Choose a drive…</option>{drives.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <label className="nr-claim"><input type="checkbox" checked={claim} onChange={(e) => setClaim(e.target.checked)} />Register the animals as ours</label>
        <button type="button" className="nx-btn is-quiet is-sm" disabled={!drive || !!busy} onClick={() => setAsk(true)}>File {ids.length} into the drive…</button>
      </div>
      {!drives.length ? <p className="nr-hint">No drive yet. Start one in <Link className="nr-link" href="/ngo/programmes">Programmes</Link>.</p> : null}
      {ask && d ? <Confirm title={`File ${ids.length} ${ids.length === 1 ? "report" : "reports"} into ${d.name}?`} confirm="File them" busy={!!busy} onClose={() => setAsk(false)} onConfirm={() => void run("file", () => fileReports(ids, d.id, claim), { ok: (x) => `Filed ${x.data?.filed ?? 0} ${x.data?.filed === 1 ? "report" : "reports"}${x.data?.registered ? `, ${x.data.registered} new ${x.data.registered === 1 ? "animal" : "animals"} registered` : ""}.` }).then((r) => { if (r.ok) { setAsk(false); void onDone(); } })}>
        <p>Each report is recorded as seen in this drive{claim ? ", and animals not yet on your register are registered as your organisation's" : ""}. Filing records a sighting, not a treatment.</p>
      </Confirm> : null}
    </section>
  );
}

function SampleReports({ tabs }: { tabs: React.ReactNode }) {
  const rows = useMemo<Row[]>(() => REPORTS.map((r) => ({ ...r, open: r.state !== "Closed" && r.state !== "Assigned", help: r.tone === "bad" })), []);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const views: RView<Row>[] = [{ id: "open", label: "To triage", test: (r) => r.open }, { id: "match", label: "Possible match", test: (r) => r.open && !!r.match }, { id: "done", label: "Handled", test: (r) => !r.open }, { id: "all", label: "All", test: () => true }];
  return (
    <RecordList id="inbox" title="Inbox" sample rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.what} columns={COLS} views={views} search={search} placeholder="Find a report"
      sub={<><b className="num">{rows.filter((r) => r.open).length}</b> to triage of {rows.length}. Reports from residents and partners arrive here before they become a case.</>}
      above={<div className="nr-bleed">{tabs}</div>} loading={false} empty={{ none: "No reports yet" }}
      select={{ ids: picked, toggle: (id) => setPicked((p) => { const x = new Set(p); if (x.has(id)) x.delete(id); else x.add(id); return x; }), label: (r) => `the report from ${r.place}` }}
      foot={picked.size ? <section className="nr-decide"><h2>{picked.size} chosen</h2><div className="nr-decide-row"><TryLink sm>Open a case from it</TryLink><TryLink sm quiet>File into a drive</TryLink></div></section> : null}
      preview={(r) => ({ title: r.what, sub: <>{r.place} · {r.when} <Chip tone={r.tone}>{r.state}</Chip></>, body: <>
        <h3 className="nx-h3">What was reported</h3><p style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{r.note || "The reporter left no note."}</p>
        <h3 className="nx-h3">Details</h3><Props items={[["From", r.from], ["Source", r.source], ["Place", r.place], ["Received", r.when]]} />
        {r.match ? <><h3 className="nx-h3"><Sparkles size={12} style={{ color: "var(--accent)" }} />Could be an animal already on the register</h3><p className="nx-note"><span><b style={{ color: "var(--ink)" }}>{r.match}</b><br />Suggested from the place and the description. Nothing is linked until a person confirms it.</span></p></> : null}
        <div className="nr-acts" style={{ marginTop: 16 }}><TryLink sm>Open a case</TryLink><TryLink sm quiet>Link to an animal</TryLink><TryLink sm quiet>File into a drive</TryLink></div>
      </> })} />
  );
}

/* ── WhatsApp ────────────────────────────────────────────────────── */

const URGENCY: Record<string, string> = { emergency: "Emergency", urgent: "Urgent", routine: "Routine", unknown: "" };
/* A reporter who has not shared a name is told apart by the end of their opaque handle, never their number. */
const who = (m: CareInboxItem) => m.reporter_name ?? `Reporter ${(m.reporter_handle ?? "").replace(/-/g, "").slice(-4).toUpperCase()}`.trim();
const DISMISS = ["Not an animal-care matter", "Duplicate of another report", "Spam or a wrong number", "Already handled elsewhere"];
function WhatsApp({ org }: { org: Workspace }) {
  const [st, setSt] = useState<WaState | null>(null);
  const [on, setOn] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [title, setTitle] = useState("");
  const [dismiss, setDismiss] = useState(false);
  const [why, setWhy] = useState(DISMISS[0]);
  const [other, setOther] = useState("");
  const [shown, setShown] = useState<Set<string>>(new Set());
  const { busy, run } = useAct();
  const load = useCallback(async () => setSt(await readWhatsApp()), []);
  useEffect(() => { void load(); }, [load]);
  const threads = useMemo(() => {
    if (st?.kind !== "ok") return [];
    const by = new Map<string, CareInboxItem[]>();
    for (const m of st.items) by.set(m.thread_id, [...(by.get(m.thread_id) ?? []), m]);
    return [...by.values()].map((ms) => ms.sort((a, b) => a.received_at.localeCompare(b.received_at))).sort((a, b) => b[b.length - 1].received_at.localeCompare(a[a.length - 1].received_at));
  }, [st]);
  if (!st) return <p className="nr-quiet" role="status" style={{ marginTop: 16 }}>Reading WhatsApp…</p>;
  if (st.kind === "unlinked") return <div className="nx-empty" style={{ marginTop: 12 }}><MessageCircle size={20} /><b>WhatsApp is not linked yet</b><p>Link the organisation&apos;s WhatsApp Business number to receive reports with photos, voice notes and location. {org.role === "admin" ? "You can link it in the organisation's settings, under Connections." : "An admin of your organisation links it in the organisation's settings, under Connections."}</p></div>;
  if (st.kind === "error") return <div className="nx-empty is-bad" role="alert" style={{ marginTop: 12 }}><b>WhatsApp messages could not be read</b><p>{errText(st.detail)}</p><button type="button" className="nx-btn is-quiet" onClick={() => { setSt(null); void load(); }}>Try again</button></div>;
  const thread = threads.find((t) => t[0].thread_id === on) ?? threads[0] ?? null;
  const last = thread?.[thread.length - 1] ?? null;
  if (!thread || !last) return <div className="nx-empty" style={{ marginTop: 12 }}><MessageCircle size={20} /><b>No WhatsApp messages waiting</b><p>New reports from your team and residents appear here as they arrive.</p></div>;
  const act = (fn: () => ReturnType<typeof actWhatsApp>, ok: string) => run("wa", fn, { ok }).then((r) => { if (r.ok) { setOpening(false); setTitle(""); setDismiss(false); void load(); } });
  return (
    <div className="nr-wa">
      <ul className="nr-wa-list" aria-label="Conversations">{threads.map((t) => { const m = t[t.length - 1]; const sel = m.thread_id === last.thread_id; return <li key={m.thread_id}><button type="button" aria-current={sel ? "true" : undefined} onClick={() => { setOn(m.thread_id); setOpening(false); setDismiss(false); }}><span className="nr-av">{who(m).slice(0, 1)}</span><span style={{ minWidth: 0 }}><b>{who(m)}</b><small>{m.text_en ?? m.text ?? (m.media.length ? "Photo or voice note" : "Shared a location")}</small></span><span className="nx-t3">{ago(m.received_at)}{m.urgency === "emergency" || m.urgency === "urgent" ? <><br /><Chip tone={m.urgency === "emergency" ? "bad" : "warn"}>{URGENCY[m.urgency]}</Chip></> : null}</span></button></li>; })}</ul>
      <div className="nr-wa-th">
        <header><b>{who(last)}</b><small>{dayTime(thread[0].received_at)} · {last.status === "linked" ? "Linked to a case" : last.owner_name ? `With ${last.owner_name}` : "New"}</small></header>
        <ol className="nr-msgs">{thread.map((m) => <li key={m.id}>
          {m.media.map((x) => x.kind === "image" ? <button key={x.id} type="button" className={`nr-veil ${x.sensitive && !shown.has(x.id) ? "is-veiled" : ""}`} onClick={() => setShown((s) => new Set(s).add(x.id))} aria-label={x.sensitive && !shown.has(x.id) ? "Show the photo. It may show an injury." : "Photo"}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={x.url} alt="" /></button> : x.kind === "audio" ? <audio key={x.id} controls src={x.url} /> : <a key={x.id} href={x.url} className="nr-link" target="_blank" rel="noopener noreferrer">Open the attachment</a>)}
          {m.text ? <p>{m.text}</p> : null}{m.text_en && m.text_en !== m.text ? <p className="nr-tr">{m.text_en}</p> : null}
          {m.location ? <p className="nx-t3"><MapPin size={12} style={{ verticalAlign: "-2px" }} /> {m.location.label ?? "Shared location"}</p> : null}
          <small>{dayTime(m.received_at)}</small></li>)}</ol>
        <div className="nr-acts">
          {last.status === "linked" && last.linked_case_id ? <Link className="nx-btn is-sm" href={`/ngo/cases/${last.linked_case_id}`}>Open the case<ArrowRight size={13} /></Link> : opening ? (
            <form className="nr-sheet" style={{ width: "100%" }} onSubmit={(e) => { e.preventDefault(); if (title.trim()) void act(() => actWhatsApp({ type: "open_case", item_id: last.id, dog_id: last.linked_dog_id, title: title.trim(), severity: last.urgency === "emergency" ? "critical" : last.urgency === "urgent" ? "high" : "normal" }), "Case opened from the message."); }}>
              <Field label="Case title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Injured dog near the market" autoFocus maxLength={200} /></Field>
              <p className="nr-hint">Severity follows the message: {last.urgency === "emergency" ? "critical" : last.urgency === "urgent" ? "high" : "normal"}. You can change it on the case.</p>
              <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!!busy || !title.trim()}>Open the case</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setOpening(false)}>Cancel</button></div>
            </form>
          ) : <>
            {!last.owner_id ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void act(() => actWhatsApp({ type: "claim", item_id: last.id }), "It is yours.")}><CheckCircle2 size={13} />Take it</button> : null}
            <button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => { setOpening(true); setTitle(""); }}>Open a case</button>
            <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setDismiss(true)}><X size={13} />Dismiss…</button>
          </>}
        </div>
      </div>
      {dismiss ? <Modal title="Dismiss this message?" onClose={() => setDismiss(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setDismiss(false)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy || (why === "Other" && !other.trim())} onClick={() => void act(() => actWhatsApp({ type: "dismiss", item_id: last.id, reason: why === "Other" ? other.trim() : why }), "Dismissed, with the reason kept.")}>Dismiss</button></>}>
        <Field label="Reason"><select value={why} onChange={(e) => setWhy(e.target.value)}>{[...DISMISS, "Other"].map((d) => <option key={d}>{d}</option>)}</select></Field>
        {why === "Other" ? <Field label="Say why"><input value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} /></Field> : null}
        <p className="nr-hint">The reason is kept with the message. Nothing is sent to the reporter.</p>
      </Modal> : null}
    </div>
  );
}

function SampleWhatsApp() {
  return (
    <div className="nr-wa">
      <ul className="nr-wa-list" aria-label="Conversations">{SAMPLE_WA.map((m, i) => <li key={m.id}><button type="button" aria-current={i === 0 ? "true" : undefined}><span className="nr-av">{m.who.slice(0, 1)}</span><span style={{ minWidth: 0 }}><b>{m.who}</b><small>{m.text}</small></span><span className="nx-t3">{ago(m.at)}{m.urgency === "urgent" ? <><br /><Chip tone="warn">Urgent</Chip></> : null}</span></button></li>)}</ul>
      <div className="nr-wa-th"><header><b>{SAMPLE_WA[0].who}</b><small>New</small></header><ol className="nr-msgs"><li><p>{SAMPLE_WA[0].text}</p><small>{dayTime(SAMPLE_WA[0].at)}</small></li></ol>
        <div className="nr-acts"><TryLink sm quiet>Take it</TryLink><TryLink sm>Open a case</TryLink><TryLink sm quiet>Dismiss…</TryLink></div></div>
    </div>
  );
}
