"use client";

/* ════════════════════════════════════════════════════════════════════
   Care Inbox. Everything waiting for a decision, in one place.

   WhatsApp messages arrive through the CareOS backend (built separately;
   see docs/CAREOS-INTEGRATION.md). Until its RPCs exist the inbox says
   plainly that WhatsApp is not connected; it never shows an empty list as
   if nothing were waiting. Resident reports from the web (live today) sit
   below, through the existing Incoming queue.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, FolderPlus, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { careInbox, careInboxAct } from "@/lib/careos/inbox";
import type { CareInboxItem, CareOsResult } from "@/lib/careos/contract";
import { timeAgo } from "@/lib/utils";
import "./careos-ws.css";

const URGENCY: Record<CareInboxItem["urgency"], string> = { emergency: "Emergency", urgent: "Urgent", routine: "Routine", unknown: "Not triaged" };

function WhatsAppQueue() {
  const [res, setRes] = useState<CareOsResult<CareInboxItem[]> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState("");

  const load = useCallback(async () => setRes(await careInbox(["new", "triaged"])), []);
  useEffect(() => { load(); }, [load]);

  const run = async (item: CareInboxItem, kind: "claim" | "open_case" | "dismiss") => {
    setBusy(item.id);
    const r = await careInboxAct(
      kind === "claim" ? { type: "claim", item_id: item.id }
        : kind === "open_case" ? { type: "open_case", item_id: item.id, dog_id: item.linked_dog_id, title: (item.text_en ?? item.text ?? "WhatsApp report").slice(0, 80), severity: item.urgency === "emergency" ? "critical" : item.urgency === "urgent" ? "high" : "normal" }
          : { type: "dismiss", item_id: item.id, reason: "Not an animal-care matter" },
    );
    setBusy(null);
    if (!r.connected) { setSaid("That action was not saved. Try again."); return; }
    setSaid(kind === "claim" ? "You own this message now." : kind === "open_case" ? "Case opened from the message." : "Message dismissed.");
    load();
  };

  if (!res) return <div className="ws-state" aria-busy="true">Checking WhatsApp…</div>;
  if (!res.connected) {
    return (
      <div className="ws-pilot">
        <MessageCircle size={20} aria-hidden />
        <div>
          <b>{res.reason === "not_deployed" ? "WhatsApp is not connected for your team yet." : "WhatsApp messages could not load just now."}</b>
          <p>{res.reason === "not_deployed"
            ? "WhatsApp intake is in pilot with founding NGOs. When it opens for your team, residents' messages, photos and locations will arrive here, ready to own, turn into a case or attach to an animal."
            : "Nothing was changed. Resident reports below are unaffected."}</p>
          {res.reason === "not_deployed" ? <Link href="/for-ngos#pilot">About the founding pilot <ArrowUpRight size={13} aria-hidden /></Link> : <button type="button" className="ws-linkbtn" onClick={load}>Try again</button>}
        </div>
      </div>
    );
  }
  if (res.data.length === 0) return <p className="ws-none">No WhatsApp messages are waiting.</p>;
  return (
    <>
      <p className="ws-live" role="status" aria-live="polite">{said}</p>
      <ul className="ws-rows is-inbox">
        {res.data.map((m) => (
          <li key={m.id} className={busy === m.id ? "is-busy" : ""}>
            {m.media[0] ? (
              <SensitiveVeil sensitive={m.media[0].sensitive} id={m.media[0].id} className="ws-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.media[0].url} alt="Photo sent with the report" />
              </SensitiveVeil>
            ) : <span className="ws-thumb is-none" aria-hidden><MessageCircle size={18} /></span>}
            <span className="ws-what">
              <b>{m.text_en ?? m.text ?? "Photo without a message"}</b>
              <small>{[m.reporter_name ?? "Resident", m.location?.label, timeAgo(m.received_at), m.owner_name ? `Owner · ${m.owner_name}` : "No owner yet"].filter(Boolean).join(" · ")}</small>
            </span>
            <span className={`ws-due is-${m.urgency === "emergency" || m.urgency === "urgent" ? "late" : "soon"}`}>{URGENCY[m.urgency]}</span>
            <span className="ws-acts">
              {!m.owner_id && <button type="button" className="ws-btn" onClick={() => run(m, "claim")} disabled={busy === m.id}><Check size={15} aria-hidden /> Own it</button>}
              <button type="button" className="ws-btn is-primary" onClick={() => run(m, "open_case")} disabled={busy === m.id}><FolderPlus size={15} aria-hidden /> Open case</button>
              <button type="button" className="ws-btn is-quiet" onClick={() => run(m, "dismiss")} disabled={busy === m.id} aria-label="Dismiss as not an animal-care matter"><X size={15} aria-hidden /></button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function CareInbox({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  if (!ready || !accessReady) return <div className="ws-state" aria-busy="true">Loading the inbox…</div>;
  if (!user || !member) return <div className="ws-state"><b>The Care Inbox belongs to an organisation.</b><p>Sign in as a member of your NGO to see what is waiting for your team. <Link href="/join">Sign in with your code</Link></p></div>;
  return (
    <div className="ws">
      <section className="ws-group" aria-labelledby="ib-wa">
        <header><h2 id="ib-wa">WhatsApp <span className="ws-tag">Pilot</span></h2><p>Messages, photos and locations from residents.</p></header>
        <WhatsAppQueue />
      </section>
      <section className="ws-group" aria-labelledby="ib-web">
        <header><h2 id="ib-web">Resident reports</h2><p>Reports sent through StrayPaw, waiting for your team to decide.</p></header>
        {children}
      </section>
    </div>
  );
}
