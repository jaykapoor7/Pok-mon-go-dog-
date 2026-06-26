"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, HeartHandshake, CheckCircle2 } from "lucide-react";
import { submitHelper } from "@/lib/actions";
import { haptic } from "@/lib/haptics";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/utils";

export interface HelperTarget {
  dogId?: string | null;
  zone?: string | null;
  label?: string | null; // e.g. "Dog near Bandra"
}

/**
 * "Can you help?" sheet — collects a volunteer's (or NGO's) contact details, for
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
  const [isNgo, setIsNgo] = useState(false);
  const [ngoName, setNgoName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError("Please add your name and a phone or email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitHelper({
        name,
        contact,
        message,
        isNgo,
        ngoName: isNgo ? ngoName : undefined,
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
      setIsNgo(false);
      setNgoName("");
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
            className="card w-full max-w-md rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paw-100 text-paw-600">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <button onClick={close} className="rounded-full p-1 text-bark-400 hover:bg-bark-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="py-2 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-status-sterilised" />
                <h2 className="font-display text-xl font-extrabold">Thank you 💚</h2>
                <p className="mt-1.5 text-sm text-bark-500">
                  We&apos;ve got your details and will reach out about how you can help.
                </p>
                <button onClick={close} className="btn-ghost mt-5 w-full py-3">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-extrabold">
                  {target?.label ? `Help ${target.label}` : "Can you help?"}
                </h2>
                <p className="mt-1 text-sm text-bark-500">
                  Leave your details — feed, foster, transport, vet help, or just
                  keep an eye out. We&apos;ll connect you.
                </p>

                <form onSubmit={submit} className="mt-4 space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
                  />
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone or email"
                    className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="How can you help? (optional)"
                    className="w-full resize-none rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
                  />

                  <button
                    type="button"
                    onClick={() => setIsNgo((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl border border-bark-200 px-4 py-3 text-left text-sm dark:border-white/10"
                  >
                    <span className="font-medium">I represent an NGO / rescue</span>
                    <span
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        isNgo ? "bg-paw-500" : "bg-bark-200 dark:bg-bark-700"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          isNgo ? "translate-x-[1.375rem]" : "translate-x-0.5"
                        )}
                      />
                    </span>
                  </button>

                  {isNgo && (
                    <input
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      placeholder="NGO / rescue name"
                      className="w-full rounded-2xl border border-bark-200 bg-white px-4 py-3 text-sm outline-none focus:border-paw-400 focus:ring-2 focus:ring-paw-100 dark:border-white/10"
                    />
                  )}

                  {error && <p className="text-sm font-medium text-status-injured">{error}</p>}

                  <button type="submit" disabled={busy} className="btn-primary w-full py-3">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                    {isNgo ? "Register our NGO" : "I want to help"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
