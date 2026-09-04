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

  const field =
    "w-full rounded border border-black/[0.1] bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

  if (done) {
    return (
      <div className="rounded border border-black/[0.06] bg-white/70 p-8 text-center dark:border-white/10 dark:bg-bark-900/50">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-vaccinated" />
        <h3 className="font-display text-xl">Message sent</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-bark-500">
          Thanks for reaching out. We read every message and will get back to you at{" "}
          <span className="font-medium text-bark-700 dark:text-bark-200">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded border border-black/[0.06] bg-white/70 p-5 dark:border-white/10 dark:bg-bark-900/50 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-[13px] font-medium text-bark-600 dark:text-bark-300">Your name</label>
          <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className={field} />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-[13px] font-medium text-bark-600 dark:text-bark-300">Email</label>
          <input id="contact-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="contact-subject" className="mb-1.5 block text-[13px] font-medium text-bark-600 dark:text-bark-300">Subject</label>
        <input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Partnership, feedback, a question…" className={field} />
      </div>
      <div className="mt-3">
        <label htmlFor="contact-message" className="mb-1.5 block text-[13px] font-medium text-bark-600 dark:text-bark-300">Message</label>
        <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="How can we help?" className={`${field} resize-none`} />
      </div>

      {error && <p className="mt-3 text-sm font-medium text-status-injured">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary px-6 py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send message
        </button>
        <a href={`mailto:${INBOX}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600">
          <Mail className="h-4 w-4" /> or email us directly
        </a>
      </div>
    </form>
  );
}
