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
import { Btn, Empty, Head, Note, Page, Panel, Row, Rows, Section, Split, Tag } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { AreaMap } from "../../atlas/AreaMap";
import { PlacePicker } from "../../atlas/PlacePicker";
import { publicLocality } from "../../ui/place";
import { Ack, since } from "../../ui";
import { startFeedingSpot, type Receipt } from "../../data/work";
import "./more.css";

export type PublicSpot = { id: string; name: string; description: string | null; zone: string | null; h3: string | null; last_fed_at: string | null; volunteer_count: number; created_at: string };

export function Feeding({ spots }: { spots: PublicSpot[] }) {
  const [cell, setCell] = usePageState<string | null>("area", null);
  const [adding, setAdding] = useState(false);
  const cells = useMemo(() => { const m = new Map<string, number>(); for (const s of spots) if (s.h3) m.set(s.h3, (m.get(s.h3) ?? 0) + 1); return [...m].map(([h3, n]) => ({ h3, value: n, hot: 0, label: "" })); }, [spots]);
  const shown = cell ? spots.filter((s) => s.h3 === cell) : spots;
  const list = (
    <Section title={cell ? "Spots in this area" : "Spots"} count={shown.length} action={cell ? <Btn small variant="quiet" onClick={() => setCell(null)}>Show all areas</Btn> : undefined}>
      <Panel><Rows label="Feeding spots">
        {shown.map((s) => (
          <Row key={s.id} href={`/community/feeding/${s.id}`} title={s.name} meta={publicLocality(s.zone) ?? "Locality not given"}
            end={<><Tag tone={s.last_fed_at && Date.now() - Date.parse(s.last_fed_at) < 2 * 86400000 ? "green" : "plain"}>{s.last_fed_at ? `Fed ${since(s.last_fed_at)}` : "No feeding recorded yet"}</Tag><span>{s.volunteer_count} feeder{s.volunteer_count === 1 ? "" : "s"}</span></>} />
        ))}
      </Rows></Panel>
    </Section>
  );
  return (
    <Page>
      <Head title="Feeding spots"
        sum={<>{spots.length ? <><b>{spots.length}</b> regular feeding {spots.length === 1 ? "spot" : "spots"} on the record, so</> : "Regular feeding spots, so"} feeders can share the days and an organisation knows where animals gather. Shown by area and locality, never the exact place.</>}
        actions={<Btn variant="primary" icon={<Plus size={14} />} aria-expanded={adding} onClick={() => setAdding((v) => !v)}>Add a spot you feed at</Btn>} />
      {adding && <NewSpot onCancel={() => setAdding(false)} />}
      {!spots.length ? <Panel><Empty title="No feeding spot yet">Add the place you feed. Only its area is shown to others. An empty list says what has been shared, not where animals are fed.</Empty></Panel>
        : <Split side={<Section title="By area"><div className="cmo-map"><AreaMap cells={cells} selected={cell} onPick={setCell} label="Feeding spots by area" ink="#b65a3a" empty="No spot has an area yet." /></div></Section>}>{list}</Split>}
    </Page>
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
  if (ready && !user) return <Note action={<Btn small variant="quiet" onClick={onCancel}>Cancel</Btn>}>Sign in to add a feeding spot, so others know who to ask about it. <Link className="cmo-link" href="/join">Sign in</Link></Note>;
  return (
    <Section title="Add a spot you feed at">
      <form className="cmo-form" onSubmit={async (e) => { e.preventDefault(); if (!user || !where) return; setBusy(true); setR(null); const x = await startFeedingSpot({ name: name.trim(), description: desc.trim(), zone: where.zone || null, lat: where.lat, lng: where.lng }, { id: user.id, name: user.name }); setR(x); setBusy(false); if (x.ok && "id" in x) router.push(`/community/feeding/${x.id}`); }}>
        <div className="cmo-field"><label htmlFor="fd-n">What people call it</label><input id="fd-n" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} placeholder="e.g. Behind the bus depot" /></div>
        <div className="cmo-field"><label htmlFor="fd-d">A note <span>optional</span></label><textarea id="fd-d" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="How many animals, what time, anything feeders should know" /></div>
        <div className="cmo-field"><span className="cmo-label">Where</span><PlacePicker value={where} onChange={setWhere} /></div>
        <p className="cmo-fine">The pin is kept with the spot so feeders and organisations can find it. Everyone else sees only its area.</p>
        <div className="cmo-row"><Btn type="submit" variant="primary" disabled={busy || !where || name.trim().length < 3}>{busy ? "Sending…" : "Add the spot"}</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
        <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not added: {r.error}</Ack>) : !where ? <span className="cmo-fine">Place the pin on the map.</span> : null}</div>
      </form>
    </Section>
  );
}
