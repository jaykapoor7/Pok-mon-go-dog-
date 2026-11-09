/* Care notes written by field capture carry the form payload and a device
   request id for audit ("Field-reported procedure; … {json} Device request:
   <uuid>"). People read the note itself, the facility and the procedure; the
   audit trail keeps the rest. */
export function careNote(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = raw.replace(/\s*Device request:\s*[0-9a-f-]{8,}\s*/gi, " ").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const j = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const parts = [j.notes, j.procedure, j.facility].filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().replace(/\.$/, ""));
      const lead = text.slice(0, start).replace(/Field-reported procedure;\s*separate veterinary authorisation required\.?/i, "").trim();
      text = [lead, ...parts].filter(Boolean).join(" · ");
    } catch { /* not JSON: show as written */ }
  }
  return text.replace(/Field-reported procedure;\s*separate veterinary authorisation required\.?\s*/i, "").trim();
}
