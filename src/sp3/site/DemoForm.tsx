"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const TYPES: Record<string, string> = {
  demo: "Product demo for an ABC operator or NGO",
  pilot: "Pilot on one programme (operator or government)",
  ngo: "Workspace for a rescue or welfare group",
  careos: "WhatsApp field intake pilot list",
  funder: "Something else",
};

/** Sends through the existing /api/contact route (rate-limited, emailed to the StrayPaw inbox). */
export function DemoForm() {
  const q = useSearchParams();
  const initial = q?.get("type") && TYPES[q.get("type")!] ? q.get("type")! : "demo";
  const [type, setType] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const message = [
      `Request: ${TYPES[type]}`,
      `Organisation: ${get("org")}`,
      `Role: ${get("role")}`,
      `City / state: ${get("city")}`,
      `Phone: ${get("phone") || "not given"}`,
      "",
      get("notes") || "(no notes)",
    ].join("\n");
    setState("busy");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: get("name"), email: get("email"), subject: `${TYPES[type]}: ${get("org") || get("name")}`, message }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState("idle"); setError(data.error ?? "That did not send. Nothing was submitted."); return; }
      setState("sent");
    } catch { setState("idle"); setError("Could not reach StrayPaw. Check your connection; nothing was submitted."); }
  }

  if (state === "sent") return (
    <div className="s4-form" style={{ gap: 12 }} role="status">
      <CheckCircle2 size={28} style={{ color: "var(--s4-green)" }} />
      <h2 className="s4-h4">Request received.</h2>
      <p className="s4-body">It reached the StrayPaw team by email. We reply within two working days with times for a call. Nothing else happens until you agree to it.</p>
    </div>
  );

  return (
    <form onSubmit={submit} className="s4-form">
      <div className="s4-field"><label htmlFor="d-type">What would you like?</label>
        <select id="d-type" className="s4-input" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="s4-form-grid">
        <div className="s4-field"><label htmlFor="d-name">Your name</label><input id="d-name" name="name" className="s4-input" required autoComplete="name" /></div>
        <div className="s4-field"><label htmlFor="d-email">Work email</label><input id="d-email" name="email" type="email" className="s4-input" required autoComplete="email" /></div>
        <div className="s4-field"><label htmlFor="d-org">Organisation</label><input id="d-org" name="org" className="s4-input" required autoComplete="organization" /></div>
        <div className="s4-field"><label htmlFor="d-role">Your role</label><input id="d-role" name="role" className="s4-input" placeholder="e.g. Programme lead, veterinary officer" /></div>
        <div className="s4-field"><label htmlFor="d-city">City / state</label><input id="d-city" name="city" className="s4-input" /></div>
        <div className="s4-field"><label htmlFor="d-phone">Phone (optional)</label><input id="d-phone" name="phone" type="tel" className="s4-input" autoComplete="tel" /></div>
      </div>
      <div className="s4-field"><label htmlFor="d-notes">Your programme</label><textarea id="d-notes" name="notes" className="s4-input" placeholder="Programme type, wards, team size, how records are kept today, who you report to." /></div>
      {error && <p className="s4-err s3-err" role="alert">{error}</p>}
      <button type="submit" className="s4-btn is-primary" disabled={state === "busy"} style={{ justifySelf: "start" }}>{state === "busy" ? <><Loader2 size={16} className="animate-spin" />Sending</> : <>Send request <ArrowRight size={16} /></>}</button>
      <p className="s4-small">We use these details only to reply to you. See <a className="s4-blue" href="/privacy">privacy</a>.</p>
    </form>
  );
}
