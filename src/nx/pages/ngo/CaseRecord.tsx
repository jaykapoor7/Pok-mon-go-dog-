"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, MapPin, PawPrint } from "lucide-react";
import { Shell } from "../../Shell";
import { Chip, Sample, TrustChip } from "../../ui";
import { Failed, Props, RecordHead, Section, Skeleton, TabBar, Timeline, day, dayTime, errText, words, type TItem } from "../../kit";
import { useLive, type Workspace } from "../../live";
import { loadCaseFile, type CaseFile, type Neighbour } from "@/lib/case-file";
import { careNote } from "@/lib/care-note";
import { realName, shortCode, statusLabel, STATUS_TONE } from "../../data/ngo";
import { SAMPLE_CASES, sampleFollowups, sampleHistory } from "../../data/ngo-sample";
import { CareForm, CaseNext, DeleteRecord, FollowupList, OpsEvents, SampleNext, TryLink, cohortOf, useMembers } from "./parts";

/* One case, read top to bottom as it happened: what it is and who holds it, the one next step the person's role
   allows, its follow-ups, the story so far with who recorded each part, photos, care and movements, and the other
   cases on the same animal or in the same area. Read with the member's own session; every action waits for the
   database's answer. */

type Tab = "Overview" | "History" | "Care and movements" | "Related";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CaseRecord({ id }: { id: string }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Cases", "…"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  if (!live.org || !UUID.test(id)) return <SampleRecord id={id} />;
  const org = live.orgFor("ngo");
  if (!org) return <Shell crumb={["Cases", "Case"]}><div className="nx-page"><h1 className="nx-h1">Case</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it holds no cases.</p></div></Shell>;
  return <LiveRecord id={id} org={org} />;
}

function LiveRecord({ id, org }: { id: string; org: Workspace }) {
  const live = useLive();
  const router = useRouter();
  const [file, setFile] = useState<CaseFile | null | "loading" | { error: string }>("loading");
  const [tab, setTab] = useState<Tab>("Overview");
  const members = useMembers(true);
  const gen = useRef(0);
  const read = useCallback(async () => { const v = ++gen.current; try { const f = await loadCaseFile(id); if (v === gen.current) setFile(f); } catch (e) { if (v === gen.current) setFile({ error: errText(e) }); } }, [id]);
  useEffect(() => { void read(); }, [read]);
  const actor = live.userId ? { id: live.userId, name: live.userName ?? "Team member" } : null;

  if (file === "loading") return <Shell crumb={["Cases", "…"]}><div className="nx-page"><Skeleton rows={8} label="Reading the case" /></div></Shell>;
  if (file && "error" in file) return <Shell crumb={["Cases", "Case"]}><div className="nx-page"><Failed error={file.error} retry={() => void read()} /></div></Shell>;
  if (!file) return <Shell crumb={["Cases", "Not found"]}><div className="nx-page"><h1 className="nx-h1">This case is not in {org.name}&apos;s records</h1><p className="nx-sub">It may belong to another organisation, have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/cases" className="nx-btn is-quiet">Back to Cases</Link></p></div></Shell>;

  const { c, reg, animal, updates, medical, followups, neighbours, sameAnimal } = file;
  const code = shortCode(reg.case_code, c.id.slice(0, 8).toUpperCase());
  const title = reg.condition_class && reg.condition_class !== "Not recorded" ? reg.condition_class : c.title;
  const cohort = cohortOf(file);
  const imported = reg.provenance === "imported_historical_record";
  const place = [c.zone, reg.city].filter(Boolean).join(", ");
  const photos = [c.before_url, ...(c.photos ?? []), c.after_url].filter(Boolean).slice(0, 12) as string[];

  /* The story so far: updates and notes, care, and follow-ups, newest first, each with who recorded it and its delete. */
  const story: (TItem & { at: number })[] = [
    ...updates.map((u) => ({ id: `u${u.id}`, at: Date.parse(u.created_at), when: dayTime(u.created_at), who: u.actor_name?.includes("@") ? u.actor_name.split("@")[0] : u.actor_name, tone: u.type === "note" ? undefined : ("accent" as const),
      title: u.note || (u.to_status ? `Status → ${u.to_status.replace(/_/g, " ")}` : words(u.type)), action: <DeleteRecord kind="update" id={u.id} what={u.type === "note" ? "this note" : "this update"} onDone={read} /> })),
    ...medical.map((m) => ({ id: `m${m.id}`, at: Date.parse(m.event_date), when: day(m.event_date), who: m.performed_by, tone: "ok" as const,
      title: words(m.kind), body: careNote(m.notes) || undefined, action: <DeleteRecord kind="care" id={m.id} what="this care record" onDone={read} /> })),
    ...followups.map((f) => ({ id: `f${f.id}`, at: Date.parse(f.completed_at ?? f.due_at), when: day(f.completed_at ?? f.due_at), tone: f.status === "done" ? ("ok" as const) : f.status === "missed" ? ("warn" as const) : undefined,
      title: `Follow-up · ${words(f.kind, "recheck")} · ${f.status === "upcoming" || f.status === "postponed" ? `due ${day(f.due_at)}` : words(f.status).toLowerCase()}`, body: f.note ?? undefined, action: <DeleteRecord kind="followup" id={f.id} what="this follow-up" onDone={read} /> })),
  ].sort((a, b) => b.at - a.at);
  const tabs: [Tab, number | undefined][] = [["Overview", undefined], ["History", story.length], ["Care and movements", undefined], ["Related", neighbours.length + sameAnimal.length || undefined]];

  const props: [string, ReactNode][] = [
    ["Status", <Chip key="s" tone={STATUS_TONE[reg.status_class ?? "unknown"] ?? "plain"}>{statusLabel(reg.status_class)}</Chip>],
    ["Animal", c.dog_id ? <Link key="a" className="nr-link" href={`/next/ngo/animals/${c.dog_id}`}>{realName(animal?.name) ?? (animal?.straypaw_id ? shortCode(animal.straypaw_id) : "Animal record")}</Link> : "Not linked"],
    ["Place", <span key="p">{place || "Not recorded"} <span className="nx-t3">{reg.location_precision ? words(reg.location_precision).toLowerCase() : reg.h3_r8 ? "recorded area" : "no location"}</span></span>],
    ["Recorded", <span key="r">{day(reg.occurred_at)}{reg.intake_channel ? <span className="nx-t3"> via {reg.intake_channel.replace(/_/g, " ")}</span> : null}</span>],
    ["Held by", c.assignee_name ?? "Nobody yet"],
    ["Severity", words(c.severity)],
    ["Category", words(c.category)],
    ...(reg.hospital ? [["Clinic", reg.hospital] as [string, ReactNode]] : []),
    ...(reg.next_action ? [["Next action", reg.next_action] as [string, ReactNode]] : []),
    ...(reg.first_action_at ? [["First action", day(reg.first_action_at)] as [string, ReactNode]] : []),
    ...(c.informer_contact ? [["Informer", <span key="i">{c.informer_contact} <span className="nx-t3">private to your organisation</span></span>] as [string, ReactNode]] : []),
    ...(c.resolution ? [["Outcome", `${words(c.resolution === "sterilized" ? "sterilised" : c.resolution)}${c.outcome_note ? ` · ${c.outcome_note}` : ""}`] as [string, ReactNode]] : []),
    ["Record", <TrustChip key="t" trust={imported ? "Imported" : "Recorded"} />],
  ];

  return (
    <Shell crumb={["Cases", code]}>
      <RecordHead av={<PawPrint size={18} />} title={<><span className="num">{code}</span> · {title}</>}
        sub={<>{place || "Place not recorded"} · recorded {day(reg.occurred_at)} · {c.assignee_name ? <>held by <b>{c.assignee_name}</b></> : "nobody holds it yet"}</>}
        chips={<><Chip tone={STATUS_TONE[reg.status_class ?? "unknown"] ?? "plain"}>{statusLabel(reg.status_class)}</Chip>{imported ? <Chip>Imported record</Chip> : null}{cohort === "decide" ? <Chip tone="warn">Waiting on a decision</Chip> : null}</>}
        actions={<><Link href="/next/ngo/cases" className="nx-btn is-quiet is-sm">All cases</Link><DeleteRecord kind="case" id={c.id} what="this case" label="Delete case" onDone={() => router.push("/next/ngo/cases")} onRestored={() => router.push(`/next/ngo/cases/${c.id}`)} /></>} />
      {reg.condition_text || c.description ? <p className="nr-lede">{reg.condition_text || c.description}</p> : null}
      <TabBar id="case" tabs={tabs} value={tab} onChange={setTab} label="Case sections" />
      {tab === "Overview" ? (
        <div className="nx-rec">
          <section aria-label="Properties"><h3 className="nx-h3">Properties</h3><Props items={props} />
            {reg.h3_r8 ? <p className="nr-hint" style={{ marginTop: 10 }}><MapPin size={12} style={{ verticalAlign: "-2px" }} /> The exact point stays private to your organisation; shared views show only the area.</p> : null}</section>
          <div>
            {actor ? <Section title="Next step"><CaseNext file={file} role={org.role} actor={actor} members={members} onChanged={read} /></Section> : <p className="nx-sub">Sign in again to act on this case.</p>}
            <Section title="Follow-ups" count={followups.length}><FollowupList items={followups} onChanged={read} /></Section>
            <Section title="The story so far" count={story.length} action={story.length > 6 ? <button type="button" className="nx-link" onClick={() => setTab("History")}>See all {story.length}</button> : undefined}>
              <Timeline items={story.slice(0, 6)} empty="Nothing recorded yet. A note, a status change or care on this case appears here, with who recorded it." />
            </Section>
          </div>
          <aside aria-label="Photos and related">
            <h3 className="nx-h3">Photographs <span className="nx-count">{photos.length}</span></h3>
            {photos.length ? <Photos urls={photos} /> : <p className="nr-quiet">No photo on this case yet. A photo added with the outcome appears here.</p>}
            <h3 className="nx-h3">On the same animal <span className="nx-count">{sameAnimal.length}</span></h3>
            <Related rows={sameAnimal.slice(0, 5)} none={c.dog_id ? "No other case on this animal." : "Link an animal to see its other cases."} />
            <h3 className="nx-h3">In the same area <span className="nx-count">{neighbours.length}</span></h3>
            <Related rows={neighbours.slice(0, 5)} none={reg.h3_r8 ? "No other case recorded in this area." : "This case has no location, so its area is not known."} />
            {neighbours.length > 5 || sameAnimal.length > 5 ? <p style={{ marginTop: 8 }}><button type="button" className="nx-link nr-link" onClick={() => setTab("Related")}>See all related cases</button></p> : null}
          </aside>
        </div>
      ) : tab === "History" ? (
        <div className="nx-page" style={{ maxWidth: 820 }}><Timeline items={story} empty="Nothing recorded on this case yet." /><p className="nr-hint" style={{ marginTop: 8 }}>Deleting moves an entry to removed records for 30 days. Undo brings it back straight away.</p></div>
      ) : tab === "Care and movements" ? (
        <div className="nx-page" style={{ maxWidth: 900 }}>
          <OpsEvents caseId={c.id} role={org.role} userId={live.userId} />
          {c.dog_id ? <Section title="Record a care event"><CareForm dogId={c.dog_id} caseId={c.id} onSaved={read} /></Section> : <p className="nr-hint" style={{ marginTop: 16 }}>Link an animal to this case to record a care event on it.</p>}
        </div>
      ) : (
        <div className="nx-page nx-two" style={{ marginTop: 0 }}>
          <Section title="On the same animal" count={sameAnimal.length}><Related rows={sameAnimal} none={c.dog_id ? "No other case on this animal." : "This case is not linked to an animal."} /></Section>
          <Section title="In the same area" count={neighbours.length}><Related rows={neighbours} none={reg.h3_r8 ? "No other case recorded in this area." : "This case has no location."} />{neighbours.length >= 60 ? <p className="nr-hint">The 60 most recent are shown.</p> : null}</Section>
        </div>
      )}
    </Shell>
  );
}

function Related({ rows, none }: { rows: Neighbour[]; none: string }) {
  if (!rows.length) return <p className="nr-quiet">{none}</p>;
  return <div className="nx-rel">{rows.map((r) => <Link key={r.id} href={`/next/ngo/cases/${r.id}`}><ArrowUpRight size={13} /><span className="num">{shortCode(r.case_code)}</span><span style={{ color: "var(--ink-3)" }}>{r.condition_class && r.condition_class !== "Not recorded" ? r.condition_class : r.title ?? "Request"}</span><small>{statusLabel(r.status_class)} · {day(r.occurred_at)}</small></Link>)}</div>;
}

/** Photos may show an injury, so each starts blurred and shows on a tap. */
function Photos({ urls }: { urls: string[] }) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  return <div className="nr-photos">{urls.map((u, i) => shown.has(i)
    ? <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="is-shown" aria-label={`Open photo ${i + 1}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={u} alt={`Case photo ${i + 1}`} /></a>
    : <a key={i} href={u} role="button" aria-label={`Show photo ${i + 1}. It may show an injury.`} onClick={(e) => { e.preventDefault(); setShown((s) => new Set(s).add(i)); }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={u} alt="" /><span>Tap to show</span></a>)}</div>;
}

function SampleRecord({ id }: { id: string }) {
  const r = SAMPLE_CASES.find((x) => x.id === id);
  const [tab, setTab] = useState<Tab>("Overview");
  const history = useMemo(() => sampleHistory(id), [id]);
  if (!r) return <Shell crumb={["Cases", id]}><div className="nx-page"><h1 className="nx-h1">No case with this reference</h1><p className="nx-sub">It may have been removed, or the link is wrong.</p><p style={{ marginTop: 16 }}><Link href="/next/ngo/cases" className="nx-btn is-quiet">Back to Cases</Link></p></div></Shell>;
  const items: TItem[] = history.map((h) => ({ id: h.id, when: h.when, who: h.who, title: h.title, tone: h.kind === "care" ? "ok" : h.kind === "status" ? "accent" : undefined }));
  return (
    <Shell crumb={["Cases", r.code]}>
      <RecordHead av={<PawPrint size={18} />} title={<><span className="num">{r.code}</span> · {r.title}<Sample /></>} sub={<>{r.place} · {r.kind} · {r.who === "Unassigned" ? "nobody holds it yet" : <>held by <b>{r.who}</b></>}</>}
        chips={<Chip tone={r.tone}>{r.status}</Chip>} actions={<><Link href="/next/ngo/cases" className="nx-btn is-quiet is-sm">All cases</Link><TryLink sm quiet>Delete case</TryLink></>} />
      <TabBar id="case" tabs={[["Overview", undefined], ["History", items.length], ["Care and movements", undefined], ["Related", undefined]] as [Tab, number | undefined][]} value={tab} onChange={setTab} label="Case sections" />
      {tab === "Overview" ? (
        <div className="nx-rec">
          <section aria-label="Properties"><h3 className="nx-h3">Properties</h3><Props items={[["Status", <Chip key="s" tone={r.tone}>{r.status}</Chip>], ["Animal", r.animal ? <Link key="a" className="nr-link" href={`/next/ngo/animals/${r.animal}`}>{r.animal}</Link> : "Not linked"], ["Place", r.place], ["Held by", r.who === "Unassigned" ? "Nobody yet" : r.who], ["Severity", r.severity], ["Kind", r.kind], ["Next action", r.next], ["Record", <TrustChip key="t" trust={r.trust} />]]} /></section>
          <div>
            <Section title="Next step">{r.open ? <SampleNext held={r.who} /> : <p className="nr-quiet">Closed after field work.</p>}</Section>
            <Section title="Follow-ups" count={sampleFollowups(id).length}><FollowupList sample items={sampleFollowups(id)} onChanged={() => {}} /></Section>
            <Section title="The story so far" count={items.length}><Timeline items={items} /></Section>
          </div>
          <aside aria-label="Photos and related"><h3 className="nx-h3">Photographs</h3><p className="nr-quiet">Sample cases carry no photographs.</p><h3 className="nx-h3">Related</h3><p className="nr-quiet">In the live demo, the other cases on the same animal and in the same area are listed here.</p></aside>
        </div>
      ) : tab === "History" ? <div className="nx-page" style={{ maxWidth: 820 }}><Timeline items={items} /></div>
        : tab === "Care and movements" ? <div className="nx-page" style={{ maxWidth: 820 }}><p className="nx-sub">Capture, release, transfer, vaccination and other steps are recorded here, each with who reported it, and a coordinator confirms or returns each one.</p><p style={{ marginTop: 14 }}><TryLink sm>Record care or movement</TryLink></p></div>
        : <div className="nx-page"><p className="nx-sub">Other cases on the same animal and in the same area appear here in the live demo.</p></div>}
    </Shell>
  );
}
