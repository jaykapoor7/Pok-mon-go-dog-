"use client";

/* ════════════════════════════════════════════════════════════════════
   My activity (/community/activity): the reports you sent and the
   animals you follow, each with its true state. A report's status comes
   from the server (proved by the secret this device kept when it was
   sent, POST /api/sighting/status, or by your account); a followed
   animal shows only what its public record says. Where things are kept
   is said plainly: follows live on this device; reports sent while
   signed in are on your account. Nothing promises notifications.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookmarkMinus, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDeviceSightings, getMySightings, type DeviceSighting } from "@/lib/actions";
import { getDogsByIds } from "@/lib/data";
import { useFollows } from "@/lib/follows";
import { animalTitle } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import type { Dog } from "@/lib/types";
import { Body, Empty, Head, Lanes, LinkBtn, Note, Sec, Tag } from "../kit";
import { Pic } from "../Pic";
import { day, plural, publicLocality, since } from "../fmt";

type Rep = { id: string; dog_id: string | null; zone: string | null; moods: string[]; status: string; created_at: string; where: "device" | "account" };
type Item = { at: string; kind: "report"; r: Rep } | { at: string; kind: "follow"; d: Dog };
type Lane = "all" | "reports" | "following";

function stage(status: string): { i: number; label: string; tone: "blue" | "green" | "amber" } {
  const s = status.toLowerCase();
  if (["approved", "live", "published", "verified"].includes(s)) return { i: 2, label: "On the record", tone: "green" };
  if (["rejected", "removed", "hidden"].includes(s)) return { i: -1, label: "Not published", tone: "amber" };
  return { i: 0, label: "Received", tone: "blue" };
}

export function Activity() {
  const { user, ready } = useAuth();
  const { ids, toggle } = useFollows();
  const [device, setDevice] = useState<DeviceSighting[] | null>(null);
  const [account, setAccount] = useState<Record<string, unknown>[] | null>(null);
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [lane, setLane] = useState<Lane>("all");

  useEffect(() => { let live = true; getDeviceSightings().then((r) => live && setDevice(r)).catch(() => { if (live) { setDevice([]); setFailed(true); } }); return () => { live = false; }; }, []);
  useEffect(() => { if (!ready) return; if (!user) { setAccount([]); return; } let live = true; getMySightings(user.id).then((r) => live && setAccount(r as Record<string, unknown>[])).catch(() => { if (live) { setAccount([]); setFailed(true); } }); return () => { live = false; }; }, [user, ready]);
  useEffect(() => { let live = true; if (!ids.length) { setDogs([]); return; } getDogsByIds(ids).then((d) => live && setDogs(d)).catch(() => { if (live) { setDogs([]); setFailed(true); } }); return () => { live = false; }; }, [ids]);

  const reports: Rep[] = useMemo(() => {
    const by = new Map<string, Rep>();
    for (const s of account ?? []) by.set(String(s.id), { id: String(s.id), dog_id: (s.dog_id as string) ?? null, zone: (s.zone as string) ?? null, moods: (s.mood_tags as string[]) ?? [], status: String(s.status ?? "pending"), created_at: String(s.created_at), where: "account" });
    for (const s of device ?? []) if (!by.has(s.id)) by.set(s.id, { id: s.id, dog_id: s.dog_id, zone: s.zone, moods: s.mood_tags ?? [], status: s.status, created_at: s.created_at, where: "device" });
    return [...by.values()];
  }, [account, device]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    if (lane !== "following") for (const r of reports) out.push({ at: r.created_at, kind: "report", r });
    if (lane !== "reports") for (const d of dogs ?? []) out.push({ at: d.last_seen, kind: "follow", d });
    return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [reports, dogs, lane]);
  const months = useMemo(() => {
    const by = new Map<string, Item[]>();
    for (const it of items) { const k = new Date(it.at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); by.set(k, [...(by.get(k) ?? []), it]); }
    return [...by.entries()];
  }, [items]);

  const loading = device === null || account === null || dogs === null;
  const nFollow = dogs?.length ?? 0;
  return (
    <>
      <Head title="My activity"
        sum={loading ? "Reading your reports and follows…" : <>{reports.length} {plural(reports.length, "report")} sent and {nFollow} {plural(nFollow, "animal")} followed. {user ? <>Signed in as {user.name}: reports are on your account, follows are kept on this device.</> : <>Kept on this device, no account needed. <Link className="pb-link" href="/sign-in?next=/community/activity">Sign in</Link> to keep new reports on an account.</>}</>}
        actions={<LinkBtn variant="flame" href="/community/report" icon={<Radio size={16} aria-hidden />}>Report an animal</LinkBtn>} />
      <Body narrow>
        <Lanes<Lane> label="Show" value={lane} onChange={setLane} lanes={[{ id: "all", label: "Everything", count: loading ? null : reports.length + nFollow }, { id: "reports", label: "Reports", count: loading ? null : reports.length }, { id: "following", label: "Following", count: loading ? null : nFollow }]} />
        {failed && <Note tone="amber" role="alert">Some of your activity could not be read just now. That is not the same as having none; reload to try again.</Note>}
        {loading && <p className="pb-fine" role="status">Reading…</p>}
        {!loading && !items.length && (
          <Empty title={lane === "following" ? "You follow no animals yet" : lane === "reports" ? "No reports from you yet" : "Nothing here yet"} action={<LinkBtn href="/community">Find an animal on the map</LinkBtn>}>
            Reports you send and animals you follow appear here, each with its real state. Following shows what an animal&rsquo;s public record says; it does not send notifications.
          </Empty>
        )}
        {!loading && months.map(([m, list]) => (
          <Sec key={m} title={m} count={list.length}>
            <ul className="pb-list" aria-label={m}>
              {list.map((it) => it.kind === "report" ? <ReportItem key={`r${it.r.id}`} r={it.r} /> : <FollowItem key={`f${it.d.id}`} d={it.d} onUnfollow={() => toggle(it.d.id)} />)}
            </ul>
          </Sec>
        ))}
      </Body>
    </>
  );
}

function ReportItem({ r }: { r: Rep }) {
  const st = stage(r.status);
  const help = r.moods.includes("injured");
  const place = publicLocality(r.zone);
  const next = st.i === 0 ? (help ? "Waiting for review. No organisation has accepted it from here; if one does, its record shows it." : "Waiting for a quick review before it joins the record.") : st.i < 0 ? "A reviewer did not publish it. Reasons are not shown publicly." : "It is part of the animal's public record.";
  const inner = (
    <>
      <span className={`pb-row-i is-${help ? "flame" : "blue"}`} aria-hidden><Radio size={16} /></span>
      <span className="pb-row-t"><b>{help ? "You reported an animal needing help" : "You reported a sighting"}{place ? ` in ${place}` : ""}</b><small>{day(r.created_at)} · {r.where === "account" ? "on your account" : "sent from this device"} · {next}</small></span>
      <span className="pb-row-e"><Tag tone={st.tone}>{st.label}</Tag></span>
    </>
  );
  return <li>{r.dog_id && st.i > 0 ? <Link className="pb-row is-link" href={`/animal/${r.dog_id}`}>{inner}</Link> : <div className="pb-row">{inner}</div>}</li>;
}

function FollowItem({ d, onUnfollow }: { d: Dog; onUnfollow: () => void }) {
  const title = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id, city: d.city ?? null, zone: d.zone });
  return (
    <li className="pb-follow">
      <Link href={`/animal/${d.id}`} className="pb-row is-link">
        <span className="pb-row-i is-pic" aria-hidden><Pic src={d.cover_photo || null} tag={title} sensitive={isSensitivePhoto(d)} small /></span>
        <span className="pb-row-t"><b>{title}</b><small>You follow · last seen {since(d.last_seen)} · {publicLocality(d.zone) ?? "Locality not published"}</small></span>
        <span className="pb-row-e">
          {d.needs_help && <Tag tone="flame">Needs help</Tag>}
          {d.sterilisation_status === "sterilised" ? <Tag tone="green">Sterilised (recorded)</Tag> : d.sterilisation_status === "not_sterilised" ? <Tag>Recorded not sterilised</Tag> : <Tag>Sterilisation not recorded</Tag>}
        </span>
      </Link>
      <button type="button" className="pb-btn is-quiet is-s pb-unfollow" onClick={onUnfollow}><BookmarkMinus size={16} aria-hidden /> Unfollow<span className="pb-sr"> {title}</span></button>
    </li>
  );
}
