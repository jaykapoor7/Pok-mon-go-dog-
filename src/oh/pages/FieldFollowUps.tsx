"use client";

/* An NGO's programme work: follow-ups from hospitals, labs and coordinators,
   and the samples it has sent. A follow-up never carries patient details. */
import Link from "next/link";
import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { useOh } from "../Shell";
import { call, daysFrom, fmtDate, select, useRead, HANDOFF, HANDOFF_KIND, RESULT, SAMPLE, SPECIES, type Dog, type Handoff, type Institution, type Sample } from "../data";
import { Chip, Empty, Failed, Head, Loading, Section, Sheet, Stat, useToast } from "../ui";

export function FieldFollowUps() {
  const { place, reload: reloadPlaces } = useOh();
  const id = place!.institution_id;
  const hand = useRead<Handoff[]>(() => select<Handoff>("oh_handoffs", { to_institution: id }), `h:${id}`);
  const samples = useRead<Sample[]>(() => select<Sample>("oh_samples", { submitted_by: id }), `s:${id}`);
  const partners = useRead<Institution[]>(() => select<Institution>("oh_institutions", { programme_id: place!.programme.id }), `inst:${place!.programme.id}`);
  const name = useMemo(() => new Map((partners.data ?? []).map((i) => [i.id, i.short_name ?? i.name])), [partners.data]);
  const [closing, setClosing] = useState<Handoff | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const toast = useToast();
  const list = (hand.data ?? []).slice().sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9") || b.created_at.localeCompare(a.created_at));
  const open = list.filter((h) => h.status === "open" || h.status === "accepted"), closed = list.filter((h) => h.status === "done" || h.status === "declined").reverse();
  const overdue = open.filter((h) => h.due_on && h.due_on < new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const accept = async (h: Handoff) => { const r = await call("oh_handoff_act", { p_handoff: h.id, p_action: "accept" }); if (r.error) toast(r.error, "flame"); else { toast("Accepted. It is now in progress for your team."); hand.reload(); reloadPlaces(); } };
  const ngoId = partners.data?.find((i) => i.id === id)?.ngo_id ?? null;

  return (
    <main className="oh-page" id="main-content">
      <Head eyebrow={place!.programme.name} title="Programme follow-ups" lede="Animals to find and observe after a bite, vaccination requests and laboratory results for your team."
        actions={<Link className="oh-btn primary" href={`/workspace/${id}/sample`}><FlaskConical size={16} aria-hidden />Send a sample</Link>} />
      <dl className="oh-stats">
        <Stat label="Open" value={hand.error ? null : open.length} href="#work" />
        <Stat label="Overdue" value={hand.error ? null : overdue.length} tone={overdue.length ? "flame" : undefined} href="#work" />
        <Stat label="Samples at the laboratory" value={samples.error ? null : samples.data?.filter((s) => !["resulted", "rejected"].includes(s.status)).length} href="#samples" />
        <Stat label="Closed" value={hand.error ? null : closed.length} tone="green" />
      </dl>
      <Section title="Follow-ups" id="work">
        <nav className="oh-tabs" aria-label="Show" style={{ marginTop: 0 }}>
          <a href="#work" aria-current={tab === "open" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("open"); }}>Open ({open.length})</a>
          <a href="#work" aria-current={tab === "closed" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("closed"); }}>Closed ({closed.length})</a>
        </nav>
        {hand.loading && !hand.data ? <Loading rows={4} /> : hand.error ? <Failed error={hand.error} retry={hand.reload} /> : !(tab === "open" ? open : closed).length ? <Empty title={tab === "open" ? "Nothing open" : "Nothing closed yet"} /> : (
          <div className="oh-rows">
            {(tab === "open" ? open : closed).slice(0, 40).map((h) => {
              const late = h.due_on && overdue.includes(h);
              return (
                <div className="oh-row" key={h.id}>
                  <span className="oh-row-mark" data-tone={late ? "flame" : h.kind === "result_notice" ? "amber" : HANDOFF[h.status].tone || undefined} aria-hidden />
                  <div className="oh-row-main">
                    <b>{h.title}</b>
                    <span className="wrap">{HANDOFF_KIND[h.kind]} from {h.from_institution ? name.get(h.from_institution) ?? "a partner" : "the programme"} · {h.ward ?? "Ward not recorded"}{h.place ? ` · ${h.place}` : ""}{h.outcome && tab === "closed" ? ` · ${h.outcome}` : ""}</span>
                  </div>
                  <div className="oh-row-meta">
                    {h.due_on && tab === "open" ? <span style={{ color: late ? "var(--flame)" : undefined }}>{late ? `${-daysFrom(h.due_on)} day${daysFrom(h.due_on) === -1 ? "" : "s"} overdue` : `Due ${fmtDate(h.due_on)}`}</span> : null}
                    <Chip tone={HANDOFF[h.status].tone}>{HANDOFF[h.status].label}</Chip>
                    {h.status === "open" ? <button type="button" className="oh-btn small" onClick={() => accept(h)}>Accept</button> : null}
                    {h.status === "open" || h.status === "accepted" ? <button type="button" className="oh-btn small primary" onClick={() => setClosing(h)}>Record what you found</button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Samples you sent" id="samples">
        {samples.loading && !samples.data ? <Loading rows={2} /> : samples.error ? <Failed error={samples.error} retry={samples.reload} /> : !samples.data?.length ? <Empty title="No samples sent">When an observed animal is sick or dies, send a sample from here.</Empty> : (
          <div className="oh-rows">
            {samples.data.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map((s) => (
              <Link className="oh-row" key={s.id} href={`/workspace/${id}/record/${s.id}`}>
                <div className="oh-row-main"><b>{s.code} · {SPECIES[s.species]}</b><span>{s.ward ?? "Ward not recorded"} · collected {fmtDate(s.collected_on)}</span></div>
                <div className="oh-row-meta">{s.result ? <Chip tone={RESULT[s.result].tone}>{RESULT[s.result].label}</Chip> : <Chip tone={SAMPLE[s.status].tone}>{SAMPLE[s.status].label}</Chip>}</div>
              </Link>
            ))}
          </div>
        )}
      </Section>
      {closing ? <Outcome h={closing} ngoId={ngoId} institution={id} onClose={() => setClosing(null)} onDone={(m) => { setClosing(null); toast(m); hand.reload(); reloadPlaces(); }} /> : null}
    </main>
  );
}

function Outcome({ h, ngoId, institution, onClose, onDone }: { h: Handoff; ngoId: string | null; institution: string; onClose: () => void; onDone: (m: string) => void }) {
  const dogs = useRead<Dog[]>(() => select<Dog>("dogs", ngoId && h.ward ? { ngo_id: ngoId, zone: h.ward } : { ngo_id: ngoId ?? "" }, "id,name,code,zone,vaccination_status", 100), `dogs:${ngoId}:${h.ward}`, !!ngoId && h.kind === "animal_followup");
  const [outcome, setOutcome] = useState(""), [animal, setAnimal] = useState(""), [decline, setDecline] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await call("oh_handoff_act", { p_handoff: h.id, p_action: decline ? "decline" : "done", p_outcome: outcome, p_animal: animal || null });
    setBusy(false); if (r.error) setErr(r.error); else onDone(decline ? "Declined. The sender can see your reason." : "Saved. The sender can see what you found.");
  };
  return (
    <Sheet title="Record what you found" note={h.title} onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || outcome.trim().length < 3} onClick={save}>{busy ? "Saving…" : decline ? "Decline" : "Close follow-up"}</button></>}>
      {h.detail ? <p className="oh-note" style={{ whiteSpace: "pre-line" }}>{h.detail}</p> : null}
      <label className="oh-field"><span>{decline ? "Why you cannot do this" : "What you found"}</span><textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={600} placeholder={decline ? "For example: outside our ward" : "For example: dog found alive, observed for ten days, healthy"} /></label>
      {h.kind === "animal_followup" && !decline ? (
        <label className="oh-field"><span>The animal on your register</span>
          <select value={animal} onChange={(e) => setAnimal(e.target.value)}><option value="">Not on the register, or not found</option>{(dogs.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name ?? d.code}{d.code && d.name ? ` · ${d.code}` : ""}{d.vaccination_status === "vaccinated" ? " · vaccinated" : ""}</option>)}</select>
          <small>Linking the animal keeps its history in one place.</small>
        </label>
      ) : null}
      {h.kind === "animal_followup" && !decline ? <Link className="oh-btn" href={`/workspace/${institution}/sample?handoff=${h.id}&ward=${encodeURIComponent(h.ward ?? "")}&place=${encodeURIComponent(h.place ?? "")}`}><FlaskConical size={16} aria-hidden />The animal is sick or died: send a sample</Link> : null}
      <label className="oh-check"><input type="checkbox" checked={decline} onChange={(e) => setDecline(e.target.checked)} /><span>My team cannot take this on</span></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
