"use client";

/* What the workspace needs to show an animal the way a team recognises it: its photo, and its name and number where
   another record only carries its id. Every read uses the member's own session, so the database's row rules decide
   what comes back; each query is also filtered to the organisation, so nothing from another one is ever asked for.

   Photos: the profile photo on the register (cover_photo) if there is one, otherwise the newest photo taken on the
   animal's own cases (field mode stores the capture, ear-notch and release photos there, in the private evidence
   store). Stored photos open through signed links that expire; nothing here makes a photo public. */

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { AnimalRef } from "../animalLabel";

const db = () => getSupabase();
const STORE = "storage://";
const SIGN_SECONDS = 3600;
/** Photos of the animal itself; surgery records and scans are documents, not photos. */
export const PHOTO_KINDS = ["capture_photo", "release_photo", "ear_notch_photo"] as const;
export type PhotoKind = "cover" | (typeof PHOTO_KINDS)[number];
export const PHOTO_WORD: Record<PhotoKind, string> = { cover: "Profile photo", capture_photo: "When recorded", release_photo: "At release", ear_notch_photo: "Ear notch" };
const rank = (k: string) => (k === "ear_notch_photo" ? 1 : 0);
const isPhoto = (u: string | null | undefined): u is string => !!u && !!u.trim() && !/\.pdf($|\?)/i.test(u) && (u.startsWith(STORE) || /^https?:\/\//i.test(u) || u.startsWith("/"));

/* ── Names for animals other records point at ────────────────────── */

const REF = "id,name,code,straypaw_id,species,zone,city";
const refCache = new Map<string, AnimalRef>();
/** The organisation's animals with these ids, by id. Ids it does not hold are simply absent. */
export async function readAnimalRefs(ngoId: string, ids: (string | null | undefined)[]): Promise<Map<string, AnimalRef>> {
  const s = db();
  const all = [...new Set(ids.filter((x): x is string => !!x))];
  const want = all.filter((id) => !refCache.has(`${ngoId}:${id}`));
  if (s) for (let i = 0; i < want.length; i += 150) {
    const r = await s.from("dogs").select(REF).eq("ngo_id", ngoId).in("id", want.slice(i, i + 150));
    if (!r.error) for (const d of (r.data ?? []) as (AnimalRef & { id: string })[]) refCache.set(`${ngoId}:${d.id}`, d);
  }
  return new Map(all.flatMap((id) => { const d = refCache.get(`${ngoId}:${id}`); return d ? [[id, d] as const] : []; }));
}
/** The same, as a hook: null while reading. */
export function useAnimalRefs(ngoId: string | null | undefined, ids: (string | null | undefined)[]) {
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  const [map, setMap] = useState<Map<string, AnimalRef> | null>(null);
  useEffect(() => {
    if (!ngoId || !key) { setMap(new Map()); return; }
    let alive = true;
    void readAnimalRefs(ngoId, key.split(",")).then((m) => { if (alive) setMap(m); });
    return () => { alive = false; };
  }, [ngoId, key]);
  return map;
}

/* ── Photos ──────────────────────────────────────────────────────── */

/** Stored photos become signed links (one request per store); web addresses and the site's own images are used as they are. */
async function openable(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byBucket = new Map<string, string[]>();
  for (const u of new Set(urls)) {
    if (!u.startsWith(STORE)) { out.set(u, u); continue; }
    const [bucket, ...rest] = u.slice(STORE.length).split("/");
    if (bucket && rest.length) byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), rest.join("/")]);
  }
  const s = db();
  if (s) await Promise.all([...byBucket].map(async ([bucket, paths]) => {
    const r = await s.storage.from(bucket).createSignedUrls(paths, SIGN_SECONDS);
    for (const x of r.data ?? []) if (x.signedUrl && x.path) out.set(`${STORE}${bucket}/${x.path}`, x.signedUrl);
  }));
  return out;
}

type EvidenceRow = { url: string | null; kind: string; created_at: string | null; case_id: string | null; cases: { dog_id: string | null } | { dog_id: string | null }[] | null };
const dogOf = (e: EvidenceRow) => (Array.isArray(e.cases) ? e.cases[0]?.dog_id : e.cases?.dog_id) ?? null;
async function evidencePhotos(ngoId: string, dogIds: string[], limit: number): Promise<EvidenceRow[]> {
  const s = db(); if (!s || !dogIds.length) return [];
  const r = await s.from("evidence_items").select("url,kind,created_at,case_id,cases!inner(dog_id,ngo_id)").eq("cases.ngo_id", ngoId).in("cases.dog_id", dogIds)
    .in("kind", PHOTO_KINDS as unknown as string[]).not("url", "is", null).order("created_at", { ascending: false }).limit(limit);
  return r.error ? [] : ((r.data ?? []) as unknown as EvidenceRow[]).filter((e) => isPhoto(e.url));
}

/* A signed link lasts an hour; one read is reused for 45 minutes, so moving between pages does not ask again. */
const photoCache = new Map<string, { url: string | null; at: number }>();
const FRESH = 45 * 60_000;
export type PhotoSource = { id: string; cover_photo?: string | null };

/** The one photo to show for each animal (null: none on record). Animals with a profile photo are not looked up further. */
export async function readAnimalPhotos(ngoId: string, animals: PhotoSource[]): Promise<Map<string, string | null>> {
  const now = Date.now();
  const out = new Map<string, string | null>();
  const todo = animals.filter((a) => { const c = photoCache.get(`${ngoId}:${a.id}`); if (c && now - c.at < FRESH) { out.set(a.id, c.url); return false; } return true; });
  if (!todo.length) return out;
  const pick = new Map<string, string>();
  for (const a of todo) if (isPhoto(a.cover_photo)) pick.set(a.id, a.cover_photo!.trim());
  const rest = todo.filter((a) => !pick.has(a.id)).map((a) => a.id);
  for (let i = 0; i < rest.length; i += 100) {
    const chunk = rest.slice(i, i + 100);
    const ev = await evidencePhotos(ngoId, chunk, chunk.length * 6);
    const best = new Map<string, EvidenceRow>();
    for (const e of ev) { const d = dogOf(e); if (!d) continue; const b = best.get(d); if (!b || rank(e.kind) < rank(b.kind)) best.set(d, e); }
    for (const [d, e] of best) pick.set(d, e.url!);
  }
  const links = await openable([...pick.values()]);
  for (const a of todo) {
    const raw = pick.get(a.id);
    const url = raw ? links.get(raw) ?? null : null;
    out.set(a.id, url);
    /* A stored photo that could not be signed is not cached as "no photo": the next read tries again. */
    if (!raw || url) photoCache.set(`${ngoId}:${a.id}`, { url, at: now });
  }
  return out;
}

/** Photos for a list of animals, as a hook. Undefined for an animal still being read; null when it has none. */
export function useAnimalPhotos(ngoId: string | null | undefined, animals: PhotoSource[] | null | undefined) {
  const key = (animals ?? []).map((a) => `${a.id}=${a.cover_photo ?? ""}`).join("|");
  const list = useMemo(() => animals ?? [], [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [map, setMap] = useState<Map<string, string | null>>(new Map());
  useEffect(() => {
    if (!ngoId || !list.length) return;
    let alive = true;
    void readAnimalPhotos(ngoId, list).then((m) => { if (alive) setMap((old) => { const n = new Map(old); for (const [k, v] of m) n.set(k, v); return n; }); }).catch(() => { /* the placeholder stays */ });
    return () => { alive = false; };
  }, [ngoId, list]);
  return map;
}

export type GalleryPhoto = { key: string; url: string; kind: PhotoKind; at: string | null; caseId: string | null };
/** Every photo of one animal, profile photo first, then its cases' photos newest first. A failed read is an error, never "no photos". */
export async function readAnimalGallery(ngoId: string, dogId: string, cover: string | null | undefined): Promise<{ data?: GalleryPhoto[]; error?: string }> {
  const s = db(); if (!s) return { error: "Could not reach StrayPaw." };
  const r = await s.from("evidence_items").select("id,url,kind,created_at,case_id,cases!inner(dog_id,ngo_id)").eq("cases.ngo_id", ngoId).eq("cases.dog_id", dogId)
    .in("kind", PHOTO_KINDS as unknown as string[]).not("url", "is", null).order("created_at", { ascending: false }).limit(24);
  if (r.error) return { error: r.error.message };
  const ev = ((r.data ?? []) as unknown as (EvidenceRow & { id: string })[]).filter((e) => isPhoto(e.url));
  const raw = [...(isPhoto(cover) ? [{ key: "cover", url: cover!.trim(), kind: "cover" as PhotoKind, at: null, caseId: null }] : []),
    ...ev.sort((a, b) => rank(a.kind) - rank(b.kind)).map((e) => ({ key: e.id, url: e.url!, kind: e.kind as PhotoKind, at: e.created_at, caseId: e.case_id }))];
  const links = await openable(raw.map((p) => p.url));
  return { data: raw.flatMap((p) => { const u = links.get(p.url); return u ? [{ ...p, url: u }] : []; }) };
}

/* ── The map's animals ───────────────────────────────────────────── */

export type MapAnimal = { id: string; name: string | null; code: string | null; species: string | null; zone: string | null; cover_photo: string | null; sterilisation_status: string | null; vaccination_status: string | null; needs_help: boolean; last_seen: string | null; lat: number | null; lng: number | null; total_count: number };
export type MapQuery = { search: string; ster: "not_sterilised" | null; vacc: "not_vaccinated" | null; needs: boolean | null; zone: string | null };
const MAP_PAGE = 1000, MAP_MAX = 3000;
/** The register's animals for the map, with the list's own filters (org_animals: the database filters and scopes it to the
    member's organisation). At most 3,000, newest first; `total` says how many match. */
export async function readMapAnimals(q: MapQuery): Promise<{ data?: { rows: MapAnimal[]; total: number }; error?: string }> {
  const s = db(); if (!s) return { error: "Could not reach StrayPaw. Check the connection and try again." };
  const rows: MapAnimal[] = [];
  let total = 0;
  for (let off = 0; off < MAP_MAX; off += MAP_PAGE) {
    const r = await s.rpc("org_animals", { p_search: q.search.trim() || null, p_ster: q.ster, p_vacc: q.vacc, p_zone: q.zone || null, p_from: null, p_to: null, p_needs: q.needs, p_limit: MAP_PAGE, p_offset: off });
    if (r.error) return { error: r.error.message };
    const page = (Array.isArray(r.data) ? r.data : []) as MapAnimal[];
    rows.push(...page);
    total = Number(page[0]?.total_count ?? total);
    if (page.length < MAP_PAGE) break;
  }
  return { data: { rows, total: Math.max(total, rows.length) } };
}
/** A place the map can draw: recorded, not the 0,0 a missing place was saved as, and on the globe. */
export const placed = (a: { lat: number | null; lng: number | null }) => a.lat != null && a.lng != null && Number.isFinite(a.lat) && Number.isFinite(a.lng) && !(Math.abs(a.lat) < 0.0001 && Math.abs(a.lng) < 0.0001) && Math.abs(a.lat) <= 85 && Math.abs(a.lng) <= 180;
