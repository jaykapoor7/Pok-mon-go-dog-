"use client";

/* Trust console · records an operator can correct or take down:
   animals (the master editor), feeding spots and fundraisers. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { animalTitle } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import { STATUS_META, type DogStatus } from "@/lib/types";
import { day, n, since } from "../../ui";
import { publicLocality } from "../../ui/place";
import { send } from "./api";
import { Confirm, Filters, Inspector, Line, lower, NoneMatch, Pane, Photo, ReceiptLine, Search, Table, YesNo, useReceipt, type Col } from "./parts";
import type { P } from "./Queues";
import type { Dog, FeedingZone, Fundraiser } from "./types";

const STATUSES = Object.keys(STATUS_META) as DogStatus[];
const NOTCH = [["none", null], ["left", "left"], ["right", "right"], ["both", "both"]] as const;
const orgName = (d: Dog) => (Array.isArray(d.ngos) ? d.ngos[0]?.name : d.ngos?.name) ?? (d.ngo_id ? "An organisation" : null);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/* ── animals: the master editor ───────────────────────────────────── */
export function Dogs({ secret, read, reload, empty }: P<Dog[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | DogStatus>("all");
  const [f, setF] = useState<"all" | "help" | "org" | "community">("all");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((d) =>
    (status === "all" || d.status === status) &&
    (f === "all" || (f === "help" ? d.needs_help === true : f === "org" ? !!d.ngo_id : !d.ngo_id)) &&
    (!q || `${lower(animalTitle(d))} ${lower(d.name)} ${lower(d.zone)} ${lower(d.id)} ${lower(d.created_by_name)}`.includes(q.toLowerCase())));
  const cur = rows.find((d) => d.id === sel) ?? null;

  async function patch(p: Partial<Dog>, what: string) {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `dog:${cur.id}`, "/api/admin/dogs", { json: { id: cur.id, patch: p } }, `${animalTitle(cur)}: ${what}`);
    setR(a);
    await reload(); // re-read the truth either way
  }

  const cols: Col<Dog>[] = [
    { key: "photo", head: "Photo", className: "is-photo", cell: (d) => <Photo src={d.cover_photo} size="s" alt="" sensitive={isSensitivePhoto(d)} /> },
    { key: "name", head: "Animal", primary: true, cell: (d) => animalTitle(d) },
    { key: "place", head: "Place", cell: (d) => publicLocality(d.zone) ?? d.zone ?? <span className="cn-unk">Not recorded</span> },
    { key: "status", head: "Status", cell: (d) => d.status ? STATUS_META[d.status]?.label ?? d.status : <span className="cn-unk">Not recorded</span> },
    { key: "help", head: "Needs help", cell: (d) => d.needs_help ? <span className="pill is-urgent">Needs help</span> : <YesNo v={d.needs_help} /> },
    { key: "vac", head: "Vaccinated", cell: (d) => <YesNo v={d.vaccinated} /> },
    { key: "ster", head: "Sterilised", cell: (d) => <YesNo v={d.sterilised} /> },
    { key: "fr", head: "Friendly", cell: (d) => <YesNo v={d.is_friendly} /> },
    { key: "ear", head: "Ear-notch", cell: (d) => d.ear_notch ? cap(d.ear_notch) : "None recorded" },
    { key: "seen", head: "Last seen", className: "mono", cell: (d) => d.last_seen ? since(d.last_seen) : "—" },
    { key: "src", head: "Source", cell: (d) => orgName(d) ?? "Community" },
  ];

  const flag = (k: "vaccinated" | "sterilised" | "is_friendly" | "needs_help", label: string) => cur && (
    <div className="cn-edit-row">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {([true, false] as const).map((v) => <button key={String(v)} type="button" aria-pressed={cur[k] === v} disabled={r === "pending" || cur[k] === v} onClick={() => patch({ [k]: v } as Partial<Dog>, `${label} set to ${v ? "yes" : "no"}`)}>{v ? "Yes" : "No"}</button>)}
      </div>
    </div>
  );

  return (
    <Pane receipt={r} idle="Choose an animal to edit its status, care flags or ear-notch."
      tools={<>
        <Search value={q} onChange={setQ} placeholder="Search name, tag, place, uploader" />
        <Filters label="Filter by source" value={f} onChange={setF} options={[{ key: "all", label: "All", n: rows.length }, { key: "help", label: "Needs help", n: rows.filter((d) => d.needs_help).length }, { key: "org", label: "Organisation", n: rows.filter((d) => d.ngo_id).length }, { key: "community", label: "Community", n: rows.filter((d) => !d.ngo_id).length }]} />
        <label className="cn-select"><span className="sr">Filter by status</span>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as "all" | DogStatus)}>
            <option value="all">Every status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </label>
      </>}
      inspector={cur && (
        <Inspector kicker="Animal · master editor" title={animalTitle(cur)} onClose={() => setSel(null)}>
          <Photo src={cur.cover_photo} alt={`Photograph of ${animalTitle(cur)}`} sensitive={isSensitivePhoto(cur)} />
          <dl className="ledger">
            <Line k="Place">{cur.zone ?? <span className="cn-unk">Not recorded</span>}</Line>
            <Line k="Last seen">{cur.last_seen ? `${day(cur.last_seen)} · ${since(cur.last_seen)}` : <span className="cn-unk">Not recorded</span>}</Line>
            <Line k="Uploaded by">{cur.created_by_name || cur.created_by_id || "Historic source"}</Line>
            <Line k="Belongs to">{orgName(cur) ?? "Community"}</Line>
            <Line k="Record"><Link className="link" href={`/animal/${cur.id}`} target="_blank">Open the public record</Link></Line>
          </dl>
          <p className="small">Changes apply to this animal immediately, for everyone. Each one is sent on its own and answered by the server.</p>
          <div className="cn-edit">
            <div className="cn-edit-row">
              <span>Status</span>
              <div className="cn-chips" role="group" aria-label="Status">
                {STATUSES.map((s) => <button key={s} type="button" className="chip" aria-pressed={cur.status === s} disabled={r === "pending" || cur.status === s} onClick={() => patch({ status: s }, `status set to ${STATUS_META[s].label}`)}>{STATUS_META[s].label}</button>)}
              </div>
            </div>
            {flag("needs_help", "Needs help")}
            {flag("vaccinated", "Vaccinated")}
            {flag("sterilised", "Sterilised")}
            {flag("is_friendly", "Friendly")}
            <div className="cn-edit-row">
              <span>Ear-notch</span>
              <div className="seg" role="group" aria-label="Ear-notch">
                {NOTCH.map(([label, v]) => <button key={label} type="button" aria-pressed={(cur.ear_notch ?? null) === v} disabled={r === "pending" || (cur.ear_notch ?? null) === v} onClick={() => patch({ ear_notch: v }, `ear-notch set to ${label}`)}>{cap(label)}</button>)}
              </div>
            </div>
          </div>
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setQ(""); setF("all"); setStatus("all"); }} /> : null}
      {shown.length > 0 && <Table label="Animals table" rows={shown} cols={cols} selected={sel} onSelect={setSel} rowClass={(d) => (d.needs_help ? "is-help" : undefined)} />}
      {rows.length >= 300 && <p className="small cn-cap">The server returns at most 300 animals, needs-help first then most recently seen. Older records are not listed here.</p>}
    </Pane>
  );
}

/* ── feeding spots ────────────────────────────────────────────────── */
export function Feeding({ secret, read, reload, empty }: P<FeedingZone[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((z) => !q || `${lower(z.name)} ${lower(z.zone)} ${lower(z.created_by_name)}`.includes(q.toLowerCase()));
  const cur = rows.find((z) => z.id === sel) ?? null;
  async function remove() {
    if (!cur) return;
    setR("pending");
    const a = await send(secret, `fz:${cur.id}`, "/api/admin/feeding-zones", { json: { action: "delete", id: cur.id } }, `Feeding spot “${cur.name}” deleted`);
    setR(a);
    if (a.ok) { setSel(null); await reload(); }
  }
  const cols: Col<FeedingZone>[] = [
    { key: "name", head: "Feeding spot", primary: true, cell: (z) => z.name },
    { key: "place", head: "Place", cell: (z) => z.zone ?? <span className="cn-unk">Not recorded</span> },
    { key: "vol", head: "Feeders", className: "mono", cell: (z) => n(z.volunteer_count) },
    { key: "fed", head: "Last fed", className: "mono", cell: (z) => z.last_fed_at ? since(z.last_fed_at) : <span className="cn-unk">Not recorded</span> },
    { key: "by", head: "Added by", cell: (z) => z.created_by_name ?? <span className="cn-unk">Not recorded</span> },
    { key: "when", head: "Added", className: "mono", cell: (z) => since(z.created_at) },
  ];
  return (
    <Pane receipt={r} idle="Choose a feeding spot to open it or remove a spam or duplicate entry."
      tools={<Search value={q} onChange={setQ} placeholder="Search name, place, who added it" />}
      inspector={cur && (
        <Inspector kicker="Feeding spot" title={cur.name} onClose={() => setSel(null)}>
          <dl className="ledger">
            <Line k="Place">{cur.zone ?? <span className="cn-unk">Not recorded</span>}</Line>
            <Line k="Feeders">{n(cur.volunteer_count)}</Line>
            <Line k="Last fed">{cur.last_fed_at ? `${day(cur.last_fed_at)} · ${since(cur.last_fed_at)}` : <span className="cn-unk">Not recorded</span>}</Line>
            <Line k="Added">{day(cur.created_at)}{cur.created_by_name ? ` by ${cur.created_by_name}` : ""}</Line>
            <Line k="Public page"><Link className="link" href={`/community/feeding/${cur.id}`} target="_blank">Open it</Link></Line>
          </dl>
          <Confirm label="Delete feeding spot" busy={r === "pending"} onConfirm={remove} confirm="This deletes the spot and its feeder list for everyone. It cannot be undone from here." />
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => setQ("")} /> : null}
      {shown.length > 0 && <Table label="Feeding spots table" rows={shown} cols={cols} selected={sel} onSelect={setSel} />}
    </Pane>
  );
}

/* ── fundraisers ──────────────────────────────────────────────────── */
type NewCampaign = { title: string; orgName: string; donateUrl: string; coverPhoto: string; story: string };
const BLANK: NewCampaign = { title: "", orgName: "", donateUrl: "", coverPhoto: "", story: "" };

export function Fundraisers({ secret, read, reload, empty }: P<Fundraiser[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<NewCampaign>(BLANK);
  const [r, setR] = useReceipt();
  const [f, setF] = useState<"pending" | "live" | "all">("all");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((x) => f === "all" || (f === "pending" ? x.status === "pending" : x.status !== "pending"));
  const cur = rows.find((x) => x.id === sel) ?? null;

  async function go(key: string, json: object, what: string, close = false) {
    setR("pending");
    const a = await send(secret, key, "/api/admin/fundraisers", { json }, what);
    setR(a);
    if (a.ok) { if (close) setSel(null); await reload(); }
    return a.ok;
  }
  async function discover() {
    setR("pending");
    const a = await send<{ found?: number; inserted?: number; note?: string }>(secret, "fund:discover", "/api/fundraisers/discover", {}, (b) =>
      (b.inserted ?? 0) > 0 ? `Discovery ran: ${b.found ?? 0} candidates found, ${b.inserted} added to review` : b.found ? `Discovery ran: ${b.found} candidates found, all already listed` : "Discovery ran: no new candidates found this time");
    setR(a);
    if (a.ok) { setF("pending"); await reload(); }
  }
  async function create() {
    const ok = await go("fund:create", { action: "create", title: form.title.trim(), orgName: form.orgName.trim(), donateUrl: form.donateUrl.trim(), coverPhoto: form.coverPhoto.trim() || undefined, story: form.story.trim() || undefined, category: "other" }, `“${form.title.trim()}” published as a featured campaign`);
    if (ok) { setForm(BLANK); setAdding(false); }
  }

  const source = (x: Fundraiser) => (x.created_by_id ? "Partner" : "Curated or discovered");
  const cols: Col<Fundraiser>[] = [
    { key: "title", head: "Campaign", primary: true, cell: (x) => x.title },
    { key: "org", head: "Organisation", cell: (x) => x.created_by_name ?? <span className="cn-unk">Not recorded</span> },
    { key: "status", head: "Status", cell: (x) => <span className={`pill ${x.status === "pending" ? "is-caution" : x.status === "active" ? "is-care" : "is-plain"}`}>{x.status === "pending" ? "To review" : x.status}</span> },
    { key: "feat", head: "Featured", cell: (x) => <YesNo v={x.featured} /> },
    { key: "src", head: "Source", cell: source },
    { key: "cat", head: "Category", cell: (x) => x.category ?? "—" },
    { key: "when", head: "Added", className: "mono", cell: (x) => since(x.created_at) },
  ];
  const set = (k: keyof NewCampaign) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((v) => ({ ...v, [k]: e.target.value }));
  const canCreate = form.title.trim() && form.orgName.trim() && form.donateUrl.trim();

  const inspector = adding ? (
    <Inspector kicker="Fundraisers" title="Curate a rescue's campaign" onClose={() => setAdding(false)}>
      <p className="small">For a reputable rescue&rsquo;s existing campaign. It is published at once, featured, and marked as curated.</p>
      <label className="field"><span className="label">Campaign title</span><input className="input" value={form.title} onChange={set("title")} /></label>
      <label className="field"><span className="label">NGO or rescue name</span><input className="input" value={form.orgName} onChange={set("orgName")} /></label>
      <label className="field"><span className="label">Their donation link</span><input className="input" inputMode="url" value={form.donateUrl} onChange={set("donateUrl")} placeholder="Milaap, Ketto, GiveIndia…" /></label>
      <label className="field"><span className="label">Cover image link <span className="small">(optional)</span></span><input className="input" inputMode="url" value={form.coverPhoto} onChange={set("coverPhoto")} /></label>
      <label className="field"><span className="label">Why you trust them <span className="small">(optional)</span></span><textarea className="textarea cn-note" value={form.story} onChange={set("story")} /></label>
      <div className="cn-do">
        <button type="button" className="btn is-s is-ink" disabled={!canCreate || r === "pending"} onClick={create}>Publish (featured)</button>
        <button type="button" className="btn is-s" onClick={() => setAdding(false)}>Cancel</button>
      </div>
      <ReceiptLine r={r} />
    </Inspector>
  ) : cur && (
    <Inspector kicker={cur.status === "pending" ? "Fundraiser · to review" : "Fundraiser"} title={cur.title} onClose={() => setSel(null)}>
      <dl className="ledger">
        <Line k="Organisation">{cur.created_by_name ?? <span className="cn-unk">Not recorded</span>}</Line>
        <Line k="Donate at"><a className="link cn-contact cn-wrap" href={cur.donate_url} target="_blank" rel="noopener noreferrer nofollow">{cur.donate_url} <ExternalLink size={13} aria-hidden /></a></Line>
        <Line k="Goal">{cur.goal_amount === null ? <span className="cn-unk">Not stated</span> : `₹${n(cur.goal_amount)}`}</Line>
        <Line k="Raised">{cur.raised_reported === null ? <span className="cn-unk">Not reported</span> : `₹${n(cur.raised_reported)} (as reported by the organiser)`}</Line>
        <Line k="Source">{source(cur)}</Line>
        <Line k="Added">{day(cur.created_at)}</Line>
        {cur.status !== "pending" && <Line k="Public page"><Link className="link" href={`/fundraisers/${cur.id}`} target="_blank">Open it</Link></Line>}
      </dl>
      {cur.status === "pending" && <p className="small">Discovered on the web. Check it is a legitimate rescue before publishing; approving badges it as a StrayPaw pick.</p>}
      <div className="cn-do">
        {cur.status === "pending" && <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={() => go(`fund:${cur.id}`, { action: "approve", id: cur.id }, `“${cur.title}” approved and published`)}>Approve &amp; publish</button>}
        {cur.status !== "pending" && <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => go(`fund:${cur.id}`, { action: "feature", id: cur.id, featured: !cur.featured }, cur.featured ? `“${cur.title}” unfeatured` : `“${cur.title}” featured`)}>{cur.featured ? "Unfeature" : "Feature"}</button>}
      </div>
      <Confirm label={cur.status === "pending" ? "Dismiss candidate" : "Take down"} busy={r === "pending"} onConfirm={() => go(`fund:${cur.id}`, { action: "delete", id: cur.id }, `“${cur.title}” removed`, true)} confirm="This deletes the campaign record. It is not archived." />
      <ReceiptLine r={r} />
    </Inspector>
  );

  return (
    <Pane receipt={r} idle="Choose a campaign to review, feature or take it down."
      tools={<>
        <Filters label="Filter by status" value={f} onChange={(k) => { setF(k); setSel(null); }} options={[{ key: "all", label: "All", n: rows.length }, { key: "pending", label: "To review", n: rows.filter((x) => x.status === "pending").length }, { key: "live", label: "Published", n: rows.filter((x) => x.status !== "pending").length }]} />
        <button type="button" className="btn is-s" disabled={r === "pending"} onClick={discover}>Discover from the web</button>
        <button type="button" className="btn is-s is-ink" onClick={() => { setSel(null); setAdding(true); }}>Add a campaign</button>
      </>}
      inspector={inspector || null}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => setF("all")} /> : null}
      {shown.length > 0 && <Table label="Fundraisers table" rows={shown} cols={cols} selected={sel} onSelect={(id) => { setAdding(false); setSel(id); }} />}
    </Pane>
  );
}
