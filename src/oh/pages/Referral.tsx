"use client";

/* A person's referral to another facility, on their bite record.

   The clinician chooses what the person needs (vaccine, immunoglobulin or
   wound washing) and where. Facilities the programme set as this facility's
   pathway for that need come first, and each shows what it last confirmed
   and how long ago, so the choice rests on a named person's confirmation,
   never on a stock figure. The receiving facility sees the bite code, its
   category and the need, never who the person is, and marks whether they
   arrived; this record shows which. Before v2.6 is applied the section is
   simply absent. */
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { call, fmtDate, fmtTime, useRead, SERVICE_LABEL, SERVICE_SHORT, SERVICE_STATUS, TRANSFER, type ReferralOption, type TransferOut } from "../data";
import { Chip, Failed, Section, Seg, Sheet, useToast } from "../ui";

type Need = "arv" | "rig" | "wound_care";
const NEEDS: [Need, string][] = [["arv", "Vaccine"], ["rig", "Immunoglobulin"], ["wound_care", "Wound washing"]];
const missing = (e: string | null) => !!e && /could not find the function|does not exist|schema cache/i.test(e);
const daysAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));

export function Referral({ exposureId, canRefer, onChange }: { exposureId: string; canRefer: boolean; onChange: () => void }) {
  const list = useRead<TransferOut[]>(() => call("oh_exposure_transfers", { p_exposure: exposureId }), `xfer:${exposureId}`);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  if (missing(list.error)) return null;
  const rows = list.data ?? [];
  const sent = rows.filter((r) => r.status === "sent");
  const withdraw = async (id: string) => {
    const r = await call("oh_transfer_act", { p_transfer: id, p_action: "withdrawn" });
    if (r.error) toast(r.error, "flame"); else { toast("Referral withdrawn."); list.reload(); onChange(); }
  };

  return (
    <Section title="Referral" note="The receiving facility sees the bite code and what is needed, never who the person is"
      action={canRefer ? <button type="button" className="oh-btn small" onClick={() => setOpen(true)}>Refer this person</button> : undefined}>
      {list.error ? <Failed error={list.error} retry={list.reload} />
        : !rows.length ? <p className="oh-note">{canRefer ? "Not referred. Refer when this facility cannot give what the person needs." : "Not referred. A clinician refers from this page."}</p>
        : (
          <ul className="oh-rows">
            {rows.map((r) => (
              <li key={r.id} className="oh-row">
                <div className="oh-row-main">
                  <b>{SERVICE_LABEL[r.service] ?? r.service} at {r.to_short ?? r.to}</b>
                  <span>{r.status === "sent" ? `Referred ${fmtTime(r.sent_at)}${r.sent_by ? ` by ${r.sent_by}` : ""}` : `${TRANSFER[r.status]?.label ?? r.status}${r.closed_at ? `, ${fmtDate(r.closed_at)}` : ""}${r.closed_by ? ` · ${r.closed_by}` : ""}`}{r.note ? ` · ${r.note}` : ""}</span>
                </div>
                <div className="oh-row-meta">
                  <Chip tone={TRANSFER[r.status]?.tone}>{TRANSFER[r.status]?.label ?? r.status}</Chip>
                  {r.status === "sent" && canRefer ? <button type="button" className="oh-btn small quiet" onClick={() => void withdraw(r.id)}>Withdraw</button> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      {sent.length ? <p className="oh-note" style={{ marginTop: 8 }}>The receiving facility marks whether the person arrived. It appears here.</p> : null}
      {open ? <ReferSheet exposureId={exposureId} onClose={() => setOpen(false)} onDone={(m) => { setOpen(false); toast(m); list.reload(); onChange(); }} /> : null}
    </Section>
  );
}

function ReferSheet({ exposureId, onClose, onDone }: { exposureId: string; onClose: () => void; onDone: (m: string) => void }) {
  const opts = useRead<ReferralOption[]>(() => call("oh_referral_options", { p_exposure: exposureId }), `refopt:${exposureId}`);
  const [need, setNeed] = useState<Need>("rig");
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);

  /* The programme's pathway for this need first, then facilities that last
     confirmed it available, then the rest; the name breaks ties. */
  const ranked = useMemo(() => {
    const rank = (o: ReferralOption) => {
      const s = o.services.find((x) => x.service === need);
      return (o.pathways.includes(need) ? 0 : 4) + (s?.status === "available" ? 0 : s?.status === "limited" ? 1 : s?.status === "unavailable" ? 3 : 2);
    };
    return [...(opts.data ?? [])].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [opts.data, need]);
  const chosen = to && ranked.some((o) => o.id === to) ? to : null;

  const save = async () => {
    if (!chosen) return;
    setBusy(true); setErr(null);
    const r = await call("oh_refer_exposure", { p_exposure: exposureId, p_to: chosen, p_service: need, p_note: note.trim() || null });
    setBusy(false);
    if (r.error) setErr(r.error);
    else onDone(`Referred for ${SERVICE_SHORT[need].toLowerCase()} to ${ranked.find((o) => o.id === chosen)?.short_name ?? ranked.find((o) => o.id === chosen)?.name}.`);
  };

  return (
    <Sheet title="Refer this person" note="Choose what they need and where. The other facility sees the bite code and the need only." onClose={onClose}
      foot={<><button type="button" className="oh-btn" onClick={onClose}>Cancel</button><button type="button" className="oh-btn primary" disabled={busy || !chosen} onClick={() => void save()}>{busy ? "Referring…" : <>Refer <ArrowRight size={14} aria-hidden /></>}</button></>}>
      <Seg name="need" label="They need" value={need} onChange={(v) => { setNeed(v); setTo(null); }} options={NEEDS} />
      <fieldset className="oh-picks">
        <legend>Where</legend>
        {opts.loading && !opts.data ? <p className="oh-note">Reading the facilities in this programme…</p>
          : opts.error ? <Failed error={opts.error} retry={opts.reload} />
          : !ranked.length ? <p className="oh-note">No other facility is in this programme yet.</p>
          : ranked.map((o) => {
              const s = o.services.find((x) => x.service === need);
              const st = s ? SERVICE_STATUS[s.status] : null;
              return (
                <label key={o.id} className={`oh-pick${chosen === o.id ? " is-on" : ""}`}>
                  <input type="radio" name="refer-to" value={o.id} checked={chosen === o.id} onChange={() => setTo(o.id)} />
                  <span className="oh-pick-main"><b>{o.short_name ?? o.name}</b><small>{[o.area, o.pathways.includes(need) ? "Programme pathway" : null].filter(Boolean).join(" · ") || o.name}</small></span>
                  <span className="oh-pick-meta">{st ? <Chip tone={st.tone}>{st.label}</Chip> : <Chip>Never confirmed</Chip>}{s && s.status !== "not_verified" ? <small>{daysAgo(s.verified_at) === 0 ? "confirmed today" : `confirmed ${daysAgo(s.verified_at)} d ago`}</small> : null}</span>
                </label>
              );
            })}
      </fieldset>
      <label className="oh-field"><span>Note for the other facility <small style={{ color: "var(--muted)", fontWeight: 400 }}>optional</small></span>
        <textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="For example: needs immunoglobulin today; leaving now by auto" /><small style={{ color: "var(--muted)", fontSize: 12 }}>Never the person&apos;s name or phone number.</small></label>
      {err ? <Failed error={err} /> : null}
    </Sheet>
  );
}
