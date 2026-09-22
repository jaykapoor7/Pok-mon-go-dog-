"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MapCanvas } from "@/components/map/MapCanvas";
import { TasksSection } from "@/components/partner/TasksSection";
import { getMyOrg } from "@/lib/actions";
import { getMyAnimals, type AnimalRow } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { isClosedStatus, isNoAction, rescueCategory } from "@/lib/rescue-taxonomy";
import type { Dog, NGO } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const followDone = (status: string | null) => ["done", "completed", "cancelled", "canceled", "missed"].includes(String(status ?? "").toLowerCase());
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const num = (n: number) => n.toLocaleString("en-IN");
const sentence = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
/* Imported animals are named "Dog · <locality> · <month>", so appending the
   record's locality printed the place twice in one line. */
function who(r: PartnerRecordRow) {
  const label = r.animalLabel || r.straypawId || "Animal record";
  const place = (r.locality || "").trim();
  return place && !label.toLowerCase().includes(place.toLowerCase()) ? `${label} · ${place}` : label;
}

/* The organisation's operations console.

   It answers five questions in the order a field team actually asks them:
   what needs attention now, where is it, what work is underway, what
   changed, and what should I do next. Each answer is a movement in one
   continuous page rather than its own floating card — the status strip is
   part of the header, the queue and the map share one ruled surface
   because the map is where the queue is, and the programme and the recent
   ledger sit side by side below the fold as running lists.

   Every figure on this screen is read live from the organisation's own
   records. Nothing is illustrative. */
export function PartnerRecordHome() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [org, setOrg] = useState<NGO | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    if (!ready) return;
    /* Signed out is a real state, not a loading state: show the empty
       workspace rather than spinning on a read the viewer cannot make. */
    if (!user) { setRows([]); setAnimals([]); setOrg(null); return; }
    Promise.all([getPartnerRecordRows(), getMyAnimals(), getMyOrg().catch(() => null)])
      .then(([r, a, o]) => { setRows(r); setAnimals(a); setOrg(o); })
      .catch(() => { setRows([]); setAnimals([]); });
  }, [ready, user?.id]);

  /* Short form: spelled out, the date wrapped the header's eyebrow onto a
     second line of tracked capitals at phone widths. */
  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })); }, []);

  const s = useMemo(() => {
    const all = rows ?? [], now = Date.now();
    const rescues = all.filter(r => r.kind === "rescue");
    const outcomes = all.filter(r => r.kind === "outcome");
    const followups = all.filter(r => r.kind === "follow_up");
    const open = rescues.filter(r => !isClosedStatus(r.status));
    const closed = rescues.filter(r => isClosedStatus(r.status));
    const noAction = outcomes.filter(r => isNoAction({ title: r.title, detail: r.detail, subtype: r.subtype, status: r.status }));
    const overdue = followups.filter(r => !followDone(r.status) && +new Date(r.date) < now);
    const next7 = followups.filter(r => !followDone(r.status) && +new Date(r.date) >= now && +new Date(r.date) <= now + 604800000);

    const cats = new Map<string, number>(), places = new Map<string, { total: number; open: number; noAction: number }>(), byAnimal = new Map<string, number>();
    for (const r of rescues) {
      const c = rescueCategory(r); cats.set(c, (cats.get(c) ?? 0) + 1);
      const k = r.locality || "Not recorded", v = places.get(k) ?? { total: 0, open: 0, noAction: 0 };
      v.total++; if (!isClosedStatus(r.status)) v.open++; places.set(k, v);
      if (r.animalId) byAnimal.set(r.animalId, (byAnimal.get(r.animalId) ?? 0) + 1);
    }
    for (const r of noAction) { const k = r.locality || "Not recorded", v = places.get(k) ?? { total: 0, open: 0, noAction: 0 }; v.noAction++; places.set(k, v); }

    /* One queue, ordered by what will go wrong first: an overdue follow-up
       outranks an open rescue, and within each the oldest comes first. */
    const queue = [
      ...overdue.map(r => ({ r, urgent: true })).sort((a, b) => +new Date(a.r.date) - +new Date(b.r.date)),
      ...open.map(r => ({ r, urgent: false })).sort((a, b) => +new Date(a.r.date) - +new Date(b.r.date)),
    ];
    const changed = [...closed, ...outcomes].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5);

    return {
      rescues, open, closed, noAction, overdue, next7, queue, changed,
      completion: pct(closed.length, rescues.length),
      repeat: [...byAnimal.values()].filter(n => n > 1).length,
      categories: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      places: [...places.entries()].map(([name, v]) => ({ name, ...v, score: v.open * 3 + v.noAction * 2 + v.total * 0.15 })).sort((a, b) => b.score - a.score).slice(0, 5),
    };
  }, [rows]);

  /* The map is drawn from the organisation's own located animals. An animal
     carrying an open rescue is marked as needing help so the queue and the
     geography agree with one another. */
  const openAnimalIds = useMemo(() => new Set(s.open.map(r => r.animalId).filter(Boolean) as string[]), [s.open]);
  const markers: Dog[] = useMemo(() => animals
    .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lng) && (a.lat !== 0 || a.lng !== 0))
    .slice(0, 400)
    .map(a => ({
      id: a.id, name: a.name, zone: a.zone ?? "", lat: a.lat, lng: a.lng,
      status: openAnimalIds.has(a.id) ? "injured" : "seen", cover_photo: a.cover_photo ?? "", photos: [],
      size: "medium", color: "", is_friendly: true, needs_help: openAnimalIds.has(a.id),
      sterilised: false, vaccinated: false, trust_score: 50, sightings_count: 1, feed_count: 0,
      first_seen: a.last_seen, last_seen: a.last_seen, last_fed_at: null, community_notes: [],
    })), [animals, openAnimalIds]);

  if (rows === null) return <main className="pr pr-loading">Loading the organisation record…</main>;

  const blank = s.rescues.length === 0 && animals.length === 0;
  const max = Math.max(1, ...s.categories.map(([, n]) => n));
  const href = (r: PartnerRecordRow) => r.animalId ? `/partner/animals/${r.animalId}` : r.caseId ? `/partner/cases/${r.caseId}` : "/partner/records";

  return <main className="pr">
    {/* The header carries the organisation, the day, and the one action
        that starts work. The status strip belongs to it, so the counts are
        read as the state of this console rather than as three tiles. */}
    <header className="pr-head">
      <div>
        <p className="pr-org">{org?.name ?? "Your organisation"}{today ? <> <span>·</span> {today}</> : null}</p>
        <h1>What needs attention</h1>
      </div>
      <div className="pr-head-actions">
        <Link href="/partner/cases/new" className="pr-primary"><Plus size={16}/>New rescue case</Link>
        <Link href="/partner/records" className="pr-quiet"><Search size={14}/>Find a record</Link>
      </div>
    </header>

    {/* Four figures reading zero is a page shouting an absence. Until there
        is something to count, the setup section below is the first thing
        worth reading. */}
    {!blank && <div className="pr-strip">
      <Link href="/partner/records?view=overdue"><b className={s.overdue.length ? "hot" : ""}>{num(s.overdue.length)}</b><span>follow-ups overdue</span></Link>
      <Link href="/partner/records?view=rescue"><b>{num(s.open.length)}</b><span>rescues open</span></Link>
      <Link href="/partner/records?view=overdue"><b>{num(s.next7.length)}</b><span>due within 7 days</span></Link>
      <Link href="/partner/animals"><b>{num(animals.length)}</b><span>animals on record</span></Link>
    </div>}

    {blank && <section className="pr-setup">
      <div>
        <h2>Start with the records you already keep.</h2>
        <p>Import an existing workbook, open your first rescue case, or add an animal directly. StrayPaw keeps your own source IDs and builds a permanent animal identity underneath them.</p>
      </div>
      <div className="pr-setup-actions">
        <Link href="/partner/import" className="pr-primary">Import workbook</Link>
        <Link href="/partner/cases/new" className="pr-quiet">New rescue case</Link>
      </div>
    </section>}

    {/* Queue and geography on one surface: the work, and where the work is. */}
    <section className="pr-work" aria-label="Today’s operations">
      <div className="pr-queue">
        <p className="pr-eyebrow"><span>The queue</span><Link href="/partner/records">All records <ArrowUpRight size={12}/></Link></p>
        {s.queue.length === 0
          ? <p className="pr-empty">{blank ? "Nothing is queued yet. The first case you open appears here." : "Nothing is overdue and no rescue is open. This is the state you want."}</p>
          : <ul className="pr-list">
              {s.queue.slice(0, 7).map(({ r, urgent }) => <li key={`${r.source}-${r.id}`}>
                <Link href={href(r)}>
                  <i className={urgent ? "hot" : ""} aria-hidden/>
                  <span className="pr-what"><b>{sentence(r.title || (urgent ? "Follow-up due" : "Open rescue"))}</b><small>{who(r)}</small></span>
                  <span className="pr-when"><small>{urgent ? "Overdue" : rescueCategory(r)}</small><small>{timeAgo(r.date)}</small></span>
                </Link>
              </li>)}
            </ul>}
        {s.queue.length > 7 && <Link href="/partner/records" className="pr-more">{num(s.queue.length - 7)} more waiting <ArrowUpRight size={13}/></Link>}
        <div className="pr-tasks"><TasksSection compact/></div>
      </div>

      <div className="pr-geo">
        <p className="pr-eyebrow"><span>Where it is</span><Link href="/partner/map">Field map <ArrowUpRight size={12}/></Link></p>
        <div className="pr-map">
          {markers.length
            ? <MapCanvas dogs={markers} onSelect={dog => { if (dog) router.push(`/partner/animals/${dog.id}`); }}/>
            : <p className="pr-map-empty">No animal on your register carries a location yet. Coordinates arrive with a report, a case, or an import.</p>}
        </div>
        {s.places.length > 0 && <ul className="pr-places">
          {s.places.map(p => <li key={p.name}><Link href="/partner/map">
            <span className="pr-place"><b>{p.name}</b><small>{num(p.open)} open · {num(p.noAction)} closed without field action</small></span>
            <em>{num(p.total)}</em>
          </Link></li>)}
        </ul>}
      </div>
    </section>

    {/* Underway, and what changed — two running lists, one continuous band. */}
    <section className="pr-flow" aria-label="Programme and recent changes">
      <div>
        <p className="pr-eyebrow"><span>Work underway</span><Link href="/partner/reports">Analyse <ArrowUpRight size={12}/></Link></p>
        {s.categories.length === 0
          ? <p className="pr-empty">Categories appear once rescues are on the record.</p>
          : <div className="pr-bars">{s.categories.map(([name, n], i) => <div key={name}>
              <p><span>{name}</span><em>{num(n)}</em></p>
              <div className="pr-bar"><div className={i === 0 ? "lead" : ""} style={{ width: `${Math.max(3, (n / max) * 100)}%` }}/></div>
            </div>)}</div>}
      </div>
      <div>
        <p className="pr-eyebrow"><span>What changed</span><Link href="/partner/records">Record <ArrowUpRight size={12}/></Link></p>
        {s.changed.length === 0
          ? <p className="pr-empty">Closed cases and recorded outcomes will show here.</p>
          : <ul className="pr-changes">{s.changed.map(r => <li key={`${r.source}-${r.id}`}><Link href={href(r)}>
              <span className="pr-place"><b>{sentence(r.title || "Record updated")}</b><small>{who(r)}</small></span>
              <em>{timeAgo(r.date)}</em>
            </Link></li>)}</ul>}
      </div>
    </section>

    <footer className="pr-foot">
      <p><b>{s.completion}%</b> of rescues closed <span>·</span> <b>{num(s.repeat)}</b> repeat animals <span>·</span> <b>{num(s.noAction.length)}</b> closed without field action</p>
      <p className="pr-foot-links"><Link href="/partner/map">Map</Link><Link href="/partner/reports">Reports</Link><Link href="/partner/animals">Records</Link></p>
    </footer>
  </main>;
}
