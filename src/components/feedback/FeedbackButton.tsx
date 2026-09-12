"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Loader2, MessageSquarePlus, X } from "lucide-react";
import "./feedback.css";

/* ════════════════════════════════════════════════════════════════════
   Tell us what is wrong with this.

   A suggestion box, in the two places somebody is when they have the
   thought: the footer of a page they were reading, and the console they
   were working in. One component behind both.

   The three kinds are not a taxonomy for us, they are a prompt. "What
   could we do better" is a hard question to answer cold; "something is
   broken" is an easy one, and most of the useful reports arrive that way.

   The send button changes state rather than showing a spinner somewhere
   else on the screen: Send, Sending, Sent. The thing you pressed is the
   thing that answers, which is the only version of this that tells you
   your press landed.
   ════════════════════════════════════════════════════════════════════ */

type Kind = "problem" | "idea" | "praise";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "problem", label: "Something is broken", hint: "What were you trying to do?" },
  { value: "idea", label: "An idea", hint: "What would make this more useful?" },
  { value: "praise", label: "Something good", hint: "What worked?" },
];

export function FeedbackButton({
  variant = "link",
  label = "Suggest an improvement",
}: {
  /** `link` sits in a footer, `quiet` in the console's side rail. */
  variant?: "link" | "quiet";
  label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("problem");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  /* Native <dialog>, so the backdrop, the focus trap and Escape are the
     browser's job rather than three more pieces of our own to get wrong. */
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      /* After the open transition starts, so the caret does not scroll the
         page behind the dialog on a phone. */
      requestAnimationFrame(() => field.current?.focus());
    }
    if (!open && el.open) el.close();
  }, [open]);

  function close() {
    setOpen(false);
    /* Reset only after it has gone, so the panel does not visibly empty
       itself on the way out. */
    setTimeout(() => {
      setState("idle");
      setMessage("");
      setError(null);
    }, 220);
  }

  async function send() {
    if (!message.trim() || state !== "idle") return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, kind, page: pathname, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "That did not send. Please try again.");
      setState("sent");
      /* Long enough to read the tick. */
      setTimeout(close, 1400);
    } catch (e) {
      setState("idle");
      setError(e instanceof Error ? e.message : "That did not send. Please try again.");
    }
  }

  const active = KINDS.find((k) => k.value === kind) ?? KINDS[0];

  return (
    <>
      <button
        type="button"
        className={variant === "quiet" ? "fb-open-quiet" : "fb-open"}
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus size={variant === "quiet" ? 16 : 14} aria-hidden />
        {label}
      </button>

      <dialog
        ref={dialog}
        className="fb-dialog"
        aria-labelledby="fb-title"
        onClose={() => setOpen(false)}
        /* A click on the backdrop lands on the dialog itself, never on a
           child, which is the cheapest correct click-outside there is. */
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="fb-panel">
          <header className="fb-head">
            <div>
              <span className="fb-eyebrow">Feedback</span>
              <h2 id="fb-title">What could we do better?</h2>
            </div>
            <button type="button" className="fb-close" onClick={close} aria-label="Close">
              <X size={17} aria-hidden />
            </button>
          </header>

          <div className="fb-kinds" role="group" aria-label="What kind of feedback">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                className="fb-kind"
                aria-pressed={kind === k.value}
                onClick={() => setKind(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>

          <label className="fb-label" htmlFor="fb-message">
            {active.hint}
          </label>
          <textarea
            id="fb-message"
            ref={field}
            className="fb-text"
            rows={5}
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              kind === "problem"
                ? "The map did not load when I opened it on my phone."
                : kind === "idea"
                  ? "It would help if I could see which animals my organisation has already checked."
                  : "Reporting took under a minute."
            }
          />

          <label className="fb-label" htmlFor="fb-email">
            Email, only if you want an answer
          </label>
          <input
            id="fb-email"
            className="fb-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Optional"
          />

          {error && (
            <p className="fb-error" role="alert">
              {error}
            </p>
          )}

          <footer className="fb-foot">
            <p className="fb-note">
              Goes straight to the person who builds this. We do not record
              who you are or where you came from.
            </p>
            <button
              type="button"
              className="fb-send"
              data-state={state}
              onClick={send}
              disabled={!message.trim() || state !== "idle"}
            >
              <span className="fb-send-face">
                {state === "sending" && <Loader2 size={15} className="fb-spin" aria-hidden />}
                {state === "sent" && <Check size={15} aria-hidden />}
                {state === "idle" ? "Send" : state === "sending" ? "Sending" : "Sent"}
              </span>
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
