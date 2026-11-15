"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ImagePlus, Plus } from "lucide-react";
import { OPERATION_LABELS, type WorkflowPolicy } from "@/lib/operations";
import { MODULES, type Area, type Status } from "@/lib/readiness";
import { FLAGS, type Flag } from "@/lib/flags";
import { useRead } from "@/oh/data";
import { leadOrCoord, read, readDeadline, readPolicies, readProfile, requestFor, saveDeadline, savePolicy, saveProfile, uploadImage, type OrgProfile } from "../../data/ngo-setup";
import { Confirm, Failed, Field, FilePick, Modal, Skeleton, errText, useAct } from "../../kit";
import { Chip } from "../../ui";
import type { Tone } from "../../fixtures";
import { Shell, type Ws } from "../../Shell";
import { useLive } from "../../live";
import { Grid, Holding, TabbedPage, Tools, TryLink, useTab, useWho, type GCol, type Who } from "./frame";
import { ConnectionsPanel } from "./Connections";
import { S_POLICIES, S_PROFILE } from "./sample";

/* Settings: the organisation's public profile, the reporting deadline Kaju works to, workflow policies by version,
   connections, and an honest list of what is live in StrayPaw. Saved through the same functions classic uses
   (ngo_update_profile, kaju_set_report_deadline, operations_save_policy, /api/connections*). */

const TABS = [{ slug: "profile", label: "Profile" }, { slug: "deadline", label: "Report deadline" }, { slug: "policies", label: "Policies" }, { slug: "connections", label: "Connections" }, { slug: "connected", label: "What is connected" }] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Settings"];
export const NGO_SETTINGS_BACK = "/ngo/settings?tab=connections";

export function Settings({ tab: initial, flags }: { tab?: string | null; flags: Flag[] }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Settings" text={<>Your organisation is not an NGO workspace. Your own connections are under <Link className="ns-link" href="/settings">your settings</Link>.</>} />;
  return (
    <TabbedPage id="set" crumb={CRUMB} title="Settings" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample}
      sub="The organisation's public profile, its reporting date and procedure policies, the tools connected to Kaju, and what is live."
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "Profile" ? <Profile who={who} />
        : tab === "Report deadline" ? <Deadline who={who} />
        : tab === "Policies" ? <Policies who={who} />
        : tab === "Connections" ? <ConnectionsPanel back={NGO_SETTINGS_BACK} sample={who.sample} />
        : <Readiness flags={flags} sample={who.sample} />}
    </TabbedPage>
  );
}

/* ── Profile (ngo_update_profile; logo and cover uploaded as classic did) ── */
type F = { mission: string; about: string; website: string; contact_email: string; contact_phone: string; city: string; state: string; registration_no: string; founded_year: string; areas: string };
const toForm = (o: OrgProfile): F => ({ mission: o.mission ?? "", about: o.about ?? "", website: o.website ?? "", contact_email: o.contact_email ?? "", contact_phone: o.contact_phone ?? "", city: o.city ?? "", state: o.state ?? "", registration_no: o.registration_no ?? "", founded_year: o.founded_year ? String(o.founded_year) : "", areas: (o.areas_of_work ?? []).join(", ") });
function Profile({ who }: { who: Who }) {
  const r = useRead<OrgProfile>(() => read(readProfile), `ns:profile:${who.ngo?.org_id}`, !who.sample && !!who.ngo);
  const org = who.sample ? S_PROFILE : r.data;
  const [f, setF] = useState<F | null>(who.sample ? toForm(S_PROFILE) : null);
  const [logo, setLogo] = useState<string | null>(null), [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const { busy, run } = useAct();
  useEffect(() => { if (r.data && !f) setF(toForm(r.data)); }, [r.data, f]);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={6} label="Reading your organisation" />;
  if (!who.sample && r.error && !r.data) return <Failed error={errText(r.error)} retry={r.reload} />;
  if (!org || !f) return <Skeleton rows={6} />;
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => (x ? { ...x, [k]: e.target.value } : x));
  const pick = (kind: "logo" | "cover", file: File) => { setUploading(kind); void run(`up:${kind}`, () => uploadImage(file), { quiet: true }).then((x) => { setUploading(null); if (x.ok && x.result) (kind === "logo" ? setLogo : setCover)(x.result); }); };
  const save = () => void run("profile", () => saveProfile({ mission: f.mission.trim(), about: f.about.trim(), website: f.website.trim(), contact_email: f.contact_email.trim(), contact_phone: f.contact_phone.trim(), city: f.city.trim(), state: f.state.trim(), registration_no: f.registration_no.trim(), founded_year: f.founded_year ? Number(f.founded_year) : null, areas_of_work: f.areas.split(",").map((s) => s.trim()).filter(Boolean), logo_url: logo ?? undefined, cover_photo: cover ?? undefined }), { ok: "Profile saved. Your public page shows it now." }).then((x) => { if (x.ok) r.reload(); });
  const logoNow = logo ?? org.logo_url, coverNow = cover ?? org.cover_photo;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!who.sample) save(); }} style={{ maxWidth: 760 }}>
      <Tools end={org.slug ? <Link className="nx-btn is-quiet is-sm" href={`/community/organisations/${org.slug}`}>Your public page</Link> : null}><span className="ns-sum"><b>{org.name}</b>{org.verified ? ", a verified organisation" : ""}. What you save here is your public profile.</span></Tools>
      <div className="ns-media" style={{ marginTop: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoNow ? <img className="ns-logo" src={logoNow} alt="Organisation logo" /> : <span className="ns-logo"><ImagePlus size={18} /></span>}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {coverNow ? <img className="ns-cover" src={coverNow} alt="Cover photo" /> : <span className="ns-cover">No cover photo</span>}
          <div className="ns-row-acts" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
            {who.sample ? <TryLink quiet small>Change logo</TryLink> : <FilePick label={uploading === "logo" ? "Uploading…" : logo ? "Logo ready to save" : "Change logo"} accept="image/*" disabled={!!uploading} onFiles={([file]) => pick("logo", file)} />}
            {who.sample ? <TryLink quiet small>Change cover</TryLink> : <FilePick label={uploading === "cover" ? "Uploading…" : cover ? "Cover ready to save" : "Change cover"} accept="image/*" disabled={!!uploading} onFiles={([file]) => pick("cover", file)} />}
          </div>
          <small className="ns-small">Both are public. They are saved with the profile.</small>
        </div>
      </div>
      <h3 className="nx-h3" style={{ marginTop: 20 }}>Public profile</h3>
      <div className="nx-fields">
        <Field label="Mission (one sentence)" wide><input value={f.mission} onChange={set("mission")} maxLength={200} /></Field>
        <Field label="About" wide><textarea value={f.about} onChange={set("about")} rows={4} /></Field>
        <Field label="Areas of work" hint="Separate with commas." wide><input value={f.areas} onChange={set("areas")} placeholder="Rescue, ABC, vaccination" /></Field>
        <Field label="City"><input value={f.city} onChange={set("city")} /></Field>
        <Field label="State"><input value={f.state} onChange={set("state")} /></Field>
      </div>
      <h3 className="nx-h3">Contact and registration</h3>
      <div className="nx-fields">
        <Field label="Website" wide><input type="url" value={f.website} onChange={set("website")} /></Field>
        <Field label="Public email (optional)"><input type="email" value={f.contact_email} onChange={set("contact_email")} /></Field>
        <Field label="Public phone (optional)"><input inputMode="tel" value={f.contact_phone} onChange={set("contact_phone")} /></Field>
        <Field label="Registration number"><input value={f.registration_no} onChange={set("registration_no")} /></Field>
        <Field label="Founded"><input inputMode="numeric" value={f.founded_year} onChange={set("founded_year")} pattern="\d{4}" /></Field>
      </div>
      <div className="ns-acts">{who.sample ? <TryLink>Save the profile</TryLink> : <button type="submit" className="nx-btn" disabled={!!busy}>{busy === "profile" ? "Saving…" : "Save the profile"}</button>}</div>
      <p className="nx-foot">Only members of a verified organisation can save it; the database refuses anyone else.</p>
    </form>
  );
}

/* ── Report deadline (kaju_set_report_deadline; a lead supplies it, Kaju never guesses one) ── */
function Deadline({ who }: { who: Who }) {
  const r = useRead(() => read(readDeadline), "ns:deadline", !who.sample && !!who.ngo);
  const [due, setDue] = useState<string | null>(null);
  const { busy, run } = useAct();
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={2} label="Reading the deadline" />;
  if (!who.sample && r.error && !r.data) return <Failed error={errText(r.error)} retry={r.reload} />;
  const d = who.sample ? { due: "2026-12-05", lead: true } : r.data!;
  const value = due ?? d.due;
  return (
    <div style={{ maxWidth: 520 }}>
      <p className="ns-sum" style={{ margin: "16px 0 12px" }}>The date your next report is due. Kaju counts down to it and reminds the team; it never guesses one from a programme.</p>
      <div className="nx-fields" style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "end" }}>
        <Field label="Next report due" hint={!d.lead ? "Only a lead can set the reporting date." : undefined}><input type="date" value={value} disabled={!d.lead || !!busy} onChange={(e) => setDue(e.target.value)} /></Field>
        {who.sample ? <TryLink>Save deadline</TryLink> : <button type="button" className="nx-btn" disabled={!d.lead || !!busy || value === d.due} onClick={() => void run("deadline", () => saveDeadline(value), { ok: value ? "Reporting deadline saved." : "Reporting deadline cleared.", undo: async () => { await saveDeadline(d.due); r.reload(); } }).then((x) => { if (x.ok) { setDue(null); r.reload(); } })}>{busy ? "Saving…" : "Save deadline"}</button>}
      </div>
    </div>
  );
}

/* ── Policies (operations_save_policy, immutable versions) ── */
const FIELDS = ["performedBy", "facility", "procedure", "location", "destination", "reason", "dueDate", "vaccine", "batch", "dose", "route"];
const fieldWord = (f: string) => f.replace(/([A-Z])/g, " $1").toLowerCase();
function Policies({ who }: { who: Who }) {
  const ngoId = who.ngo?.org_id ?? null;
  const r = useRead<WorkflowPolicy[]>(() => read(() => readPolicies(ngoId!)), `ns:policies:${ngoId}`, !who.sample && !!ngoId);
  const [making, setMaking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={3} label="Reading your policies" />;
  if (!who.sample && r.error && !r.data) return <Failed error={errText(r.error)} retry={r.reload} />;
  const rows = who.sample ? S_POLICIES : r.data!;
  const can = who.sample || leadOrCoord(who.role);
  const cols: GCol<WorkflowPolicy>[] = [
    { label: "Policy", width: "minmax(0, 1.5fr)", render: (p) => <span className="nx-cell-main"><ChevronRight size={14} style={{ color: "var(--ink-3)", flex: "none", transform: open === p.id ? "rotate(90deg)" : undefined, transition: "transform .14s" }} /><span><b>{p.name} · version {p.version}</b><small>Source: {p.source_reference}</small></span></span> },
    { label: "Extra required fields", width: "180px", render: (p) => <span className="nx-t2 num">{Object.values(p.rules.requiredFields ?? {}).reduce((n, l) => n + (l?.length ?? 0), 0)}</span> },
    { label: "Release", width: "200px", keep: true, render: (p) => <Chip tone={p.rules.releaseRequiresVet ? "accent" : "plain"}>{p.rules.releaseRequiresVet ? "Vet sign-off required" : "Vet sign-off not configured"}</Chip> },
  ];
  const openP = rows.find((p) => p.id === open);
  return (
    <>
      <Tools end={who.sample ? <TryLink small><Plus size={13} />Configure a policy version</TryLink> : can ? <button type="button" className="nx-btn is-sm" onClick={() => setMaking(true)}><Plus size={13} />Configure a policy version</button> : null}>
        <span className="ns-sum">{rows.length ? <><b>{rows.length}</b> policy {rows.length === 1 ? "version" : "versions"}: your organisation&apos;s procedure requirements, by version.</> : "No organisation policy is configured. Required clinical and evidence checks still apply."}{!can ? " A lead or coordinator adds versions." : ""}</span>
      </Tools>
      <Grid label="Policy versions" cols={cols} rows={rows} rowKey={(p) => p.id} rowLabel={(p) => `${p.name} version ${p.version}`} onOpen={(p) => setOpen(open === p.id ? null : p.id)} openKey={open} empty={<><b>No organisation policy is configured</b><p>Required clinical and evidence checks still apply.</p></>} />
      {openP ? <div className="nx-note" style={{ marginTop: 12 }}><div><b>{openP.name} · version {openP.version}</b><p>Source: {openP.source_reference}</p><p>Veterinary sign-off before a reported release: {openP.rules.releaseRequiresVet ? "required by this policy" : "not configured by this policy"}.</p>{Object.entries(openP.rules.requiredFields ?? {}).length ? <ul className="ns-list" style={{ marginTop: 6 }}>{Object.entries(openP.rules.requiredFields ?? {}).map(([k, l]) => <li key={k}>{OPERATION_LABELS[k as keyof typeof OPERATION_LABELS] ?? k}: {(l ?? []).map(fieldWord).join(", ") || "no additional fields"}</li>)}</ul> : <p>No additional required fields.</p>}</div></div> : null}
      {making ? <NewPolicy onClose={() => setMaking(false)} onDone={() => { setMaking(false); r.reload(); }} /> : null}
    </>
  );
}

function NewPolicy({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const requests = useRef(new Map<string, string>());
  const [name, setName] = useState(""), [version, setVersion] = useState(1), [source, setSource] = useState(""), [vet, setVet] = useState(false);
  const [required, setRequired] = useState<Record<string, string[]>>({});
  const [asking, setAsking] = useState(false);
  const args = { p_name: name.trim(), p_version: version, p_rules: { releaseRequiresVet: vet, requiredFields: required }, p_reference: source.trim() };
  const ok = args.p_name.length >= 3 && version >= 1 && !!args.p_reference;
  const save = () => void run("policy", () => savePolicy(requestFor(requests.current, args), args), { ok: "Policy version saved; the source and audit were checked." }).then((x) => { if (x.ok) onDone(); else setAsking(false); });
  if (asking) return <Confirm title="Save this policy version" confirm="Save policy version" busy={busy === "policy"} onClose={() => setAsking(false)} onConfirm={save}><p>{args.p_name}, version {version}, from {args.p_reference}. Saved versions cannot be changed; new field records are checked against it.</p></Confirm>;
  return (
    <Modal wide title="Configure a policy version" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok} onClick={() => setAsking(true)}>Review</button></>}>
      <div className="nx-fields">
        <Field label="Policy name"><input value={name} minLength={3} maxLength={120} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Version"><input type="number" min={1} step={1} value={version} onChange={(e) => setVersion(Number(e.target.value))} /></Field>
        <Field label="Authoritative source reference" wide><input value={source} maxLength={1000} onChange={(e) => setSource(e.target.value)} /></Field>
      </div>
      <label className="ns-check"><input type="checkbox" checked={vet} onChange={(e) => setVet(e.target.checked)} />This policy requires veterinary authorisation before a reported release</label>
      <p className="ns-small">Location and a field note are already required for release. Add any further requirements from your source.</p>
      {Object.entries(OPERATION_LABELS).filter(([k]) => !["correction", "identification"].includes(k)).map(([kind, label]) => (
        <details key={kind} className="ns-details"><summary>{label} · additional required fields{required[kind]?.length ? ` (${required[kind].length})` : ""}</summary>
          <div className="ns-checks">{FIELDS.map((field) => <label key={field} className="ns-check"><input type="checkbox" checked={required[kind]?.includes(field) ?? false} onChange={(e) => setRequired((v) => ({ ...v, [kind]: e.target.checked ? [...(v[kind] ?? []), field] : (v[kind] ?? []).filter((x) => x !== field) }))} />{fieldWord(field)}</label>)}</div>
        </details>
      ))}
    </Modal>
  );
}

/* ── What is connected: an honest list ── */
const AREAS: Area[] = ["Kaju", "Field & NGO", "Veterinary", "Government", "Research", "Training", "Citizens", "Identity", "Integrations", "Platform"];
const STATUS: Record<Status, { label: string; tone: Tone }> = { LIVE: { label: "Live", tone: "ok" }, STAGING: { label: "Under test", tone: "accent" }, BLOCKED: { label: "Waiting on others", tone: "warn" }, PLANNED: { label: "Not built yet", tone: "plain" } };
function Readiness({ flags, sample }: { flags: Flag[]; sample: boolean }) {
  const on = useMemo(() => new Set(flags), [flags]);
  const [area, setArea] = useState<Area | "all">("all");
  const counts = (s: Status) => MODULES.filter((m) => m.status === s).length;
  const shown = MODULES.filter((m) => area === "all" || m.area === area);
  return (
    <>
      <Tools end={<select className="ns-sel" aria-label="Area" value={area} onChange={(e) => setArea(e.target.value as Area | "all")}><option value="all">Every area</option>{AREAS.filter((a) => MODULES.some((m) => m.area === a)).map((a) => <option key={a} value={a}>{a}</option>)}</select>}>
        <span className="ns-sum"><b>{counts("LIVE")}</b> live, <b>{counts("STAGING")}</b> under test, <b>{counts("BLOCKED")}</b> waiting on others, <b>{counts("PLANNED")}</b> not built yet. Live means it runs in production for its users and its checks pass.</span>
      </Tools>
      {sample ? <p className="nx-foot">This list is the same for everyone. Which tools are connected for you is under Connections.</p> : null}
      <ul className="ns-ready" aria-label="What is live in StrayPaw">
        {shown.map((m) => <li key={m.id}>
          <span><b>{m.name}</b> <span className="nx-t3">· {m.area}</span></span>
          <span className="ns-chips"><Chip tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Chip>{m.flag ? <Chip tone={on.has(m.flag) ? "ok" : "plain"}>{on.has(m.flag) ? "Switched on" : "Switched off"}</Chip> : null}</span>
          <p>{m.waitsOn ? <>Waits on: {m.waitsOn}</> : m.next ? <>Next: {m.next}</> : m.evidence}</p>
          {m.flag ? <p className="ns-small" style={{ gridColumn: "1 / -1" }}>{FLAGS[m.flag]}</p> : null}
        </li>)}
      </ul>
    </>
  );
}

/* ── Personal settings: connections for someone who is not an NGO lead ── */
export function PersonalSettings() {
  const live = useLive();
  const ws: Ws = live.org?.workspace === "government" ? "gov" : live.org?.workspace === "healthcare" ? "health" : live.org?.workspace === "research" ? "research" : "ngo";
  if (!live.ready) return <Holding crumb={["Settings"]} text="Opening…" />;
  return (
    <Shell ws={ws} crumb={["Settings"]}>
      <div className="nx-page ns-page" style={{ maxWidth: 900 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">{live.userName ?? "Your account"}</p><h1 className="nx-h1">Your settings</h1><p className="nx-sub">The tools you connect to Kaju. Each connection is yours; your organisation&apos;s lead decides what may be shared.</p></div></div>
        {live.signedIn ? <ConnectionsPanel back="/settings" sample={false} /> : <>
          <ConnectionsPanel back="/settings" sample />
          <div className="ns-acts"><Link className="nx-btn" href="/sign-in?next=/settings">Sign in to connect your tools</Link><TryLink quiet>Open the live demo</TryLink></div>
        </>}
        {live.orgFor("ngo") ? <p className="nx-foot">Organisation settings, profile and policies are under <Link className="ns-link" href="/ngo/settings">NGO settings</Link>.</p> : null}
      </div>
    </Shell>
  );
}
