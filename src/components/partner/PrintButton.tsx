"use client";

import { Printer } from "lucide-react";

/** Print / Save-as-PDF of the current report page (browser print dialog). */
export function PrintButton({ label = "PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-semibold text-bark-600 hover:bg-black/[0.04] dark:border-white/[0.12] dark:text-bark-200"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
