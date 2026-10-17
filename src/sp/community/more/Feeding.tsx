"use client";

/* ════════════════════════════════════════════════════════════════════
   Community · Feeding spots (scoped feeder experience, brief §1). Places
   where people feed street animals regularly, so feeders can share days
   and an organisation knows where animals gather. Publicly a spot is an
   area and a locality name, never its pin: a pin can lead someone to
   the animals, or to the person who feeds them.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AreaMap } from "../../atlas/AreaMap";
import { PlacePicker } from "../../atlas/PlacePicker";
import { publicLocality } from "../../ui/place";
import { Ack, State, since } from "../../ui";
import { startFeedingSpot, type Receipt } from "../../data/work";
import "./more.css";

export type PublicSpot = { id: string; name: string; description: string | null; zone: string | null; h3: string | null; last_fed_at: string | null; volunteer_count: number; created_at: string };

export function Feeding({ spots }: { spots: PublicSpot[] }) {
  const [cell, setCell] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cells = useMemo(() => { const m = new Map<string, number>(); for (const s of spots) if (s.h3) m.set(s.h3, (m.get(s.h3) ?? 0) + 1); return [...m].map(([h3, n]) => ({ h3, value: n, hot: 0, label: "" })); }, [spots]);
  const shown = cell ? spots.filter((s) => s.h3 === cell) : spots;
  return (
    <div className="mo">
      <header className="mo-head">
        <p className="k">Community · feeding spots</p>
        <h1 className="display">Where animals are fed</h1>
        <p className="lede">Regular feeding spots, so feeders can share the days and an organisation knows where animals gather. Shown by area and locality, never the exact place.</p>
        <div className="row"><button type="button" className="btn is-ink" onClick={() => setAdding((v) => !v)}><Plus size={15} aria-hidden /> Add a spot you feed at</button></div>
      </header>
      {adding && <NewSpot onCancel={() => setAdding(false)} />}
      {!spots.length ? <State title="No feeding spot yet">Add the place you feed. Only its area is shown to others.</State> : (
        <div className="fz-grid">
          <div className="fz-map"><AreaMap cells={cells} selected={cell} onPick={setCell} label="Feeding spots by area" ink="#b65a3a" empty="No spot has an area yet." /></div>
          <ul className="fz-spots">
            {cell && <li><button type="button" className="chip is-on" onClick={() => setCell(null)}>One area · show all</button></li>}
            {shown.map((s) => (
              <li key={s.id}><Link href={`/community/feeding/${s.id}`} className="fz-spot">
                <b className="serif">{s.name}</b>
                <small>{publicLocality(s.zone) ?? "Locality not given"}</small>
                <span className="row" style={{ ["--g" as string]: "6px" }}><span className={`pill ${s.last_fed_at && Date.now() - Date.parse(s.last_fed_at) < 2 * 86400000 ? "is-care" : "is-plain"}`}>{s.last_fed_at ? `Fed ${since(s.last_fed_at)}` : "No feeding recorded yet"}</span><span className="pill is-plain">{s.volunteer_count} feeder{s.volunteer_count === 1 ? "" : "s"}</span></span>
              </Link></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NewSpot({ onCancel }: { onCancel: () => void }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [where, setWhere] = useState<{ lat: number; lng: number; zone: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  if (ready && !user) return <div className="fz-new"><p className="body">Sign in to add a feeding spot, so others know who to ask about it. <Link className="link" href="/join">Sign in</Link></p><button type="button" className="btn is-ghost is-s" onClick={onCancel}>Cancel</button></div>;
  return (
    <form className="fz-new" onSubmit={async (e) => { e.preventDefault(); if (!user || !where) return; setBusy(true); setR(null); const x = await startFeedingSpot({ name: name.trim(), description: desc.trim(), zone: where.zone || null, lat: where.lat, lng: where.lng }, { id: user.id, name: user.name }); setR(x); setBusy(false); if (x.ok && "id" in x) router.push(`/community/feeding/${x.id}`); }}>
      <div className="stack">
        <div className="field"><label htmlFor="fd-n">What people call it</label><input id="fd-n" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} placeholder="e.g. Behind the bus depot" /></div>
        <div className="field"><label htmlFor="fd-d">A note <span className="small">optional</span></label><textarea id="fd-d" className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="How many animals, what time, anything feeders should know" /></div>
        <p className="small">The pin is kept with the spot so feeders and organisations can find it. Everyone else sees only its area.</p>
        <div className="row"><button type="submit" className="btn is-ink" disabled={busy || !where || name.trim().length < 3}>{busy ? "Sending…" : "Add the spot"}</button><button type="button" className="btn is-ghost" onClick={onCancel}>Cancel</button></div>
        <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not added: {r.error}</Ack>) : !where ? <span className="small">Place the pin on the map.</span> : null}</div>
      </div>
      <div className="field"><span className="label">Where</span><PlacePicker value={where} onChange={setWhere} /></div>
    </form>
  );
}
