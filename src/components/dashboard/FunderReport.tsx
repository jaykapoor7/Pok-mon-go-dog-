"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Printer, FileText, PawPrint } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { useAuth } from "@/components/auth/AuthProvider";
import { coverage, medianResponseDays, HERD_THRESHOLD } from "@/lib/dashboard-metrics";
import { formatDate } from "@/lib/utils";
import type { Case, Dog } from "@/lib/types";

/**
 * Co-branded funder report — a designed one-page impact summary the NGO can put
 * their own logo + name on and "Save as PDF" (browser print) to hand to CSR
 * funders. Separate from the analyst CSV.
 */
export function FunderReport({ dogs, cases }: { dogs: Dog[]; cases: Case[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [ngoName, setNgoName] = useState("");
  const [logo, setLogo] = useState("");

  // Print the report in a fresh, isolated window — no app chrome, so the PDF is
  // a single clean page (printing the live page kept blank layout → many pages).
  function printReport() {
    const node = document.getElementById("funder-report");
    if (!node || typeof window === "undefined") return;
    const win = window.open("", "_blank", "width=820,height=1160");
    if (!win) {
      window.print(); // popup blocked — fall back
      return;
    }
    const headStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((el) => el.outerHTML)
      .join("\n");
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8">${headStyles}` +
        `<style>` +
        `@page{size:A4 portrait;margin:12mm;}` +
        `html,body{background:#fff!important;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
        `#funder-report{box-shadow:none!important;border-radius:0!important;width:100%!important;}` +
        `.fr-avoid{break-inside:avoid;page-break-inside:avoid;}` +
        `</style></head><body>${node.outerHTML}</body></html>`
    );
    win.document.close();
    let printed = false;
    const run = () => {
      if (printed || win.closed) return;
      printed = true;
      win.focus();
      win.print();
      setTimeout(() => !win.closed && win.close(), 300);
    };
    // Wait for the copied stylesheets + images to settle (with a fallback).
    win.onload = () => setTimeout(run, 350);
    setTimeout(run, 1200);
  }

  // Community coverage is area-wide (a single dog isn't owned by one NGO), so it
  // stays the same for everyone and is labelled as such.
  const c = coverage(dogs);

  // "Your cases" is scoped to the signed-in operator's own claimed cases — this
  // is what makes each NGO's report individual.
  const myCases = user ? cases.filter((x) => x.assignee_id === user.id) : [];
  // Only StrayPaw-verified outcomes count toward the impact figures.
  const myResolved = myCases.filter(
    (x) => (x.status === "resolved" || x.status === "closed") && x.proof_verified
  );
  const myMedian = medianResponseDays(myResolved);
  const proof = myResolved.filter((x) => x.after_url).slice(0, 3);

  // Period range from this NGO's cases (falls back to "now" when there are none).
  const times = myCases.map((x) => +new Date(x.created_at)).filter(Boolean);
  const from = times.length ? new Date(Math.min(...times)) : new Date();
  const to = new Date();

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2.5 text-sm">
        <FileText className="h-4 w-4" /> Funder report (PDF)
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="fr-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              id="fr-wrap"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="my-6 h-fit w-full max-w-2xl"
            >
              {/* controls (hidden when printing) */}
              <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
                <input
                  value={ngoName}
                  onChange={(e) => setNgoName(e.target.value)}
                  placeholder="Your NGO name"
                  className="min-w-[10rem] flex-1 rounded-xl border border-white/30 bg-white/95 px-3 py-2 text-sm outline-none"
                />
                <input
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="Logo image URL (optional)"
                  className="min-w-[10rem] flex-1 rounded-xl border border-white/30 bg-white/95 px-3 py-2 text-sm outline-none"
                />
                <button onClick={printReport} className="btn-primary px-4 py-2 text-sm">
                  <Printer className="h-4 w-4" /> Save as PDF
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white/90 p-2 text-bark-600"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* the printable page */}
              <div
                id="funder-report"
                className="rounded-2xl bg-white p-6 text-bark-900 shadow-pop print:rounded-none print:shadow-none"
              >
                {/* co-branded header */}
                <div className="fr-avoid flex items-center justify-between border-b border-black/10 pb-4">
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-paw-500 text-white">
                        <PawPrint className="h-6 w-6" />
                      </span>
                    )}
                    <div>
                      <p className="font-display text-xl font-extrabold leading-tight">
                        {ngoName || "Your NGO"}
                      </p>
                      <p className="text-xs text-bark-500">Street-dog welfare impact report</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-bark-500">
                    <p className="font-semibold text-paw-600">StrayPaw</p>
                    <p>
                      {formatDate(from.toISOString())} – {formatDate(to.toISOString())}
                    </p>
                  </div>
                </div>

                {/* ── Your cases — scoped to this NGO's own work ── */}
                <h3 className="fr-avoid mt-5 flex items-center gap-2 font-display text-sm font-bold">
                  <span className="inline-block h-2 w-2 rounded-full bg-paw-500" />
                  {ngoName ? `${ngoName}'s cases` : "Your cases"}
                </h3>
                <div className="fr-avoid mt-2 grid grid-cols-3 gap-3">
                  <Stat big value={`${myCases.length}`} label="Cases handled" />
                  <Stat big value={`${myResolved.length}`} label="Resolved" />
                  <Stat big value={myMedian != null ? `${myMedian}d` : "—"} label="Median response" />
                </div>

                {myCases.length === 0 && (
                  <p className="mt-3 rounded-xl bg-bark-50 px-4 py-2 text-xs text-bark-500">
                    {user
                      ? "No cases assigned to your account yet. Claim cases on the board and resolve them — your outcomes (and before/after proof) will appear here automatically."
                      : "Sign in and claim cases on the board to build your own impact section."}
                  </p>
                )}

                {/* before/after proof — this NGO's own resolved outcomes */}
                {proof.length > 0 && (
                  <div className="fr-avoid mt-4">
                    <h4 className="mb-2 text-xs font-bold text-bark-600">
                      Outcomes — before &amp; after
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {proof.map((p) => (
                        <div key={p.id} className="fr-avoid overflow-hidden rounded-xl border border-black/10">
                          <div className="grid grid-cols-2">
                            <DogPhoto src={p.before_url!} alt="before" seed={`${p.id}fb`} className="aspect-square w-full" />
                            <DogPhoto src={p.after_url!} alt="after" seed={`${p.id}fa`} className="aspect-square w-full" />
                          </div>
                          <p className="px-2 py-1.5 text-[10px] text-bark-500">
                            {p.outcome_note ?? p.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Community coverage — area-wide context ── */}
                <h3 className="fr-avoid mt-6 flex items-center gap-2 font-display text-sm font-bold">
                  <span className="inline-block h-2 w-2 rounded-full bg-bark-300" />
                  Community coverage <span className="text-xs font-medium text-bark-400">· area-wide</span>
                </h3>
                <div className="fr-avoid mt-2 grid grid-cols-4 gap-3">
                  <Stat big value={`${c.sterilisedPct}%`} label="Sterilised" />
                  <Stat big value={`${c.vaccinatedPct}%`} label="Vaccinated" />
                  <Stat big value={`${c.tracked}`} label="Dogs tracked" />
                  <Stat big value={`${c.needsHelp}`} label="Need help now" />
                </div>
                <p className="mt-3 rounded-xl bg-paw-50 px-4 py-2 text-xs text-bark-600">
                  Area-wide figures across the whole StrayPaw community map, measured
                  against the WHO ~{HERD_THRESHOLD}% herd-immunity threshold for rabies
                  control — shown as the context {ngoName || "your NGO"} operates in,
                  not attributed to one organisation.
                </p>

                <p className="mt-6 border-t border-black/10 pt-3 text-center text-[10px] text-bark-400">
                  Generated by StrayPaw · community-verified street-dog data · straypaw.kapoorjay.com
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="rounded-xl bg-bark-50 p-3 text-center">
      <p className={big ? "font-display text-2xl font-extrabold" : "font-display text-lg font-bold"}>
        {value}
      </p>
      <p className="text-[10px] text-bark-500">{label}</p>
    </div>
  );
}
