"use client";

/* WhatsApp intake, as the coordinator sees it: a field worker's photo and
   voice note, and Kaju turning them into a record. Shown only in the local
   recording build until the WhatsApp Business connection is verified. */

import { useState } from "react";
import { CheckCheck, MessageCircle, Mic, Pause, Play, Sparkles } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { WHATSAPP_PROMPT } from "@/lib/demo/kaju-demo";

const BARS = [6, 10, 16, 9, 20, 14, 24, 12, 18, 8, 22, 15, 11, 19, 26, 13, 9, 17, 21, 10, 14, 7, 18, 12, 23, 9, 15, 11, 6, 13, 19, 8];

export function WhatsAppIntake() {
  const ai = useAi();
  const [playing, setPlaying] = useState(false);
  return (
    <section className="wa" aria-label="WhatsApp messages">
      <header className="wa-head">
        <span className="wa-av" aria-hidden>RK</span>
        <div><b>Ravi Kumar</b><small>Field team · Adyar van · +91 98••• ••410</small></div>
        <span className="wa-chip"><MessageCircle size={13} aria-hidden />WhatsApp</span>
      </header>
      <div className="wa-chat">
        <p className="wa-day">Today</p>
        <figure className="wa-msg is-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/seed-dogs/dog5.jpg" alt="Photo from the field: a brown female dog on a street" />
          <figcaption>07:42 <CheckCheck size={14} aria-hidden /></figcaption>
        </figure>
        <div className={`wa-msg is-voice${playing ? " is-playing" : ""}`}>
          <button type="button" className="wa-play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause voice note" : "Play voice note"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
          <span className="wa-wave" aria-hidden>{BARS.map((h, i) => <i key={i} style={{ height: h, animationDelay: `${i * 45}ms` }} />)}</span>
          <span className="wa-len"><Mic size={12} aria-hidden />0:14 · Hindi</span>
          <small>07:43 <CheckCheck size={14} aria-hidden /></small>
        </div>
      </div>
      <footer className="wa-foot">
        <p><Sparkles size={14} aria-hidden />Kaju can read the photo, transcribe the voice note and prepare the record. You confirm it.</p>
        <button type="button" className="btn is-ink" onClick={() => ai.ask(WHATSAPP_PROMPT)} disabled={ai.busy}>Prepare the record with Kaju</button>
      </footer>
    </section>
  );
}
