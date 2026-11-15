"use client";

/* ════════════════════════════════════════════════════════════════════
   Feeding spots (/community/feeding): places where people feed street
   animals regularly, so feeders can share days and an organisation knows
   where animals gather. Publicly a spot is an area and a locality name,
   never its pin. Adding one needs sign-in and calls create_feeding_zone.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createFeedingZone } from "@/lib/feeding-actions";
import { Ack, Body, Btn, Empty, Head, List, Note, Panel, Row, Sec, Split, Tag } from "../kit";
import { AreaBlooms, PinPicker } from "../map";
import { run, type Receipt } from "../receipt";
import { plural, publicLocality, since } from "../fmt";
import type { PublicSpot } from "./spots";

export function Feeding({ spots }: { spots: PublicSpot[] }) {
  const [cell, setCell] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cells = useMemo(() => { const m = new Map<string, number>(); for (const s of spots) if (s.h3) m.set(s.h3, (m.get(s.h3) ?? 0) + 1); return [...m].map(([h3, value]) => ({ h3, value })); }, [spots]);
  const shown = cell ? spots.filter((s) => s.h3 === cell) : spots;
  return (
    <>
      <Head title="Feeding spots"
        sum={<>{spots.length ? <><b>{spots.length}</b> regular feeding {plural(spots.length, "spot")} on the record, so</> : "Regular feeding spots, so"} feeders can share the days and an organisation knows where animals gather. Shown by area and locality, never the exact place.</>}
        actions={<Btn variant="primary" icon={<Plus size={16} aria-hidden />} aria-expanded={adding} aria-controls="fd-new" onClick={() => setAdding((v) => !v)}>Add a spot you feed at</Btn>} />
      <Body>
        {adding && <NewSpot onCancel={() => setAdding(false)} />}
        {!spots.length ? <Empty title="No feeding spot yet">Add the place you feed. Only its area is shown to others. An empty list says what has been shared, not where animals are fed.</Empty> : (
          <Split side={<Sec title="By area" note="Choose an area to narrow the list. Areas, never addresses."><AreaBlooms cells={cells} selected={cell} onPick={setCell} label="Feeding spots by area" ink="#b65a3a" empty="No spot has an area yet." /></Sec>}>
            <Sec title={cell ? "Spots in this area" : "Spots"} count={shown.length} action={cell ? <Btn small variant="quiet" onClick={() => setCell(null)}>Show every area</Btn> : undefined}>
              <List label="Feeding spots">
                {shown.map((s) => (
                  <Row key={s.id} href={`/community/feeding/${s.id}`} title={s.name} meta={publicLocality(s.zone) ?? "Locality not given"}
                    end={<><Tag tone={s.last_fed_at && Date.now() - Date.parse(s.last_fed_at) < 2 * 86400000 ? "green" : "plain"}>{s.last_fed_at ? `Fed ${since(s.last_fed_at)}` : "No feeding recorded yet"}</Tag><span>{s.volunteer_count} {plural(s.volunteer_count, "feeder")}</span></>} />
                ))}
              </List>
            </Sec>
          </Split>
        )}
      </Body>
    </>
  );
}

function NewSpot({ onCancel }: { onCancel: () => void }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [where, setWhere] = useState<{ lat: number; lng: number; zone: string } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Receipt | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  if (!ready) return <p className="pb-fine" role="status">Checking whether you are signed in…</p>;
  if (!user) return <Note action={<><Link className="pb-btn is-primary is-s" href="/sign-in?next=/community/feeding">Sign in</Link><Btn small variant="quiet" onClick={onCancel}>Cancel</Btn></>}>Sign in to add a feeding spot, so others know who to ask about it.</Note>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { setProblem("Give the spot a name of at least three letters, the one people use for it."); return; }
    if (!where) { setProblem("Place the pin where you feed: search, use where you are, or drag the map."); return; }
    setProblem(null); setBusy(true); setR(null);
    let id: string | null = null;
    const x = await run(`fz:${name.trim()}`, "Feeding spot added", async () => { id = await createFeedingZone({ name: name.trim(), description: desc.trim(), zone: where.zone || null, lat: where.lat, lng: where.lng }, { id: user.id, name: user.name }); return !!id && id !== "demo-zone"; });
    setR(x); setBusy(false);
    if (x.ok && id) router.push(`/community/feeding/${id}`);
  };
  return (
    <Sec title="Add a spot you feed at" id="fd-new">
      <Panel>
        <form className="pb-form" onSubmit={submit} noValidate>
          <div className="pb-field"><label htmlFor="fd-n">What people call it</label><input id="fd-n" className="pb-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Behind the bus depot" autoComplete="off" /></div>
          <div className="pb-field"><label htmlFor="fd-d">A note <span className="pb-opt">optional</span></label><textarea id="fd-d" className="pb-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="How many animals, what time, anything feeders should know" /></div>
          <div className="pb-field"><span className="pb-label">Where</span><PinPicker value={where} label={label} onLabel={setLabel} onPick={(p) => { setWhere(p); setProblem(null); }} /></div>
          <p className="pb-fine">The pin is kept with the spot so feeders and organisations can find it. Everyone else sees only its area.</p>
          {problem && <p className="pb-ack is-failed" role="alert">{problem}</p>}
          <div className="pb-actions"><Btn type="submit" variant="primary" disabled={busy}>{busy ? "Sending…" : "Add the spot"}</Btn><Btn variant="quiet" onClick={onCancel}>Cancel</Btn></div>
          <div aria-live="polite">{busy ? <Ack state="pending">Sending…</Ack> : r ? (r.ok ? <Ack state="saved">{r.what}. Opening it…</Ack> : <Ack state="failed">Not added: {r.error}</Ack>) : null}</div>
        </form>
      </Panel>
    </Sec>
  );
}
