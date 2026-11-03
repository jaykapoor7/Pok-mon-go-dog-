/* ════════════════════════════════════════════════════════════════════
   WhatsApp → Kaju intake. When the WhatsApp Business connection is
   approved, each inbound message reaches the workspace as a CareOS job
   (./webhook toJobs) and then an inbox item. This turns either into the
   plain report text the intake planner already understands, so automatic
   intake and pasted intake share one path: same extraction, same
   identity and duplicate checks, same confirm. Phone numbers never pass
   through: the reporter is an opaque handle and the text is masked.
   ════════════════════════════════════════════════════════════════════ */

import { clean } from "@/sp3/ai/intake";
import type { CareJob } from "./webhook";
import type { CareInboxItem } from "./contract";

export type IntakeSource = { key: string; text: string; receivedAt: string | null; hasPhoto: boolean; location: { lat: number; lng: number; label: string | null } | null };

function compose(text: string, photo: boolean, loc: IntakeSource["location"]) {
  return [text.trim(), photo && !/\b(photo|pic|image)\b/i.test(text) ? "[photo received]" : "", loc ? `Location shared${loc.label ? `: ${loc.label}` : ""}` : ""].filter(Boolean).join("\n");
}

/** A queued webhook job (before the CareOS worker runs). Status jobs are not reports. */
export function fromJob(job: CareJob): IntakeSource | null {
  if (job.kind !== "message") return null;
  const p = job.payload as { text?: string; timestamp?: string; media?: unknown[]; location?: { lat: number | null; lng: number | null; label: string | null } | null };
  const loc = p.location && typeof p.location.lat === "number" && typeof p.location.lng === "number" ? { lat: p.location.lat, lng: p.location.lng, label: p.location.label } : null;
  const text = clean([compose(String(p.text ?? ""), Array.isArray(p.media) && p.media.length > 0, loc)])[0];
  if (!text) return null;
  return { key: job.key, text, receivedAt: p.timestamp ? new Date(Number(p.timestamp) * 1000).toISOString() : null, hasPhoto: Array.isArray(p.media) && p.media.length > 0, location: loc };
}

/** An inbox item from the CareOS backend; the English translation is preferred when present. */
export function fromInboxItem(item: CareInboxItem): IntakeSource | null {
  const photo = item.media.some((m) => m.kind === "image" || m.kind === "video");
  const text = clean([compose(item.text_en ?? item.text ?? "", photo, item.location)])[0];
  return text ? { key: `wa:item:${item.id}`, text, receivedAt: item.received_at, hasPhoto: photo, location: item.location } : null;
}

/** Messages from one reporter within a few minutes are one report (a photo, then the words). */
export function groupByThread<T extends { thread: string; at: number; source: IntakeSource }>(xs: T[], gapMs = 10 * 60_000): IntakeSource[] {
  const out: (IntakeSource & { thread: string; last: number })[] = [];
  for (const x of [...xs].sort((a, b) => a.at - b.at)) {
    const prev = [...out].reverse().find((o) => o.thread === x.thread);
    if (prev && x.at - prev.last <= gapMs) {
      prev.text = `${prev.text}\n${x.source.text}`; prev.last = x.at;
      prev.hasPhoto ||= x.source.hasPhoto; prev.location ??= x.source.location;
    } else out.push({ ...x.source, thread: x.thread, last: x.at });
  }
  return out.map(({ thread: _t, last: _l, ...s }) => s);
}
