// Client-side CSV export, build a CSV from rows and trigger a download.
function escape(v: unknown): string {
  const raw = v == null ? "" : String(v);
  const s = typeof v === "string" && /^[\s]*[=+@-]|^[\t\r]/.test(raw) ? "\'" + raw : raw;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Two lines say what the file is and when it was made, then a blank line, then the header row. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], meta?: { title: string; organisation?: string | null }) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const when = new Date().toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const title = meta?.title ?? filename.replace(/\.csv$/i, "").replace(/^straypaw-/i, "").replace(/[-_]+/g, " ");
  const head = [escape(`StrayPaw | ${title}${meta?.organisation ? ` | ${meta.organisation}` : ""}`), escape(`Generated ${when} from StrayPaw records`), ""];
  const lines = [...head, headers.join(",")].concat(
    rows.map((r) => headers.map((h) => escape(r[h])).join(","))
  );
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = /^straypaw/i.test(filename) ? filename : `StrayPaw-${filename}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
