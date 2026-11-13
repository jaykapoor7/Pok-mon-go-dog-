/* ════════════════════════════════════════════════════════════════════
   What Kaju can show besides words.

   A reply may carry blocks: figures, a table, a chart, a timeline, a
   comparison, a list of records, places, or a sentence with blanks for
   the person to fill. Each block is plain data in one of the shapes
   below. The app draws them with its own components; nothing a model
   writes is ever run or rendered as markup. Anything that does not fit a
   shape is dropped before it leaves the server and again before it is
   drawn.
   ════════════════════════════════════════════════════════════════════ */

import type { Citation } from "./types";

export type Tone = "plain" | "good" | "warn" | "bad";
export type BlankControl = "choice" | "multi" | "range" | "text" | "date";
export type Blank = { id: string; label: string; control: BlankControl; options?: string[]; min?: number; max?: number; step?: number; unit?: string; value?: string };
export type Block =
  | { kind: "stats"; title?: string; items: { label: string; value: string; note?: string; tone?: Tone }[] }
  | { kind: "table"; title?: string; columns: string[]; rows: { cells: string[]; href?: string }[]; more?: number }
  | { kind: "chart"; title?: string; form: "bar" | "line"; unit?: string; points: { label: string; value: number }[] }
  | { kind: "timeline"; title?: string; items: { when: string; label: string; note?: string; href?: string }[] }
  | { kind: "compare"; title?: string; columns: string[]; rows: { label: string; values: string[] }[] }
  | { kind: "records"; title?: string; items: { label: string; meta?: string; href: string; tag?: string }[] }
  | { kind: "places"; title?: string; points: { label: string; lat: number; lng: number; value?: number; note?: string }[] }
  /** A sentence with blanks. `parts` alternates text and blank ids; when every blank is filled the sentence is sent back as the next request. */
  | { kind: "blanks"; lead?: string; parts: (string | { blank: string })[]; blanks: Blank[]; note?: string };

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 400): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const opt = (v: unknown, max = 400) => v === undefined || str(v, max);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const list = <T,>(v: unknown, max: number, ok: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.length > 0 && v.length <= max && v.every(ok);
/** Only places inside the app: a block can link to a record, never away. */
const href = (v: unknown) => v === undefined || (typeof v === "string" && v.length <= 512 && v.startsWith("/") && !v.startsWith("//") && !/[\\\u0000- ]/.test(v));
const TONES = ["plain", "good", "warn", "bad"];
const CONTROLS = ["choice", "multi", "range", "text", "date"];

function blank(b: unknown): b is Blank {
  if (!obj(b) || !str(b.id, 40) || !/^[a-z][a-z0-9_]*$/.test(b.id) || !str(b.label, 80) || !CONTROLS.includes(String(b.control))) return false;
  if ((b.control === "choice" || b.control === "multi") && !list(b.options, 12, (x): x is string => str(x, 80))) return false;
  if (b.control === "range" && !(num(b.min) && num(b.max) && b.max > b.min && (b.step === undefined || (num(b.step) && b.step > 0)))) return false;
  return opt(b.unit, 20) && opt(b.value, 200);
}

export function isBlock(b: unknown): b is Block {
  if (!obj(b) || !opt(b.title, 160)) return false;
  switch (b.kind) {
    case "stats": return list(b.items, 8, (i): i is { label: string; value: string } => obj(i) && str(i.label, 80) && str(i.value, 40) && opt(i.note, 120) && (i.tone === undefined || TONES.includes(String(i.tone))));
    case "table": return list(b.columns, 6, (c): c is string => str(c, 60)) && list(b.rows, 40, (r): r is { cells: string[] } => obj(r) && Array.isArray(r.cells) && r.cells.length === (b.columns as string[]).length && r.cells.every((c) => typeof c === "string" && c.length <= 240) && href(r.href)) && (b.more === undefined || num(b.more));
    case "chart": return (b.form === "bar" || b.form === "line") && opt(b.unit, 24) && list(b.points, 60, (p): p is { label: string; value: number } => obj(p) && str(p.label, 40) && num(p.value) && p.value >= 0);
    case "timeline": return list(b.items, 30, (i): i is { when: string; label: string } => obj(i) && str(i.when, 40) && str(i.label, 200) && opt(i.note, 300) && href(i.href));
    case "compare": return list(b.columns, 4, (c): c is string => str(c, 60)) && list(b.rows, 20, (r): r is { label: string; values: string[] } => obj(r) && str(r.label, 80) && Array.isArray(r.values) && r.values.length === (b.columns as string[]).length && r.values.every((c) => typeof c === "string" && c.length <= 200));
    case "records": return list(b.items, 20, (i): i is { label: string; href: string } => obj(i) && str(i.label, 160) && opt(i.meta, 200) && opt(i.tag, 40) && typeof i.href === "string" && href(i.href));
    case "places": return list(b.points, 60, (p): p is { label: string; lat: number; lng: number } => obj(p) && str(p.label, 80) && num(p.lat) && num(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && (p.value === undefined || num(p.value)) && opt(p.note, 120));
    case "blanks": {
      if (!opt(b.lead, 300) || !opt(b.note, 300) || !list(b.blanks, 5, blank)) return false;
      const ids = new Set((b.blanks as Blank[]).map((x) => x.id));
      return Array.isArray(b.parts) && b.parts.length > 0 && b.parts.length <= 12 && b.parts.every((p) => (typeof p === "string" && p.length <= 300) || (obj(p) && typeof p.blank === "string" && ids.has(p.blank)))
        && [...ids].every((id) => (b.parts as unknown[]).some((p) => obj(p) && p.blank === id));
    }
    default: return false;
  }
}

/** Keep the blocks that fit a shape; drop the rest without failing the reply. */
export function cleanBlocks(v: unknown, max = 6): Block[] {
  return Array.isArray(v) ? v.filter(isBlock).slice(0, max) : [];
}

/* ── blocks drawn from what a record tool returned (no model) ───────── */
const SKIP = /(^|_)(id|ids|uuid|href|url|lat|lng|org|key|token)$|Id$/;
const words = (k: string) => { const s = k.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const show = (v: unknown): string | null => v === null || v === undefined ? "Not recorded" : typeof v === "number" ? (Number.isFinite(v) ? v.toLocaleString("en-IN") : null) : typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "string" ? (/^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v.slice(0, 120)) : null;
const WHEN = /^(date|day|week|month|period|on|at)$|(_on|_at|_date|week|month)$/i;

/** Figures, a table or a chart read straight from a tool's own result. Nothing is computed or guessed: a value the tool did not return is not shown. */
export function autoBlocks(data: unknown, citations: Citation[] = []): Block[] {
  if (!obj(data)) return [];
  const out: Block[] = [];
  const figures = Object.entries(data).filter(([k, v]) => num(v) && !SKIP.test(k));
  if (figures.length >= 2) out.push({ kind: "stats", items: figures.slice(0, 6).map(([k, v]) => ({ label: words(k), value: (v as number).toLocaleString("en-IN") })) });
  const byLabel = new Map(citations.map((c) => [c.label.toLowerCase(), c.href]));
  for (const [k, v] of Object.entries(data)) {
    if (!Array.isArray(v) || v.length < 2 || !v.every(obj)) continue;
    const rows = v as Record<string, unknown>[];
    const keys = Object.keys(rows[0]).filter((c) => !SKIP.test(c) && rows.every((r) => r[c] === null || ["string", "number", "boolean"].includes(typeof r[c])));
    if (keys.length < 2) continue;
    const when = keys.find((c) => WHEN.test(c)), count = keys.find((c) => rows.every((r) => num(r[c])));
    if (when && count && keys.length <= 3 && rows.length >= 3) {
      out.push({ kind: "chart", title: words(k), form: rows.length > 8 ? "line" : "bar", unit: words(count).toLowerCase(), points: rows.slice(0, 60).map((r) => ({ label: String(show(r[when]) ?? ""), value: Math.max(0, r[count] as number) })).filter((p) => p.label) });
    } else {
      const cols = keys.slice(0, 4);
      out.push({ kind: "table", title: words(k), columns: cols.map(words), rows: rows.slice(0, 8).map((r) => { const cells = cols.map((c) => show(r[c]) ?? ""); const to = cells.map((c) => byLabel.get(c.toLowerCase())).find(Boolean); return to && to.startsWith("/") ? { cells, href: to } : { cells }; }), ...(rows.length > 8 ? { more: rows.length - 8 } : {}) });
    }
    if (out.length >= 3) break;
  }
  return cleanBlocks(out, 3);
}

/** The sentence a filled set of blanks sends back. */
export function fillBlanks(b: Extract<Block, { kind: "blanks" }>, values: Record<string, string>): string {
  return b.parts.map((p) => (typeof p === "string" ? p : values[p.blank] ?? "")).join("").replace(/\s+/g, " ").trim();
}
