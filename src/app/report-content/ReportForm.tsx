"use client";

/* Report a public record or photo for review. The same call as before
   (/api/report-content); only the page around it moved onto the site's kit,
   so the form sits under the site header like Contact. */
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";

const REASONS = [
  "Not a street dog / off-topic",
  "Contains a person without consent",
  "Private or sensitive information",
  "Graphic or distressing imagery",
  "Spam or misleading",
  "Other",
];

export function ReportForm() {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Choose a reason first."); return; }
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/report-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details: details.trim(), link: link.trim(), email: email.trim() }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || "Couldn't submit. Please try again."); return; }
      setSent(true);
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <div className="ct-success" role="status">
        <CheckCircle2 aria-hidden />
        <h3>Report received</h3>
        <p>Thank you. The StrayPaw team reviews it and acts if it breaks the <Link href="/community-guidelines">community guidelines</Link>.{email ? <> We write to <span>{email}</span> once it is reviewed.</> : null}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ct-form" noValidate>
      <fieldset className="ct-field rc2-reasons">
        <legend>Reason</legend>
        <div className="rc2-grid">
          {REASONS.map((r) => (
            <label key={r} className={reason === r ? "is-on" : undefined}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="ct-field">
        <label htmlFor="rc-link">Link to the content <span>optional</span></label>
        <input id="rc-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the animal profile or sighting link" />
      </div>
      <div className="ct-field">
        <label htmlFor="rc-details">Details <span>optional</span></label>
        <textarea id="rc-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="What is wrong with it…" />
      </div>
      <div className="ct-field">
        <label htmlFor="rc-email">Your email <span>optional, to hear back</span></label>
        <input id="rc-email" type="email" inputMode="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      {error && <p className="ct-error" role="alert">{error}</p>}
      <div className="ct-actions">
        <button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />}{busy ? " Sending…" : " Submit report"}</button>
      </div>
    </form>
  );
}
