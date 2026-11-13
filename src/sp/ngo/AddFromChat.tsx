"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Add an animal.

   Teams already report from the street on WhatsApp. So adding an animal
   is: paste the message. Kaju reads it, finds the animal, place and what
   happened, checks it against the register, and shows the record ready to
   confirm. Nothing is saved until a person confirms it.
   Recording by hand is still there for the times there is no message.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ClipboardPaste, MessageCircle } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { Head, Page } from "@/ws/kit";
import { NgoGate } from "./Gate";
import "./add.k.css";

const SAMPLE = "Brown female dog, limping, near HSR Layout 14th Main bus stop, Bengaluru. Found 9am today. Needs treatment.";

export function AddFromChat() {
  const ai = useAi();
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const paste = async () => { try { const t = await navigator.clipboard.readText(); if (t.trim()) { setText(t.slice(0, 4000)); setNote(null); } else setNote("Nothing is copied yet. Copy the message in WhatsApp first."); } catch { setNote("Press and hold in the box and choose Paste."); } };
  const read = () => { const t = text.trim(); if (!t) return; ai.setOpen(true); ai.ask(t, { display: t.length > 140 ? `${t.slice(0, 140)}…` : t }); };
  return (
    <NgoGate title="Add an animal" lede="Paste the message your team sent. Kaju turns it into a record for you to confirm.">
      <Page width="narrow">
        <Head title="Add an animal" />
        <ol className="ad-steps" aria-label="How it works">
          <li><span aria-hidden>1</span>Copy the WhatsApp message</li>
          <li><span aria-hidden>2</span>Paste it here</li>
          <li><span aria-hidden>3</span>Check and confirm</li>
        </ol>
        <div className="ad-box">
          <label htmlFor="ad-text"><MessageCircle size={20} aria-hidden />The message</label>
          <textarea id="ad-text" value={text} maxLength={4000} rows={6} placeholder={SAMPLE} onChange={(e) => { setText(e.target.value); setNote(null); }} />
          <div className="ad-acts">
            <button type="button" className="ad-paste" onClick={paste}><ClipboardPaste size={18} aria-hidden />Paste</button>
            <button type="button" className="ad-go" disabled={!text.trim() || ai.busy} onClick={read}>{ai.busy ? "Reading…" : "Read it"}</button>
          </div>
          {note ? <p className="ad-note" role="status">{note}</p> : null}
        </div>
      </Page>
    </NgoGate>
  );
}
