"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, CheckCircle2, Mail } from "lucide-react";

const INBOX = "jaykapoor7@outlook.com";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const mailtoHref = () => {
    const body = `${message}\n\n- ${name} (${email})`;
    return `mailto:${INBOX}?subject=${encodeURIComponent(subject || "Hello StrayPaw")}&body=${encodeURIComponent(body)}`;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !message.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Please add your name, a valid email, and a message.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not send. Try again.");
      if (j.delivered) {
        setDone(true);
      } else {
        // Email backend not configured, hand off to the user's mail app so the
        // message is never lost.
        window.location.href = mailtoHref();
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Try again.");
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
          Thanks for reaching out. We read every message and will get back to you at{" "}
          <span>{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ct-form" noValidate>
      <div className="ct-form-head">
        <p className="ct-label">Your message</p>
        <p>All fields except subject are required.</p>
      </div>
      <div className="ct-pair">
        <div className="ct-field">
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
        </div>
        <div className="ct-field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
      </div>
      <div className="ct-field">
        <label htmlFor="contact-subject">Subject <span>optional</span></label>
        <input id="contact-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Partnership, feedback, a correction…" />
      </div>
      <div className="ct-field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" required value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Give us the useful context: organisation, city, page or record ID, and what you need." />
      </div>

      {error && <p className="ct-error" role="alert">{error}</p>}

      <div className="ct-actions">
        <button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Send message
        </button>
        <a href={`mailto:${INBOX}`}>
          <Mail /> Email directly
        </a>
      </div>
    </form>
  );
}
