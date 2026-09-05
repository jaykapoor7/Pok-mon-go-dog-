"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/** Exports the case CSV, sending the member's access token so the (now gated)
 *  /api/cases/export endpoint authorises the download. */
export function ExportCsvButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const supa = getSupabase();
      const token = supa ? (await supa.auth.getSession()).data.session?.access_token : null;
      const res = await fetch("/api/cases/export", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Verified partners only." : "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `straypaw-cases-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={download} disabled={busy} className="btn-ghost px-4 py-2.5 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export CSV
      </button>
      {error && <span className="text-[11.5px] text-status-injured">{error}</span>}
    </div>
  );
}
