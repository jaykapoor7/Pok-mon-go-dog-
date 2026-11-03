"use client";

/* One place for "it worked" and "it didn't". Any screen calls
   notify({ tone, text, action? }) after a save, delete or send; the notice
   slides up at the bottom, says what happened in a plain sentence, offers
   one action (Undo, Try again) and leaves after a few seconds. Errors stay
   a little longer. Screen readers hear it through a live region. */

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

export type NoticeInput = { tone: "ok" | "error" | "busy"; text: string; action?: { label: string; run: () => void | Promise<void> } };
type Shown = NoticeInput & { key: number };
const EVENT = "sp:notice";

export function notify(n: NoticeInput) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<NoticeInput>(EVENT, { detail: n }));
}

export function Notices() {
  const [list, setList] = useState<Shown[]>([]);
  useEffect(() => {
    let k = 0;
    const on = (e: Event) => {
      const n = (e as CustomEvent<NoticeInput>).detail; const key = ++k;
      setList((l) => [...l.filter((x) => x.tone !== "busy"), { ...n, key }].slice(-3));
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const drop = (key: number) => setList((l) => l.filter((x) => x.key !== key));
  // How long each notice stays: long enough to read and press Undo. The bar
  // under it shows the time left and pauses while the pointer or focus is on it.
  const ms = (n: NoticeInput) => n.tone === "error" ? 9000 : n.action ? 8000 : 5000;
  return (
    <div className="nt-wrap" role="status" aria-live="polite">
      {list.map((n) => (
        <div key={n.key} className={`nt is-${n.tone}`}>
          {n.tone === "ok" ? <CheckCircle2 size={16} aria-hidden /> : n.tone === "error" ? <AlertCircle size={16} aria-hidden /> : <Loader2 size={16} className="nt-spin" aria-hidden />}
          <span>{n.text}</span>
          {n.action && <button type="button" className="nt-act" onClick={() => { const a = n.action!; drop(n.key); void a.run(); }}>{n.action.label}</button>}
          <button type="button" className="nt-x" aria-label="Dismiss" onClick={() => drop(n.key)}><X size={14} aria-hidden /></button>
          {n.tone !== "busy" && <i className="nt-bar" aria-hidden style={{ ["--nt-ms" as string]: `${ms(n)}ms` }} onAnimationEnd={() => drop(n.key)} />}
        </div>
      ))}
    </div>
  );
}
