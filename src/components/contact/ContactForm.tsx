"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<"name" | "email" | "message", string>>>({});
  const [done, setDone] = useState(false);

  /* CTAs across the site deep-link here with the enquiry already named
     (e.g. /contact?subject=Fund a baseline study), so the sender does not
     have to restate what they clicked. Read from the URL directly rather
     than useSearchParams, which would force a Suspense boundary on an
     otherwise static page. */
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("subject");
    if (s) setSubject(s.slice(0, 120));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const invalid: typeof fields = {};
    if (!name.trim()) invalid.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) invalid.email = "Enter a valid email address.";
    if (!message.trim()) invalid.message = "Enter a message.";
    setFields(invalid);
    const first = (["name", "email", "message"] as const).find(key => invalid[key]);
    if (first) { document.getElementById(`contact-${first}`)?.focus(); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not send. Try again.");
      if (!j.delivered) throw new Error("Message delivery is temporarily unavailable. Your message is still here; please try again shortly.");
      setDone(true);
    } catch (err) {
      setError(err instanceof TypeError ? "Could not connect. Your message is still here; check your connection and try again." : err instanceof Error ? err.message : "Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="ct-success" role="status">
        <CheckCircle2 aria-hidden />
        <h3>Message sent</h3>
        <p>
          Your message was sent. Your contact email is{" "}
          <span>{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ct-form" noValidate>
      <div className="ct-form-head">
        <p className="ct-label">Your message</p>
        <p>Name, email and message are required.</p>
      </div>
      <div className="ct-pair">
        <div className="ct-field">
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" aria-invalid={!!fields.name} aria-describedby={fields.name ? "contact-name-error" : undefined} name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name…" />
          {fields.name && <p className="ct-field-error" id="contact-name-error">{fields.name}</p>}
        </div>
        <div className="ct-field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" aria-invalid={!!fields.email} aria-describedby={fields.email ? "contact-email-error" : undefined} spellCheck={false} name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {fields.email && <p className="ct-field-error" id="contact-email-error">{fields.email}</p>}
        </div>
      </div>
      <div className="ct-field">
        <label htmlFor="contact-subject">Subject <span>optional</span></label>
        <input id="contact-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Partnership, feedback, a correction…" />
      </div>
      <div className="ct-field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" aria-invalid={!!fields.message} aria-describedby={fields.message ? "contact-message-error" : undefined} name="message" required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Give us the useful context: organisation, city, page or record ID, and what you need." />
        {fields.message && <p className="ct-field-error" id="contact-message-error">{fields.message}</p>}
      </div>

      {error && <p className="ct-error" role="alert">{error}</p>}

      <div className="ct-actions">
        <button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}{busy ? " Sending…" : " Send message"}
        </button>
      </div>
    </form>
  );
}
