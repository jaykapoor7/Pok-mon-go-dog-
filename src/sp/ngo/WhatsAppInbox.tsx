"use client";

/* WhatsApp in Intake: reports from the field team and residents, one
   conversation per reporter. Photos, voice notes, translations and shared
   locations come from the CareOS backend (lib/careos); the reporter's number
   never reaches the workspace. Until the organisation links its WhatsApp
   Business number, the same screen offers that one step. */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, MapPin, MessageCircle, Sparkles, X } from "lucide-react";
import { careInbox, careInboxAct } from "@/lib/careos/inbox";
import type { CareInboxItem, CareUrgency } from "@/lib/careos/contract";
import { useAi } from "@/sp3/ai/AiPanel";
import { Reading } from "../ui/Reading";
import "./whatsapp-inbox.css";

type Load = { kind: "loading" } | { kind: "ok"; items: CareInboxItem[] } | { kind: "unlinked" } | { kind: "error" };
const URGENCY: Record<CareUrgency, string> = { emergency: "Emergency", urgent: "Urgent", routine: "Routine", unknown: "" };
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function WhatsAppInbox({ admin }: { admin: boolean }) {
  const ai = useAi();
  const [st, setSt] = useState<Load>({ kind: "loading" });
  const [on, setOn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [title, setTitle] = useState("");
  const [shown, setShown] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const r = await careInbox(["new", "triaged", "linked"]);
    if (r.connected) setSt({ kind: "ok", items: r.data });
    else setSt(r.reason === "not_deployed" ? { kind: "unlinked" } : { kind: "error" });
  }, []);
  useEffect(() => { void load(); }, [load]);

  const threads = useMemo(() => {
    if (st.kind !== "ok") return [];
    const by = new Map<string, CareInboxItem[]>();
    for (const m of st.items) by.set(m.thread_id, [...(by.get(m.thread_id) ?? []), m]);
    return [...by.values()].map((ms) => ms.sort((a, b) => a.received_at.localeCompare(b.received_at))).sort((a, b) => b[b.length - 1].received_at.localeCompare(a[a.length - 1].received_at));
  }, [st]);
  const thread = threads.find((t) => t[0].thread_id === on) ?? threads[0] ?? null;
  const last = thread?.[thread.length - 1] ?? null;

  const act = async (run: () => ReturnType<typeof careInboxAct>, done: string) => {
    setBusy(true); setNote(null);
    const r = await run();
    setBusy(false);
    if (r.connected) { setNote(done); setOpening(false); setTitle(""); void load(); }
    else setNote("That did not go through. Try again.");
  };

  if (st.kind === "loading") return <section className="wi" aria-busy="true" aria-label="WhatsApp"><p className="wi-quiet"><Reading>Reading WhatsApp</Reading></p></section>;
  if (st.kind === "unlinked") return (
    <section className="wi wi-link" aria-label="WhatsApp">
      <span className="wi-logo" aria-hidden><MessageCircle size={22} /></span>
      <h2>WhatsApp</h2>
      <p>Link your WhatsApp Business number to receive reports with photos, voice notes and location.</p>
      {admin ? <Link className="btn is-ink" href="/ngo/settings/connections">Link WhatsApp <ArrowRight size={15} aria-hidden /></Link> : <p className="wi-quiet">An admin in your organisation links the number in Organisation → Connections.</p>}
    </section>
  );
  if (st.kind === "error") return <section className="wi" aria-label="WhatsApp"><p className="wi-quiet" role="alert">WhatsApp messages could not be read. <button type="button" className="link" onClick={() => { setSt({ kind: "loading" }); void load(); }}>Try again</button></p></section>;
  if (!thread || !last) return (
    <section className="wi wi-link wi-empty" aria-label="WhatsApp">
      <span className="wi-logo" aria-hidden><MessageCircle size={22} /></span>
      <h2>No WhatsApp messages waiting</h2>
      <p>New reports from your team and residents appear here as they arrive.</p>
    </section>
  );

  return (
    <section className="wi wi-two" aria-label="WhatsApp">
      <ul className="wi-list" aria-label="Conversations">
        {threads.map((t) => { const m = t[t.length - 1]; const sel = m.thread_id === last.thread_id; return (
          <li key={m.thread_id}><button type="button" aria-current={sel ? "true" : undefined} onClick={() => { setOn(m.thread_id); setNote(null); setOpening(false); }}>
            <span className="wi-av" aria-hidden>{(m.reporter_name ?? "?").slice(0, 1)}</span>
            <span className="wi-who"><b>{m.reporter_name ?? "Reporter"}</b><small>{m.text_en ?? m.text ?? (m.media.length ? "Photo or voice note" : "Shared a location")}</small></span>
            <span className="wi-meta"><small>{time(m.received_at)}</small>{m.urgency !== "unknown" && m.urgency !== "routine" && <em className={`wi-u is-${m.urgency}`}>{URGENCY[m.urgency]}</em>}</span>
          </button></li>); })}
      </ul>
      <div className="wi-thread">
        <header><b>{last.reporter_name ?? "Reporter"}</b><small>{day(thread[0].received_at)} · {last.status === "linked" ? "Linked to a case" : last.owner_name ? `With ${last.owner_name}` : "New"}</small></header>
        <ol className="wi-msgs">
          {thread.map((m) => (
            <li key={m.id}>
              {m.media.map((x) => x.kind === "image" ? (
                <button key={x.id} type="button" className={`wi-img${x.sensitive && !shown.has(x.id) ? " is-veiled" : ""}`} onClick={() => setShown((s) => new Set(s).add(x.id))} aria-label={x.sensitive && !shown.has(x.id) ? "Show photo (may show an injury)" : "Photo"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.url} alt="" />
                </button>) : x.kind === "audio" ? <audio key={x.id} controls src={x.url} className="wi-audio" /> : <a key={x.id} href={x.url} className="link" target="_blank" rel="noreferrer">Open attachment</a>)}
              {m.text && <p>{m.text}</p>}
              {m.text_en && m.text_en !== m.text && <p className="wi-tr">{m.text_en}</p>}
              {m.location && <p className="wi-loc"><MapPin size={13} aria-hidden /> {m.location.label ?? "Shared location"}</p>}
              <small>{time(m.received_at)}</small>
            </li>
          ))}
        </ol>
        <footer className="wi-act">
          {last.status === "linked" && last.linked_case_id ? <Link className="btn is-s" href={`/ngo/cases/${last.linked_case_id}`}>Open the case <ArrowRight size={14} aria-hidden /></Link> : opening ? (
            <form className="wi-open" onSubmit={(e) => { e.preventDefault(); if (title.trim()) void act(() => careInboxAct({ type: "open_case", item_id: last.id, dog_id: last.linked_dog_id, title: title.trim(), severity: last.urgency === "emergency" ? "critical" : last.urgency === "urgent" ? "high" : "normal" }), "Case opened."); }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Case title, e.g. Injured dog near the market" aria-label="Case title" autoFocus />
              <button type="submit" className="btn is-ink is-s" disabled={busy || !title.trim()}>Open case</button>
              <button type="button" className="btn is-s" onClick={() => setOpening(false)}>Cancel</button>
            </form>
          ) : <>
            {!last.owner_id && <button type="button" className="btn is-s" disabled={busy} onClick={() => act(() => careInboxAct({ type: "claim", item_id: last.id }), "It's yours.")}><Check size={14} aria-hidden /> Take it</button>}
            <button type="button" className="btn is-ink is-s" disabled={busy} onClick={() => setOpening(true)}>Open a case</button>
            <button type="button" className="btn is-s" disabled={busy || ai.busy} onClick={() => ai.ask(`Prepare a case from this WhatsApp report: ${thread.map((m) => m.text_en ?? m.text).filter(Boolean).join(" / ")}`)}><Sparkles size={14} aria-hidden /> Prepare with Kaju</button>
            <button type="button" className="btn is-s is-quiet" disabled={busy} onClick={() => act(() => careInboxAct({ type: "dismiss", item_id: last.id, reason: "Not an animal-care matter" }), "Dismissed.")}><X size={14} aria-hidden /> Dismiss</button>
          </>}
          {note && <p className="wi-note" role="status">{note}</p>}
        </footer>
      </div>
    </section>
  );
}
