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
import { BookmarkMinus, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDeviceSightings, getMySightings, type DeviceSighting } from "@/lib/actions";
import { getDogsByIds } from "@/lib/data";
import { useFollows } from "@/lib/follows";
import { animalTitle } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import type { Dog } from "@/lib/types";
import { Btn, Empty, Head, Lanes, Note, Page, Panel, Row, Rows, Section, Tag } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { Portrait } from "../ui/Portrait";
import { publicLocality } from "../ui/place";
import { day, since } from "../ui";
import "./record.k.css";

type Rep = { id: string; dog_id: string | null; zone: string | null; moods: string[]; status: string; created_at: string; where: "device" | "account" };
type Item = { at: string; kind: "report"; r: Rep } | { at: string; kind: "follow"; d: Dog };

function stage(status: string): { i: number; label: string; tone: "info" | "care" | "caution" } {
  const s = status.toLowerCase();
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
  const [tab, setTab] = usePageState<"all" | "reports" | "following">("lane", "all");

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
  const nFollow = dogs?.length ?? 0;

  /* The sentence says how much there is and where it is kept; the lanes choose reports or follows; each month is a short list of rows. */
  return (
    <Page width="narrow">
      <Head title="My activity"
        sum={loading ? "Reading your reports and follows…" : <><b>{reports.length}</b> {reports.length === 1 ? "report" : "reports"} sent and <b>{nFollow}</b> {nFollow === 1 ? "animal" : "animals"} followed. {user ? <>Signed in as {user.name}: reports are on your account, follows are kept on this device.</> : <>Kept on this device, no account needed. <Link className="rk-link" href="/join">Sign in</Link> to keep new reports on an account.</>}</>}
        actions={<Btn variant="primary" href="/community/report" icon={<Radio size={14} />}>Report an animal</Btn>} />
      <div className="rk-tools">
        <Lanes label="Show" value={tab} onChange={setTab} lanes={[{ id: "all", label: "Everything", count: reports.length + nFollow }, { id: "reports", label: "Reports", count: reports.length }, { id: "following", label: "Following", count: nFollow }]} />
      </div>

      {failed && <Note tone="flame">Some of your activity could not be read just now. That is not the same as having none; reload to try again.</Note>}
      {loading && <Panel><p className="rk-quiet" role="status">Reading…</p></Panel>}
      {!loading && !items.length && (
        <Panel><Empty title={tab === "following" ? "You follow no animals yet" : tab === "reports" ? "No reports from you yet" : "Nothing here yet"}
          action={<Btn href="/community">Find an animal on the map</Btn>}>
          Reports you send and animals you follow appear here, each with its real state. Following shows what an animal&rsquo;s public record says; it does not send notifications.
        </Empty></Panel>
      )}

      {!loading && months.map(([m, list]) => (
        <Section key={m} title={m} count={list.length}>
          <Panel><Rows label={m}>
            {list.map((it) => it.kind === "report" ? <ReportItem key={`r${it.r.id}`} r={it.r} /> : <FollowItem key={`f${it.d.id}`} d={it.d} onUnfollow={() => toggle(it.d.id)} />)}
          </Rows></Panel>
        </Section>
      ))}
    </Page>
  );
}

function ReportItem({ r }: { r: Rep }) {
  const st = stage(r.status);
  const help = r.moods.includes("injured");
  const place = publicLocality(r.zone);
  const next = st.i === 0 ? (help ? "Waiting for review. No organisation has accepted it from here; if one does, its record shows it." : "Waiting for a quick review before it joins the record.") : st.i < 0 ? "A reviewer did not publish it. Reasons are not shown publicly." : "It is part of the animal's public record.";
  return (
    <Row href={r.dog_id && st.i > 0 ? `/animal/${r.dog_id}` : undefined} tone={help ? "flame" : "blue"} icon={<Radio size={14} />}
      title={<>{help ? "You reported an animal needing help" : "You reported a sighting"}{place ? ` in ${place}` : ""}</>}
      meta={<span title={next}>{day(r.created_at)} · {r.where === "account" ? "on your account" : "sent from this device"} · {next}</span>}
      end={<Tag tone={st.tone === "care" ? "green" : st.tone === "caution" ? "amber" : "blue"}>{st.i === 0 ? "Received" : st.label}</Tag>} />
  );
}

function FollowItem({ d, onUnfollow }: { d: Dog; onUnfollow: () => void }) {
  const title = animalTitle({ name: d.name, straypaw_id: d.straypaw_id ?? null, id: d.id } as Parameters<typeof animalTitle>[0]);
  return (
    <li className="rk-follow">
      <Link href={`/animal/${d.id}`} className="k-row">
        <span className="rk-thumb" aria-hidden><Portrait src={d.cover_photo || null} tag={title} sensitive={isSensitivePhoto(d)} size="s" /></span>
        <span className="k-row-t"><b>{title}</b><small>You follow · last seen {since(d.last_seen)} · {publicLocality(d.zone) ?? "Locality not published"}</small></span>
        <span className="k-row-e">
          {d.needs_help && <Tag tone="flame">Needs help</Tag>}
          {d.sterilisation_status === "sterilised" ? <Tag tone="green">Sterilised (recorded)</Tag> : d.sterilisation_status === "not_sterilised" ? <Tag>Recorded not sterilised</Tag> : <Tag>Sterilisation not recorded</Tag>}
        </span>
      </Link>
      <button type="button" className="rk-un" onClick={onUnfollow} aria-label={`Unfollow ${title}`} title="Unfollow"><BookmarkMinus size={14} aria-hidden /></button>
    </li>
  );
}
