"use client";

import { useEffect, useState } from "react";
import { Database, X } from "lucide-react";
import { WorkbookEnrichment } from "@/components/admin/WorkbookEnrichment";

const KEY = "straypaw.admin_secret";

export function ModerationEnrichment() {
  const [secret, setSecret] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const readModeratorSession = () => {
      if (cancelled) return;
      const saved = window.localStorage.getItem(KEY)?.trim() ?? "";
      if (saved) {
        setSecret(saved);
        return;
      }
      timer = setTimeout(readModeratorSession, 400);
    };

    readModeratorSession();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!secret) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-[#0b1e3d] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:translate-y-[-1px]"
      >
        <Database className="h-4 w-4" />
        Historical enrichment
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/35 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Historical enrichment">
          <div className="ml-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[#f4f0e8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[.08] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-bark-400">Moderation</p>
                <h2 className="text-lg font-semibold text-bark-900">Historical data enrichment</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close enrichment"
                className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-bark-600 hover:bg-black/[.04]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <WorkbookEnrichment secret={secret} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
