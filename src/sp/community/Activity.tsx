import {read as readDemo} from "../../../recording/store";
"use client";

/* ════════════════════════════════════════════════════════════════════
   Community · My Activity (decision 031).

   One personal timeline: the reports you sent and the animals you follow,
   differentiated, each with its true state. A report's status comes from
   the server (proved by the secret this device kept when it was sent, or
   by your account); a followed animal shows only what its public record
   says. Where things are kept is said plainly: follows live on this
   device; reports sent while signed in are on your account. Nothing here
   promises notifications or cross-device sync that do not exist.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookmarkMinus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDeviceSightings, getMySightings, type DeviceSighting } from "@/lib/actions";
import { getDogsByIds } from "@/lib/data";
import { useFollows } from "@/lib/follows";
import { animalTitle } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import type { Dog } from "@/lib/types";
import { Portrait } from "../ui/Portrait";
import { publicLocality } from "../ui/place";
import { Ack, State, day, since } from "../ui";
import "./community.css";

type Rep = { id: string; dog_id: string | null; zone: string | null; moods: string[]; status: string; created_at: string; where: "device" | "account" };
type Item = { at: string; kind: "report"; r: Rep } | { at: string; kind: "follow"; d: Dog };

const LADDER = ["Received", "Reviewed", "On the record"];
function stage(status: string): { i: number; label: string; tone: "info" | "care" | "caution" } {
  const s = status.toLowerCase();
  if (["assigned","in_progress","resolved"].includes(s)) return {i:2,label:s==="resolved"?"Closed":s==="in_progress"?"In progress":"Accepted by organisation",tone:"care"};
  if (["approved", "live", "published", "verified"].includes(s)) return { i: 2, label: "On the record", tone: "care" };
  if (["rejected", "removed", "hidden"].includes(s)) return { i: -1, label: "Not published", tone: "caution" };
  return { i: 0, label: "Received, waiting for review", tone: "info" };
}

export function Activity() {
  const { user, ready } = useAuth();
  const { ids, toggle } = useFollows();
  const [device, setDevice] = useState<DeviceSighting[] | null>(null);
  const [account, setAccount] = useState<Record<string, unknown>[] | null>(null);
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"all" | "reports" | "following">("all");

  useEffect(() => { let live = true; getDeviceSightings().then((r) => live && setDevice(r)).catch(() => { if (live) { setDevice([]); setFailed(true); } }); return () => { live = false; }; }, []);
  useEffect(() => { if (!ready) return; if (!user) { setAccount([]); return; } let live = true; getMySightings(user.id).then((r) => live && setAccount(r as Record<string, unknown>[])).catch(() => live && setAccount([])); return () => { live = false; }; }, [user, ready]);
  useEffect(() => { let live = true; if (!ids.length) { setDogs([]); return; } getDogsByIds(ids).then((d) => live && setDogs(d)).catch(() => { if (live) { setDogs([]); setFailed(true); } }); return () => { live = false; }; }, [ids]);

  const reports: Rep[] = useMemo(() => {
    const by = new Map<string, Rep>();
    for (const s of account ?? []) by.set(String(s.id), { id: String(s.id), dog_id: (s.dog_id as string) ?? null, zone: (s.zone as string) ?? null, moods: (s.mood_tags as string[]) ?? [], status: String(s.status ?? "pending"), created_at: String(s.created_at), where: "account" });
    for (const s of device ?? []) if (!by.has(s.id)) by.set(s.id, { id: s.id, dog_id: s.dog_id, zone: s.zone, moods: s.mood_tags, status: s.status, created_at: s.created_at, where: "device" });
    return [...by.values()];
  }, [account, device]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    if (tab !== "following") for (const r of reports) out.push({ at: r.created_at, kind: "report", r });
    if (tab !== "reports") for (const d of dogs ?? []) out.push({ at: d.last_seen, kind: "follow", d });
    return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [reports, dogs, tab]);

  const loading = device === null || account === null || dogs === null;
  const months = useMemo(() => {
    const by = new Map<string, Item[]>();
    for (const it of items) { const k = new Date(it.at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); by.set(k, [...(by.get(k) ?? []), it]); }
    return [...by.entries()];
  }, [items]);

  return (
    <div className="act page">
      <header className="act-head">
        <p className="k is-flame">Community · My Activity</p>
        <h1 className="h1">Your reports and the animals you follow</h1>
        <p className="lede">Demo reports and care updates are kept in this browser. This sample workspace does not sync across devices.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Show">
        {(["all", "reports", "following"] as const).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "all" ? "Everything" : t === "reports" ? "Reports" : "Following"}<span className="n">{t === "all" ? reports.length + (dogs?.length ?? 0) : t === "reports" ? reports.length : dogs?.length ?? 0}</span></button>)}
      </div>

      {failed && <p className="act-warn" role="alert"><Ack state="failed">Some of your activity could not be read just now.</Ack> That is not the same as having none; reload to try again.</p>}
      {loading && <div className="stack" style={{ marginTop: 24 }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 88 }} />)}</div>}
      {!loading && !items.length && (
        <State art="activity-empty" title={tab === "following" ? "You follow no animals yet" : tab === "reports" ? "No reports from you yet" : "Nothing here yet"}
          action={<><Link className="btn is-flame" href="/community/report">Report an animal</Link><Link className="btn" href="/community">Find an animal on the map</Link></>}>
          Reports you send and animals you follow appear here, each with its real state. Following shows what an animal&rsquo;s public record says; it does not send notifications.
        </State>
      )}

      {!loading && months.map(([m, list]) => (
        <section key={m} className="act-month" aria-label={m}>
          <h2 className="act-m serif">{m}</h2>
          <ol className="act-list">
            {list.map((it) => it.kind === "report" ? <ReportItem key={`r${it.r.id}`} r={it.r} /> : <FollowItem key={`f${it.d.id}`} d={it.d} onUnfollow={() => toggle(it.d.id)} />)}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ReportItem({ r }: { r: Rep }) {
  const c=readDemo().cases.find(c=>c.id===r.id);
  const st = stage(c?.status || r.status);
  const help = r.moods.includes("injured");
  return (
    <li className="act-item is-report">
      <span className="act-dot" aria-hidden />
      <div className="act-body">
        <p className="k">{day(r.created_at)} · {r.where === "account" ? "on your account" : "sent from this device"}</p>
        <h3>{help ? "You reported an animal needing help" : "You reported a sighting"}{publicLocality(r.zone) ? <> in <span className="serif act-place">{publicLocality(r.zone)}</span></> : null}</h3>
        {c && <p className="small"><b>{c.case_code}</b> · {st.label}{c.assignee_name ? ` · ${c.assignee_name}` : ""}</p>}
        <ol className="act-ladder" aria-label="Where this report is">
          {LADDER.map((s, i) => <li key={s} className={st.i >= i ? "is-on" : ""}>{s}</li>)}
          {st.i < 0 && <li className="is-off">Not published</li>}
        </ol>
        <p className="small">{st.i === 0 ? (help ? "Waiting for review. No organisation has accepted it from here; if one does, its record shows it." : "Waiting for a quick review before it joins the record.") : st.i < 0 ? "A reviewer did not publish it. Reasons are not shown publicly." : "It is part of the animal's public record."}</p>
        {r.dog_id && <Link className="btn is-s" href={`/animal/${r.dog_id}`}>The animal&rsquo;s record <ArrowUpRight size={14} aria-hidden /></Link>}
      </div>
    </li>
  );
}

function FollowItem({ d, onUnfollow }: { d: Dog; onUnfollow: () => void }) {
  const title = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id } as Parameters<typeof animalTitle>[0]);
  return (
    <li className="act-item is-follow">
      <span className="act-dot" aria-hidden />
      <div className="act-body act-follow">
        <Link href={`/animal/${d.id}`} className="act-pic"><Portrait src={d.cover_photo || null} tag={title} sensitive={isSensitivePhoto(d)} size="s" /></Link>
        <div>
          <p className="k">You follow · last seen {since(d.last_seen)}</p>
          <h3><Link href={`/animal/${d.id}`} className="serif act-name">{title}</Link></h3>
          <div className="row" style={{ ["--g" as string]: "6px" }}>
            {d.needs_help && <span className="pill is-urgent">Needs help</span>}
            {d.sterilisation_status === "sterilised" ? <span className="pill is-care">Sterilised (recorded)</span> : d.sterilisation_status === "not_sterilised" ? <span className="pill">Recorded not sterilised</span> : <span className="pill is-unknown">Sterilisation not recorded</span>}
            <span className="pill is-plain">{publicLocality(d.zone) ?? "Locality not published"}</span>
          </div>
        </div>
        <button type="button" className="btn is-ghost is-s" onClick={onUnfollow}><BookmarkMinus size={14} aria-hidden /> Unfollow</button>
      </div>
    </li>
  );
}
