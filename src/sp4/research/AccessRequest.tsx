"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DATASETS } from "./catalogue";

/* A request, not a grant: it is sent to the StrayPaw team through the
   normal contact route and nothing is unlocked by submitting it. */
export function AccessRequest() {
  const q = useSearchParams();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    setState("sending"); setError(null);
    const message = [
      `Institution: ${v("institution")}`, `Role: ${v("role")}`, `Dataset or collaboration: ${v("dataset")}`,
      `Purpose and research question:\n${v("purpose")}`, `Ethics approval: ${v("ethics")}`, `Publication plan: ${v("publication")}`,
    ].join("\n\n");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v("name"), email: v("email"), subject: `Research data request: ${v("dataset")}`.slice(0, 160), message }) });
      if (!r.ok) throw Error((await r.json().catch(() => ({}))).error ?? "The request could not be sent.");
      setState("sent");
    } catch (x) { setState("error"); setError(x instanceof Error ? x.message : "The request could not be sent."); }
  };
  if (state === "sent") return <p className="rs-sent" role="status">Request sent. We will reply by email. Nothing has been shared or unlocked yet.</p>;
  return (
    <form className="rs-form" onSubmit={submit}>
      <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
      <label>Work email<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
      <label>Institution<input name="institution" required maxLength={160} /></label>
      <label>Your role<input name="role" maxLength={120} placeholder="e.g. PhD researcher, epidemiologist" /></label>
      <label>Dataset or collaboration<select name="dataset" defaultValue={q?.get("dataset") ?? "partner-operations"}>{DATASETS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}<option value="collaboration">Propose a collaboration</option></select></label>
      <label>Purpose and research question<textarea name="purpose" required minLength={40} maxLength={3000} rows={5} /></label>
      <label>Ethics approval<select name="ethics" defaultValue="not-yet"><option value="approved">Approved (we will ask for the reference)</option><option value="pending">Applied, pending</option><option value="not-yet">Not yet applied</option><option value="not-needed">Not needed: no human participants</option></select></label>
      <label>How results will be published<input name="publication" maxLength={300} /></label>
      {error && <p className="rs-err" role="alert">{error}</p>}
      <button type="submit" className="s4-btn is-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send the request"}</button>
    </form>
  );
}
