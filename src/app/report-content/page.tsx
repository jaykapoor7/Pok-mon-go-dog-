"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeskHeader } from "@/components/app/DeskHeader";

const REASONS = [
  "Not a street dog / off-topic",
  "Contains a person without consent",
  "Private or sensitive information",
  "Graphic or distressing imagery",
  "Spam or misleading",
  "Other",
];

export default function ReportContentPage() {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim(), link: link.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Couldn't submit. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="dk-form-page">
        <DeskHeader ground={false} kicker="Community · moderation" title="Report received" lede="Thank you. Our team will review it and act if it breaks the Community Guidelines." actions={<Link href="/map" className="dk-btn is-tint">Back to the map</Link>} />
      </div>
    );
  }

  return (
    <div className="dk-form-page">
      <DeskHeader ground={false} kicker="Community · moderation" title="Report content" lede="Flag a sighting or photo that breaks our guidelines. Reports are confidential." />
      <div className="dk-sheet rc-sheet">
        <fieldset className="rc-field">
          <legend>Reason</legend>
          <div className="rc-reasons">
            {REASONS.map((r) => (
              <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={cn("rc-reason", reason === r && "is-on")}>{r}</button>
            ))}
          </div>
        </fieldset>
        <label className="rc-field">
          <span>Link to the content <small>(optional)</small></span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the dog profile or sighting link" />
        </label>
        <label className="rc-field">
          <span>Details</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Tell us what's wrong…" />
        </label>
        <label className="rc-field">
          <span>Your email <small>(optional)</small></span>
          <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          <small className="rc-hint">Leave your email and we&apos;ll let you know once your report has been reviewed.</small>
        </label>
        {error && <p className="rc-error" role="alert">{error}</p>}
        <button type="button" onClick={submit} disabled={!reason || busy} className="dk-btn is-flame rc-submit"><Flag size={16} aria-hidden /> {busy ? "Sending…" : "Submit report"}</button>
      </div>
    </div>
  );
}
