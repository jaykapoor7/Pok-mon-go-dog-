"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Shows an email address as selectable text with a copy button, never opens
 *  a mail client (no mailto), per request. */
export function EmailDisplay({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable, the text is still selectable */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/[0.1] bg-white px-4 py-3 dark:border-white/[0.12] dark:bg-bark-900">
      <span className="select-all font-medium text-bark-900 dark:text-bark-50">{email}</span>
      <button
        onClick={copy}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-bark-500 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        aria-label="Copy email address"
      >
        {copied ? <Check className="h-4 w-4 text-status-vaccinated" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
