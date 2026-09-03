"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, HeartHandshake, CheckCircle2 } from "lucide-react";
import { submitHelper } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";

const FIELD = "w-full rounded border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10 dark:bg-bark-900";

export interface HelperTarget {
  dogId?: string | null;
  zone?: string | null;
  label?: string | null; // e.g. "Dog near Bandra"
}

/**
 * "Can you help?" sheet, collects a volunteer's (or NGO's) contact details, for
 * a specific dog or in general. Writes to the helpers table via submit_helper.
 */
export function HelperForm({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target?: HelperTarget | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (s: string) => setSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError("Please add your name and a phone or email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const skillLine = skills.length ? `Can help with: ${skills.join(", ")}.` : "";
      await submitHelper({
        name,
        contact,
        message: [skillLine, message.trim()].filter(Boolean).join("\n"),
        isNgo: false,
        dogId: target?.dogId ?? null,
        zone: target?.zone ?? null,
      });
      celebrate();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit. Try again.");
      haptic("error");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    onClose();
    // reset shortly after the sheet animates out
    setTimeout(() => {
      setDone(false);
      setName("");
      setContact("");
      setMessage("");
      setSkills([]);
      setError(null);
    }, 300);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md rounded-b-none rounded-t-3xl p-6 sm:rounded"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded bg-paw-100 text-paw-600">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <button onClick={close} className="rounded-full p-1 text-bark-400 hover:bg-bark-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="py-2 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-sterilised" />
                <h2 className="font-display text-xl">Thank you 💚</h2>
                <p className="mt-1.5 text-sm text-bark-500">
                  We&apos;ve got your details and will reach out about how you can help.
                </p>
                <button onClick={close} className="btn-ghost mt-5 w-full py-3">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl">
                  {target?.label ? `Help ${target.label}` : "Register to volunteer"}
                </h2>
                <p className="mt-1 text-sm text-bark-500">
                  Leave your details and how you can help. Partner NGOs can see
                  volunteers in their area and will reach out when there&apos;s a need.
                </p>

                <form onSubmit={submit} className="mt-4 space-y-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={FIELD} />
                  <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className={FIELD} />

                  <div>
                    <p className="mb-1.5 text-xs font-medium text-bark-500">How can you help?</p>
                    <div className="flex flex-wrap gap-2">
                      {["Feeding", "Transport", "Fostering", "Vet visits", "Rescue", "Fundraising", "Awareness"].map((s) => (
                        <button key={s} type="button" onClick={() => toggleSkill(s)} className={cn("chip border transition-all", skills.includes(s) ? "border-paw-300 bg-paw-500 text-white" : "border-bark-200 bg-white text-bark-600 hover:border-paw-300 dark:bg-bark-900")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Anything else, availability, area you cover (optional)" className={`${FIELD} resize-none`} />

                  {error && <p className="text-sm font-medium text-status-injured">{error}</p>}

                  <button type="submit" disabled={busy} className="btn-primary w-full py-3">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                    Register to volunteer
                  </button>
                  <p className="text-center text-[11px] text-bark-400">Run an organisation? <a href="/partnerships" className="font-semibold text-paw-600">Partner with StrayPaw</a> instead.</p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
