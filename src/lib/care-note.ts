/* Care notes written by field capture carry the form payload and a device
   request id for audit ("Field-reported procedure; … {json} Device request:
   <uuid>"). People read the note itself, the facility and the procedure; the
   audit trail keeps the rest. */
/* What the audit trail needs and a person does not: when and from which device a field note was captured
   ("Field capture: 2026-11-20 14:19:24.576+00. Device request 272b1a58-…."), the form template
   ("Template: arv-field-v1") and Kaju's request id ("Kaju request um6z8t2z."). "Prepared with StrayPaw AI, confirmed
   by <name>" stays: it says who confirmed what Kaju prepared. The stored text is unchanged. */
const AUDIT: RegExp[] = [
  /\s*Field capture:\s*\d{4}-\d{2}-\d{2}[ T][\d:.]+(?:Z|[+-]\d{2}(?::?\d{2})?)?\.?/gi,
  /\s*Device request:?\s*[0-9a-f-]{8,}\.?/gi,
  /\s*Kaju request\s+[\w-]{4,}\.?/gi,
  /^[ \t]*Template:[ \t]*[\w.-]+[ \t]*(?:\r?\n|$)/gim,
];
export function careNote(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = AUDIT.reduce((t, re) => t.replace(re, ""), raw).replace(/\n{3,}/g, "\n\n").trim();
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
