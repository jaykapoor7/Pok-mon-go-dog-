"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardPlus, Download, Info, List as ListIcon, Loader2, MapPinned, ScanLine } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, TrustChip } from "../ui";
import { Confirm, Field, Modal, Props, Timeline, day, errText, n, toast, useAct, words } from "../kit";
import { ANIMALS, TIMELINE, type Animal } from "../fixtures";
import { useLive, type Workspace } from "../live";
import { AnimalCell, AnimalPhoto, AnimalTitle } from "../AnimalPhoto";
import { animalLabel, animalSearch, type AnimalRef } from "../animalLabel";
import { useAnimalPhotos } from "../data/animals";
import { downloadCsv } from "@/lib/csv";
import { publicFlagOn } from "@/lib/flags";
import { operationRpc, verifyOperationReceipt, type OperationReceipt } from "@/lib/operations";
import { identityCandidates, lookupIdentifier, newestCaseOf, readAnimals, readIdentityQueue, readRevacDue, readRevacSetting, readZones, setNeedsHelp, type AnimalQuery, type IdentityRow, type OrgAnimal, type Revac, type RevacDue } from "../data/ngo";
import { RecordList, type RCol, type RView } from "./ngo/RecordList";
import { PhotoSearch } from "./ngo/PhotoSearch";
import { TryLink, isLead, undoWith } from "./ngo/parts";

/* The organisation's register. The database filters and pages it (org_animals), so a register of thousands never comes
   into the browser: search, lenses (needs help, not sterilised, not vaccinated, due for revaccination when a programme
   sets an interval), a place filter and a download of the current result. Each animal shows its photo and is named the
   one way the whole workspace names it (animalLabel: its name, or "Dog 128" from its register code). The same register,
   with the same filters, can be seen as a map. Leads and coordinators also see the animals waiting for an identity
   decision; with tags switched on, anyone can scan a tag to open its animal. */

/* MapLibre is heavy, so the map loads only when it is chosen. */
const AnimalMap = dynamic(() => import("../AnimalMap").then((m) => m.AnimalMap), { ssr: false, loading: () => <div className="am-wrap is-solo"><div className="am-map"><div className="am-say is-wait" role="status"><div><span>Opening the map…</span></div></div></div></div> });

const PAGE = 25;
type Lens = "all" | "help" | "ster" | "vacc" | "revac" | "identity";
type Layout = "list" | "map";
const factTone = (v: string | null) => (v === "sterilised" || v === "vaccinated" ? "ok" : v === "not_sterilised" || v === "not_vaccinated" ? "warn" : "plain") as "ok" | "warn" | "plain";
const fact = (v: string | null, yes: string, no: string) => (v === "sterilised" || v === "vaccinated" ? yes : v === "not_sterilised" || v === "not_vaccinated" ? no : "Not recorded");
/** "128, from the register code YEL-128": the number a team uses, and the code it came from. */
export const numberFact = (a: AnimalRef) => { const l = animalLabel(a); return l.tag ? <span className="num">{l.tag}{l.code && l.code !== l.tag ? <span className="nx-t3"> · code {l.code}</span> : !l.fromCode ? <span className="nx-t3"> · from its StrayPaw ID</span> : null}</span> : "Not recorded"; };

/** List or map, kept in the address so a map can be shared or reopened (?view=map). */
function useLayout(): [Layout, (l: Layout) => void] {
  const [layout, set] = useState<Layout>("list");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("view") === "map") set("map"); }, []);
  const choose = useCallback((l: Layout) => { set(l); try { const u = new URL(window.location.href); if (l === "map") u.searchParams.set("view", "map"); else if (u.searchParams.get("view") === "map") u.searchParams.delete("view"); window.history.replaceState(window.history.state, "", u); } catch { /* address unchanged */ } }, []);
  return [layout, choose];
}
function LayoutSwitch({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  return (
    <div className="am-switch" role="group" aria-label="Show the animals as">
      <button type="button" aria-pressed={value === "list"} onClick={() => onChange("list")}><ListIcon size={14} aria-hidden />List</button>
      <button type="button" aria-pressed={value === "map"} onClick={() => onChange("map")}><MapPinned size={14} aria-hidden />Map</button>
    </div>
  );
}

export function Animals() {
  const live = useLive();
  if (!live.ready || !live.org) return <SampleAnimals />; // in the server HTML, so it paints first; members never see it
  const org = live.orgFor("ngo");
  if (!org) return <Shell crumb={["NGO", "Animals"]}><div className="nx-page"><h1 className="nx-h1">Animals</h1><p className="nx-sub">{live.org.name} is not an NGO workspace, so it has no animal register of its own.</p></div></Shell>;
  return <LiveAnimals org={org} />;
}

/* ── Live ────────────────────────────────────────────────────────── */

function LiveAnimals({ org }: { org: Workspace }) {
  const lead = isLead(org.role);
  const tags = publicFlagOn("animal_identifiers");
  const [lens, setLens] = useState<Lens>("all");
  const [layout, setLayout] = useLayout();
  const [zone, setZone] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(0);
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);
  const [rv, setRv] = useState<Revac | null>(null);
  const [scan, setScan] = useState(false);
  useEffect(() => { void readZones().then((r) => setZones(r.data ?? [])); void readRevacSetting().then((r) => setRv(r.data ?? null)); }, []);
  /* A link can open the register at one place: /ngo/animals?place=Indiranagar. */
  /* Read again once the places have loaded: arriving by an in-app link, the address can settle after the first paint. */
  const linked = useRef(false);
  useEffect(() => { if (linked.current) return; const p = new URLSearchParams(window.location.search).get("place"); if (p) { linked.current = true; setZone(p.slice(0, 80)); setPage(0); } }, [zones.length]);
  useEffect(() => { const t = window.setTimeout(() => { setDq(q); setPage(0); }, 260); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("view"); if (v === "identity" && lead) setLens("identity"); if (v === "help" || v === "ster" || v === "vacc") setLens(v); if (v === "scan" && tags) setScan(true); }, [lead, tags]);
  /* The map draws the register's own lenses; the revaccination and identity lists are lists. */
  const choose = (l: string) => { setLens(l as Lens); setPage(0); if (l === "revac" || l === "identity") setLayout("list"); };
  const show = (l: Layout) => { setLayout(l); if (l === "map" && (lens === "revac" || lens === "identity")) setLens("all"); };
  const revacOn = !!rv?.days;
  const [counts, setCounts] = useState<Partial<Record<Lens, number>>>({});
  const views: RView<unknown>[] = [
    { id: "all", label: "All" }, { id: "help", label: "Needs help" }, { id: "ster", label: "Not sterilised" }, { id: "vacc", label: "Not vaccinated" },
    ...(revacOn ? [{ id: "revac", label: "Due for revaccination", count: (rv!.overdue ?? 0) + (rv!.soon ?? 0) }] : []),
    ...(lead ? [{ id: "identity", label: "Identity review" }] : []),
  ].map((v) => ({ ...v, count: "count" in v ? v.count : counts[v.id as Lens] ?? null }));
  /* List or map sits with the page's actions: it changes how the whole register is shown, not what is in it. */
  const action = <div className="nr-tools"><LayoutSwitch value={layout} onChange={show} />{tags ? <button type="button" className="nx-btn is-quiet is-keep" onClick={() => setScan(true)}><ScanLine size={14} />Scan a tag</button> : null}<Link href="/ngo/field?record=1" className="nx-btn is-keep"><Camera size={14} />Record an animal</Link></div>;
  const setCount = useCallback((l: Lens, c: number) => setCounts((x) => (x[l] === c ? x : { ...x, [l]: c })), []);
  const common = { org, views, lens, choose, action, setCount };
  return (
    <Shell crumb={["NGO", "Animals"]}>
      {lens === "revac" && rv ? <RevacList {...common} setting={rv} page={page} setPage={setPage} />
        : lens === "identity" && lead ? <IdentityList {...common} />
        : <Register {...common} layout={layout} zone={zone} setZone={(z) => { setZone(z); setPage(0); }} zones={zones} q={q} setQ={setQ} dq={dq} page={page} setPage={setPage} />}
      {scan ? <ScanTag onClose={() => setScan(false)} /> : null}
    </Shell>
  );
}
type Common = { org: Workspace; views: RView<unknown>[]; lens: Lens; choose: (l: string) => void; action: React.ReactNode; setCount: (l: Lens, c: number) => void };

function Pager({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= PAGE) return null;
  const last = Math.max(0, Math.ceil(total / PAGE) - 1);
  return <div className="nr-pager" role="navigation" aria-label="Pages"><button type="button" className="nx-btn is-quiet is-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span><b className="num">{n(page * PAGE + 1)}–{n(Math.min(total, (page + 1) * PAGE))}</b> of {n(total)}</span><button type="button" className="nx-btn is-quiet is-sm" disabled={page >= last} onClick={() => setPage(page + 1)}>Next</button></div>;
}

function Register({ org, views, lens, choose, action, setCount, layout, zone, setZone, zones, q, setQ, dq, page, setPage }: Common & { layout: Layout; zone: string; setZone: (z: string) => void; zones: { zone: string; n: number }[]; q: string; setQ: (s: string) => void; dq: string; page: number; setPage: (p: number) => void }) {
  const [rows, setRows] = useState<OrgAnimal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState(false);
  const filter = useMemo<Omit<AnimalQuery, "limit" | "offset">>(() => ({ search: animalSearch(dq), zone: zone || null, needs: lens === "help" ? true : null, ster: lens === "ster" ? "not_sterilised" : null, vacc: lens === "vacc" ? "not_vaccinated" : null }), [dq, zone, lens]);
  const photos = useAnimalPhotos(org.org_id, rows);
  const load = useCallback(async () => { setRows(null); setError(null); const r = await readAnimals({ ...filter, limit: PAGE, offset: page * PAGE }); if (r.error) { setError(errText(r.error)); setRows([]); } else setRows(r.data ?? []); }, [filter, page]);
  useEffect(() => { void load(); }, [load]);
  const total = rows?.[0]?.total_count ?? 0;
  useEffect(() => { if (rows) setCount(lens, total); }, [rows, total, lens, setCount]);
  const download = async () => {
    setCsv(true);
    const all: OrgAnimal[] = [];
    for (let off = 0; off < Math.min(total, 10000); off += 500) { const r = await readAnimals({ ...filter, limit: 500, offset: off }); if (r.error) { toast({ text: `The download stopped: ${errText(r.error)}`, tone: "bad" }); setCsv(false); return; } all.push(...(r.data ?? [])); if ((r.data ?? []).length < 500) break; }
    downloadCsv("straypaw-animals.csv", all.map((a) => ({ straypaw_id: a.straypaw_id, code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, last_seen: a.last_seen })), { title: "Animals", organisation: org.name });
    toast({ text: `Downloaded ${n(all.length)} ${all.length === 1 ? "animal" : "animals"}${total > all.length ? ` of ${n(total)}` : ""}.`, tone: "ok" });
    setCsv(false);
  };
  const cols: RCol<OrgAnimal>[] = [
    { label: "Animal", width: "minmax(0, 2fr)", render: (a) => <AnimalCell a={a} photo={photos.get(a.id)} /> },
    { label: "Sterilisation", width: "128px", hideOnPhone: true, render: (a) => <Chip tone={factTone(a.sterilisation_status)}>{fact(a.sterilisation_status, "Sterilised", "Not sterilised")}</Chip> },
    { label: "Vaccination", width: "128px", hideOnPhone: true, render: (a) => <Chip tone={factTone(a.vaccination_status)}>{fact(a.vaccination_status, "Vaccinated", "Not vaccinated")}</Chip> },
    { label: "Status", width: "112px", render: (a) => (a.needs_help ? <Chip tone="bad">Needs help</Chip> : <span className="nx-t3">—</span>) },
    { label: "Last seen", width: "104px", hideOnPhone: true, render: (a) => <span className="nx-t3">{day(a.last_seen)}</span> },
  ];
  return (
    <RecordList id="animals" serverSide title="Animals" sample={false} rows={rows ?? []} rowKey={(a) => a.id} rowLabel={(a) => animalLabel(a).line} columns={cols} views={views} view={lens} onView={choose}
      query={q} onQuery={setQ} placeholder="Name, number, code or place" hrefOf={(a) => `/ngo/animals/${a.id}`}
      sub={rows === null ? "Reading the register…" : error ? "The register could not be read. Nothing is shown as zero." : <><b className="num">{n(total)}</b> {filterOn(filter) ? (total === 1 ? "match" : "matches") : total === 1 ? "animal" : "animals"} on {org.name}&apos;s register. Unknown is kept apart from no.</>}
      action={action} loading={rows === null} error={error} onRetry={() => void load()}
      tools={<div className="nr-tools"><select className="nr-sel" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Place"><option value="">Every place</option>{zones.slice(0, 300).map((z) => <option key={z.zone} value={z.zone}>{z.zone} ({n(z.n)})</option>)}</select>
        {layout === "list" ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!total || csv} onClick={() => void download()}>{csv ? <Loader2 size={13} className="nx-spin" /> : <Download size={13} />}Download</button> : null}</div>}
      empty={{ none: "No animals on the register yet", filtered: filterOn(filter) ? "No animal matches" : "No animals on the register yet", hint: filterOn(filter) ? "Change the search, the lens or the place." : <>Animals your team records, and rows released from imports, appear here. <Link className="nr-link" href="/ngo/field?record=1">Record the first one</Link>.</> }}
      foot={<Pager page={page} total={total} setPage={setPage} />}
      replace={layout === "map" ? <AnimalMap ngoId={org.org_id} query={{ search: filter.search, zone: filter.zone, needs: filter.needs, ster: filter.ster, vacc: filter.vacc }} /> : undefined}
      preview={(a) => ({ title: <AnimalTitle a={a} />, sub: <>{a.zone ?? "Place not recorded"} · last seen {day(a.last_seen)}</>, href: `/ngo/animals/${a.id}`, hrefLabel: "Open full record",
        body: <AnimalPeek a={a} photo={photos.get(a.id)} onChanged={load} /> })} />
  );
}
const filterOn = (f: Omit<AnimalQuery, "limit" | "offset">) => !!(f.search || f.zone || f.needs || f.ster || f.vacc);

/** The photo at the top of the drawer, or one quiet line saying there is none yet. */
function PeekPhoto({ photo, label }: { photo: string | null | undefined; label: string }) {
  if (photo) return <div className="am-photos"><AnimalPhoto src={photo} size="hero" alt={`Photo of ${label}`} /></div>;
  return <div className="am-photos" style={{ display: "flex", gap: 12, alignItems: "center" }}><AnimalPhoto src={null} />{photo === null ? <p className="am-none">No photo yet. Photos taken in field mode, when the animal is recorded or released, appear here.</p> : <p className="am-none">Looking for a photo…</p>}</div>;
}

function AnimalPeek({ a, photo, onChanged }: { a: OrgAnimal; photo: string | null | undefined; onChanged: () => Promise<void> }) {
  const { busy, run } = useAct();
  const [help, setHelp] = useState(a.needs_help);
  const flip = async () => {
    const to = !help;
    const r = await run("help", () => setNeedsHelp(a.id, to), { ok: to ? "Flagged as needing help." : "Needs-help flag cleared.", undo: () => undoWith(() => setNeedsHelp(a.id, !to), async () => { setHelp(!to); await onChanged(); })() });
    if (r.ok) { setHelp(to); await onChanged(); }
  };
  const l = animalLabel(a);
  return <>
    <PeekPhoto photo={photo} label={l.line} />
    <Props items={[["Number", numberFact(a)], ["Name", l.name ?? "No name given"], ["Place", a.zone ?? "Not recorded"],
      ["Sterilisation", <Chip key="s" tone={factTone(a.sterilisation_status)}>{fact(a.sterilisation_status, "Sterilised", "Not sterilised")}</Chip>],
      ["Vaccination", <Chip key="v" tone={factTone(a.vaccination_status)}>{fact(a.vaccination_status, "Vaccinated", "Not vaccinated")}</Chip>],
      ["Needs help", help ? <Chip key="h" tone="bad">Yes</Chip> : "No"], ["First recorded", day(a.created_at)]]} />
    <div className="nr-acts" style={{ marginTop: 14 }}>
      <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void flip()}>{help ? "Clear the needs-help flag" : "Flag as needing help"}</button>
      <Link href={`/ngo/cases/new?dog=${a.id}`} className="nx-btn is-quiet is-sm"><ClipboardPlus size={13} />Start a case</Link>
    </div>
  </>;
}

function RevacList({ org, views, lens, choose, action, setting, page, setPage }: Common & { setting: Revac; page: number; setPage: (p: number) => void }) {
  const [rows, setRows] = useState<RevacDue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setRows(null); const r = await readRevacDue(PAGE, page * PAGE); if (r.error) { setError(errText(r.error)); setRows([]); } else { setError(null); setRows(r.data ?? []); } }, [page]);
  useEffect(() => { void load(); }, [load]);
  const photos = useAnimalPhotos(org.org_id, rows);
  const total = rows?.[0]?.total_count ?? 0;
  const cols: RCol<RevacDue>[] = [
    { label: "Animal", width: "minmax(0, 1.5fr)", render: (a) => <AnimalCell a={a} photo={photos.get(a.id)} sub={<>{a.zone ?? "Place not recorded"} · last vaccinated {day(a.last_vaccinated)}</>} /> },
    { label: "Due on", width: "120px", hideOnPhone: true, render: (a) => <span className="nx-t3">{day(a.due_on)}</span> },
    { label: "Status", width: "140px", render: (a) => <Chip tone={a.days_overdue > 0 ? "bad" : "warn"}>{a.days_overdue > 0 ? `${a.days_overdue} day${a.days_overdue === 1 ? "" : "s"} overdue` : a.days_overdue === 0 ? "Due today" : `Due in ${-a.days_overdue} day${a.days_overdue === -1 ? "" : "s"}`}</Chip> },
  ];
  return (
    <RecordList id="animals" serverSide title="Animals" sample={false} rows={rows ?? []} rowKey={(a) => a.id} rowLabel={(a) => animalLabel(a).line} columns={cols} views={views} view={lens} onView={choose} hrefOf={(a) => `/ngo/animals/${a.id}`}
      sub={<>{setting.overdue ? <span style={{ color: "var(--bad)" }}>{n(setting.overdue)} overdue</span> : "None overdue"}{setting.soon ? <>, <b className="num">{n(setting.soon)}</b> due in the next 14 days</> : null}. Every {setting.days} days{setting.programme ? `, as ${setting.programme} sets` : ""}, from the last vaccination recorded on each animal.</>}
      action={action} loading={rows === null} error={error} onRetry={() => void load()}
      tools={<div className="nr-tools"><button type="button" className="nx-btn is-quiet is-sm" disabled={!rows?.length} onClick={() => downloadCsv("straypaw-revaccination.csv", (rows ?? []).map((r) => ({ straypaw_id: r.straypaw_id, code: r.code, name: r.name, zone: r.zone, last_vaccinated: r.last_vaccinated, due_on: r.due_on, days_overdue: r.days_overdue })), { title: "Due for revaccination", organisation: org.name })}><Download size={13} />Download this page</button></div>}
      empty={{ none: "No animal is due", filtered: "No animal is due", hint: "Animals appear here 14 days before their revaccination date." }}
      foot={<><Pager page={page} total={total} setPage={setPage} />{setting.undated ? <p className="nr-hint" style={{ marginTop: 10 }}>{n(setting.undated)} {setting.undated === 1 ? "animal is" : "animals are"} marked vaccinated with no dated vaccination, so {setting.undated === 1 ? "it" : "they"} cannot be placed here. Add the date on {setting.undated === 1 ? "its" : "each"} record.</p> : null}</>}
      preview={(a) => ({ title: <AnimalTitle a={a} />, sub: <>{a.zone ?? "Place not recorded"}</>, href: `/ngo/animals/${a.id}`, hrefLabel: "Open full record",
        body: <><PeekPhoto photo={photos.get(a.id)} label={animalLabel(a).line} /><Props items={[["Last vaccinated", day(a.last_vaccinated)], ["Due on", day(a.due_on)], ["Interval", `${setting.days} days`]]} /><p className="nr-hint" style={{ marginTop: 12 }}>Record the new vaccination on the animal&apos;s record; it then leaves this list.</p></> })} />
  );
}

function IdentityList({ org, views, lens, choose, action, setCount }: Common) {
  const live = useLive();
  const [rows, setRows] = useState<IdentityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await readIdentityQueue(org.org_id); if (r.error) { setError(errText(r.error)); setRows([]); } else { setError(null); setRows(r.data ?? []); setCount("identity", (r.data ?? []).length); } }, [org.org_id, setCount]);
  useEffect(() => { void load(); }, [load]);
  const photos = useAnimalPhotos(org.org_id, rows);
  /* Telling two animals apart is done by eye: the photo and the markings lead, with the stored code beside them. */
  const cols: RCol<IdentityRow>[] = [
    { label: "Animal", width: "minmax(0, 1.2fr)", render: (a) => <AnimalCell a={a} photo={photos.get(a.id)} sub={a.identifiers || "Markings not recorded"} /> },
    { label: "Code", width: "120px", hideOnPhone: true, render: (a) => <span className="nx-t2 num">{a.code ?? "None"}</span> },
    { label: "Markings", width: "minmax(0, 1.4fr)", hideOnPhone: true, render: (a) => <span className="nx-t2">{a.identifiers || "Not recorded"}</span> },
    { label: "Identity", width: "150px", render: (a) => <Chip tone="warn">{words(a.identity_state)}</Chip> },
  ];
  return (
    <RecordList id="animals" serverSide title="Animals" sample={false} rows={rows ?? []} rowKey={(a) => a.id} rowLabel={(a) => animalLabel(a).line} columns={cols} views={views} view={lens} onView={choose} hrefOf={(a) => `/ngo/animals/${a.id}`}
      sub={rows === null ? "Reading animals waiting for a decision…" : rows.length ? <><b className="num">{rows.length}</b> {rows.length === 1 ? "animal waits" : "animals wait"} for an identity decision{rows.length >= 100 ? " (the newest 100)" : ""}. Choose one to record the decision; both source histories are kept and nothing merges.</> : "No animal is marked provisional or a possible duplicate."}
      action={action} loading={rows === null} error={error} onRetry={() => void load()}
      empty={{ none: "Nothing to confirm", filtered: "Nothing to confirm", hint: "No animal is marked provisional or a possible duplicate." }}
      foot={publicFlagOn("animal_id") ? <PhotoSearch ngoId={org.org_id} admin={org.role === "admin"} /> : null}
      preview={(a, close) => ({ title: <AnimalTitle a={a} />, sub: <>{a.code ? `Code ${a.code}` : "No code"} · {words(a.identity_state)}</>, href: `/ngo/animals/${a.id}`, hrefLabel: "Open the animal's history",
        body: live.userId ? <IdentityDecision key={a.id} a={a} ngoId={org.org_id} userId={live.userId} onDone={async () => { close(); await load(); }} /> : null })} />
  );
}

/** An identity decision is a recorded operation on the animal's newest case (operations_record_event, kind identification). */
function IdentityDecision({ a, ngoId, userId, onDone }: { a: IdentityRow; ngoId: string; userId: string; onDone: () => Promise<void> }) {
  const [decision, setDecision] = useState("confirmed_distinct");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<IdentityRow[]>([]);
  const [candidate, setCandidate] = useState("");
  const [reason, setReason] = useState("");
  const [caseId, setCaseId] = useState<string | null | undefined>(undefined);
  const [ask, setAsk] = useState(false);
  const requests = useRef(new Map<string, { id: string; at: string }>());
  const { busy, run } = useAct();
  useEffect(() => { void newestCaseOf(ngoId, a.id).then((r) => setCaseId(r.error ? null : r.data ?? null)); }, [ngoId, a.id]);
  useEffect(() => { if (decision === "confirmed_distinct" || search.trim().length < 2) { setMatches([]); return; } const t = window.setTimeout(() => { void identityCandidates(ngoId, a.id, search).then(setMatches); }, 300); return () => window.clearTimeout(t); }, [search, decision, ngoId, a.id]);
  const ready = !!caseId && reason.trim().length >= 3 && (decision === "confirmed_distinct" || !!candidate);
  const save = async () => {
    const key = JSON.stringify([caseId, reason, decision, candidate]);
    let req = requests.current.get(key); if (!req) { req = { id: crypto.randomUUID(), at: new Date().toISOString() }; requests.current.set(key, req); }
    const payload = { template: "lifecycle-v1", occurredAt: req.at, notes: reason.trim(), identityDecision: decision, ...(decision !== "confirmed_distinct" ? { candidateId: candidate } : {}) };
    const r = await run("id", async () => { try { const x = await operationRpc<OperationReceipt>("operations_record_event", { p_request: req!.id, p_case: caseId, p_kind: "identification", p_payload: payload, p_policy: null }); await verifyOperationReceipt(x, "animal_operation_events", userId, { case_id: caseId, kind: "identification" }, req!.id); return {}; } catch (e) { return { error: errText(e) }; } }, { ok: "Identity decision saved; the source and audit were checked." });
    if (r.ok) { setAsk(false); await onDone(); }
  };
  if (caseId === undefined) return <p className="nr-quiet">Reading the animal&apos;s case…</p>;
  if (caseId === null) return <p className="nr-err">This animal has no case, so the decision has nowhere to be recorded. <Link className="nr-link" href={`/ngo/cases/new?dog=${a.id}`}>Open a case for it</Link> first.</p>;
  return (
    <form className="nr-sheet" onSubmit={(e) => { e.preventDefault(); if (ready) setAsk(true); }}>
      <Field label="Decision"><select value={decision} onChange={(e) => { setDecision(e.target.value); setCandidate(""); }}><option value="confirmed_distinct">Confirmed as a distinct animal</option><option value="possible_duplicate">Possible duplicate, needs investigation</option><option value="linked_existing">References an existing animal; both records kept</option></select></Field>
      {decision !== "confirmed_distinct" ? <>
        <Field label="Find the related animal"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, tag or markings" /></Field>
        <Field label="Related animal"><select required value={candidate} onChange={(e) => setCandidate(e.target.value)}><option value="">{matches.length ? "Choose the matching record" : "Search above first"}</option>{matches.map((m) => <option key={m.id} value={m.id}>{animalLabel(m).line}{m.code ? ` · code ${m.code}` : ""} · {m.identifiers ?? "no markings"}</option>)}</select></Field>
      </> : null}
      <Field label="Evidence and reason"><textarea required minLength={3} maxLength={4000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What you compared: marks, photos, place and dates" /></Field>
      <p className="nr-hint">Identity review never deletes or merges an animal history.</p>
      <div className="nr-acts"><button type="submit" className="nx-btn is-sm" disabled={!ready || !!busy}>Record the decision…</button></div>
      {ask ? <Confirm title="Record this identity decision?" confirm="Record it" busy={!!busy} onClose={() => setAsk(false)} onConfirm={() => void save()}><p>It is saved on the animal&apos;s newest case with your name and reason. Both source histories are kept.</p></Confirm> : null}
    </form>
  );
}

/** Scan a microchip, RFID tag or QR code, or type it. Your own animals open; another organisation's tag is only reported as registered elsewhere. */
function ScanTag({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [said, setSaid] = useState<{ tone: "ok" | "bad" | "plain"; text: string } | null>(null);
  const [camera, setCamera] = useState(false);
  const { busy, run } = useAct();
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
  const find = async (raw: string) => {
    const v = raw.trim(); if (v.length < 3) return; setSaid(null);
    const r = await run("scan", () => lookupIdentifier(v), { quiet: true });
    if (!r.ok) { setSaid({ tone: "bad", text: r.error ?? "The lookup failed. Nothing was changed." }); return; }
    const h = r.result?.data;
    if (!h?.found) setSaid({ tone: "plain", text: "No animal carries this identifier. Search the register, and add it from the animal's record." });
    else if (!h.own) setSaid({ tone: "plain", text: "Registered with another organisation." });
    else if (h.dog_id) { setSaid({ tone: "ok", text: `Opening ${animalLabel({ id: h.dog_id, name: h.name, straypaw_id: h.straypaw_id }).line}…` }); router.push(`/ngo/animals/${h.dog_id}`); }
  };
  return (
    <Modal title="Scan a tag" onClose={onClose}>
      <p className="nx-sub" style={{ marginTop: 0 }}>A handheld reader types the number and Enter. Your own animals open directly.</p>
      <form className="nr-acts" onSubmit={(e) => { e.preventDefault(); void find(value); }}>
        <input className="nr-scan-in" style={{ flex: 1, minWidth: 0, height: 38, borderRadius: 8, border: 0, boxShadow: "inset 0 0 0 1px var(--line-2)", background: "var(--bg)", color: "var(--ink)", padding: "0 10px", font: "inherit" }} autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Scan or type an identifier" aria-label="Identifier" autoComplete="off" spellCheck={false} maxLength={80} />
        <button type="submit" className="nx-btn" disabled={!!busy || value.trim().length < 3}>{busy ? <Loader2 size={13} className="nx-spin" /> : null}Find</button>
        {canScan ? <button type="button" className="nx-btn is-quiet" onClick={() => setCamera(true)}><Camera size={13} />Use camera</button> : null}
      </form>
      <div aria-live="polite">{said ? <p className={said.tone === "bad" ? "nr-err" : said.tone === "ok" ? "nr-ok" : "nx-sub"}>{said.text}</p> : null}</div>
      {camera ? <QrScan onClose={() => setCamera(false)} onRead={(t) => { setCamera(false); setValue(t); void find(t); }} /> : null}
    </Modal>
  );
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
/** Camera QR reading where the browser supports it. */
export function QrScan({ onRead, onClose }: { onRead: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState("Point the camera at the QR code.");
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, alive = true;
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Ctor) { setMsg("This browser cannot read QR codes with the camera. Type the code instead."); return; }
    const det = new Ctor({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s; if (video.current) { video.current.srcObject = s; void video.current.play(); }
      const tick = async () => { if (!alive || !video.current) return; try { const c = await det.detect(video.current); if (c[0]?.rawValue) { onRead(c[0].rawValue); return; } } catch { /* keep looking */ } raf = requestAnimationFrame(() => void tick()); };
      raf = requestAnimationFrame(() => void tick());
    }).catch(() => setMsg("Camera access was not allowed. Type the code instead."));
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onRead]);
  return <div style={{ display: "grid", gap: 8 }}><video ref={video} playsInline muted style={{ width: "100%", borderRadius: 10, background: "var(--side)" }} /><p className="nx-sub">{msg}</p><button type="button" className="nx-btn is-quiet is-sm" onClick={onClose}>Stop the camera</button></div>;
}

/* ── Sample ──────────────────────────────────────────────────────── */

const sTone = (v: string) => (/^(Sterilised|Vaccinated|Verified)$/.test(v) ? "ok" : /Due|review/i.test(v) ? "warn" : "plain") as "ok" | "warn" | "plain";
const SAMPLE_HELP = new Set(["AN-0951", "AN-1042"]);
const SVIEWS: RView<Animal>[] = [
  { id: "all", label: "All", test: () => true },
  { id: "help", label: "Needs help", test: (a) => SAMPLE_HELP.has(a.id) },
  { id: "ster", label: "Not sterilised", test: (a) => a.abc !== "Sterilised" },
  { id: "vacc", label: "Not vaccinated", test: (a) => a.arv !== "Vaccinated" },
  { id: "identity", label: "Identity to review", test: (a) => a.identity === "Needs review" },
];
/** A sample animal as the live register names it: its sample ID is its register code. */
export const sampleRef = (a: Animal) => ({ id: a.id, name: a.name, code: a.id, species: a.species, zone: a.ward });
const SCOLS: RCol<Animal>[] = [
  { label: "Animal", width: "minmax(0, 2fr)", render: (a) => <AnimalCell a={sampleRef(a)} photo={null} sub={`${a.ward} · ${a.sex} · ${a.age}`} /> },
  { label: "Sterilisation", width: "120px", hideOnPhone: true, render: (a) => <Chip tone={sTone(a.abc)}>{a.abc}</Chip> },
  { label: "Vaccination", width: "112px", hideOnPhone: true, render: (a) => <Chip tone={sTone(a.arv)}>{a.arv}</Chip> },
  { label: "Record", width: "96px", render: (a) => <TrustChip trust={a.trust} /> },
  { label: "Last seen", width: "84px", hideOnPhone: true, render: (a) => <span className="nx-t3">{a.last}</span> },
];
function SampleAnimals() {
  const [layout, setLayout] = useLayout();
  const map = layout === "map" ? (
    <div className="am-wrap is-solo"><div className="am-map"><div className="am-say"><div><b>Your animals, where they were last recorded</b><span>Sign in as a member of an NGO to see your organisation&apos;s animals on a map. Only your own organisation&apos;s animals are ever on it.</span><span>The public map of every city is on <Link href="/explore" className="nr-link">Explore</Link>.</span><TryLink quiet sm>Open the live demo</TryLink></div></div></div></div>
  ) : undefined;
  return (
    <Shell crumb={["NGO", "Animals"]}>
      <RecordList id="animals" title="Animals" sample rows={ANIMALS} rowKey={(a) => a.id} rowLabel={(a) => animalLabel(sampleRef(a)).line} columns={SCOLS} views={SVIEWS} search={(a) => `${a.id} ${animalLabel(sampleRef(a)).tag} ${a.name} ${a.ward} ${a.mark}`} placeholder="Name, number, code or place"
        sub={<><b className="num">{ANIMALS.length}</b> animals on the register. Each row says how far its record has been checked.</>}
        action={<div className="nr-tools"><LayoutSwitch value={layout} onChange={setLayout} /><TryLink quiet><ScanLine size={14} />Scan a tag</TryLink><Link href="/ngo/field?record=1" className="nx-btn is-keep"><Camera size={14} />Record an animal</Link></div>}
        tools={layout === "list" ? <TryLink quiet sm><Download size={13} />Download</TryLink> : null} loading={false} empty={{ none: "No animals yet" }} hrefOf={(a) => `/ngo/animals/${a.id}`}
        replace={map}
        preview={(a) => ({ title: <AnimalTitle a={sampleRef(a)} />, sub: <>{a.ward} · Last seen {a.last} <TrustChip trust={a.trust} /></>, href: `/ngo/animals/${a.id}`, hrefLabel: "Open full record", body: <SampleBody a={a} /> })} />
    </Shell>
  );
}
export function SampleBody({ a, photo = true }: { a: Animal; photo?: boolean }) {
  return <>
    {photo ? <PeekPhoto photo={null} label={animalLabel(sampleRef(a)).line} /> : null}
    <Props items={[["Number", numberFact(sampleRef(a))], ["Species", a.species], ["Sex", a.sex], ["Est. age", a.age], ["Place", a.ward], ["Marks", a.mark],
      ["Sterilisation", <Chip key="s" tone={sTone(a.abc)}>{a.abc}</Chip>], ["Vaccination", <Chip key="v" tone={sTone(a.arv)}>{a.arv}</Chip>], ["Identity", <Chip key="d" tone={sTone(a.identity)}>{a.identity}</Chip>], ["Next", a.next]]} />
    <h3 className="nx-h3">Activity and medical history</h3>
    <Timeline items={TIMELINE.slice(0, 3).map((e) => ({ id: e.title, when: e.when, who: e.by, title: e.title, body: e.body, tone: e.tone === "ok" ? "ok" : e.tone === "accent" ? "accent" : undefined }))} />
    <p className="nx-note"><Info size={13} /><span>A field record, a clinician&apos;s signature and a municipal verification are three separate steps.</span></p>
    <div className="nr-acts" style={{ marginTop: 14 }}><TryLink quiet sm>Flag as needing help</TryLink><TryLink quiet sm><ClipboardPlus size={13} />Start a case</TryLink></div>
  </>;
}
