/* ════════════════════════════════════════════════════════════════════
   The StrayPaw report template, as a PDF. One look for every report a
   person downloads: a blue band with the wordmark, the title, who it is
   for and the period, then figures, tables and the method notes, with a
   running header, a footer and page numbers on every page.

   Written directly (standard Helvetica, WinAnsi), so it needs no font
   files or extra packages and the text stays selectable and searchable.
   ════════════════════════════════════════════════════════════════════ */

export type BrandFigure = { label: string; value: string };
export type BrandTable = { columns: string[]; rows: (string | number | null | undefined)[][]; caption?: string };
export type BrandSection = { heading?: string; figures?: BrandFigure[]; paragraphs?: string[]; table?: BrandTable };
export type BrandDoc = {
  title: string;
  /** The kind of document, above the title (e.g. "Operational evidence report"). */
  eyebrow?: string;
  organisation?: string;
  period?: string;
  /** Extra facts for the cover line (filters, status, package id). */
  facts?: string[];
  sections: BrandSection[];
  /** Method and limits, printed last under their own heading. */
  notes?: string[];
  generatedAt?: Date;
};

/* Standard Helvetica advance widths (1/1000 em), ASCII 32..126. */
const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

const INK = [0.043, 0.118, 0.239], MUTE = [0.42, 0.455, 0.525], BLUE = [0.141, 0.341, 0.808];
const FILL = [0.961, 0.969, 0.984], HEADFILL = [0.933, 0.949, 0.984], LINE = [0.894, 0.910, 0.941], WHITE = [1, 1, 1];

/** Text the standard fonts can draw: rupee and Indian scripts become readable ASCII. */
/* WinAnsi (the encoding of the standard fonts) has these typographic marks at fixed codes. */
const WINANSI: Record<string, string> = { "·": "\xB7", "•": "\x95", "–": "\x96", "—": "\x97", "‘": "\x91", "’": "\x92", "“": "\x93", "”": "\x94", "…": "\x85", "×": "\xD7", "€": "\x80" };
/** Text the standard fonts can draw: the rupee sign becomes "Rs", other scripts a "?". */
export function pdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/₹\s?(?=[\d.,-])/g, "Rs ").replace(/₹/g, "Rs")
    .replace(/[·•–—‘’“”…×€]/g, (c) => WINANSI[c])
    .replace(/[^\x20-\x7E\x80-\xFF]/g, (c) => { const d = c.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); return /^[\x20-\x7E]+$/.test(d) ? d : "?"; });
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
export function textWidth(s: string, size: number, bold = false) {
  const t = bold ? W_BOLD : W_REG;
  let w = 0;
  for (const ch of s) { const c = ch.charCodeAt(0); w += c === 0xb7 || c === 0x95 ? 278 : c === 0x97 ? 1000 : c === 0x85 ? 1000 : t[c - 32] ?? 556; }
  return (w * size) / 1000;
}
function wrap(text: string, size: number, width: number, bold = false): string[] {
  const out: string[] = [];
  for (const para of pdfText(text).split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= width) { line = next; continue; }
      if (line) out.push(line);
      let w = word;
      while (textWidth(w, size, bold) > width && w.length > 1) { let cut = w.length - 1; while (cut > 1 && textWidth(w.slice(0, cut), size, bold) > width) cut--; out.push(w.slice(0, cut)); w = w.slice(cut); }
      line = w;
    }
    out.push(line);
  }
  return out.length ? out : [""];
}

type Page = string[];

export function buildBrandPdf(doc: BrandDoc): Buffer {
  const wide = doc.sections.some((s) => (s.table?.columns.length ?? 0) > 6);
  const PW = wide ? 842 : 595, PH = wide ? 595 : 842, MX = 44, TOP = PH - 46, BOTTOM = 56;
  const CW = PW - MX * 2;
  const when = (doc.generatedAt ?? new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const title = pdfText(doc.title);
  const pages: Page[] = [];
  let p: Page = [], y = 0;

  const rgb = (c: number[], stroke = false) => `${c.map((v) => v.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}`;
  const rect = (x: number, yy: number, w: number, h: number, c: number[]) => p.push(`${rgb(c)} ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  const hline = (x1: number, x2: number, yy: number, c = LINE, wd = 0.6) => p.push(`${rgb(c, true)} ${wd} w ${x1.toFixed(1)} ${yy.toFixed(1)} m ${x2.toFixed(1)} ${yy.toFixed(1)} l S`);
  const text = (s: string, x: number, yy: number, size: number, bold = false, c = INK) => p.push(`${rgb(c)} BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${esc(pdfText(s))}) Tj ET`);

  const newPage = (first = false) => {
    p = []; pages.push(p);
    if (first) {
      rect(0, PH - 70, PW, 70, BLUE);
      /* the mark: a white disc with a blue paw-dot, then the wordmark */
      p.push(`${rgb(WHITE)} ${circle(MX + 11, PH - 35, 11)} f`);
      p.push(`${rgb(BLUE)} ${circle(MX + 11, PH - 36.5, 4.2)} f`);
      for (const [dx, dy] of [[-5, 4], [0, 6.5], [5, 4]]) p.push(`${rgb(BLUE)} ${circle(MX + 11 + dx, PH - 35 + dy, 1.9)} f`);
      text("StrayPaw", MX + 30, PH - 40, 16, true, WHITE);
      const site = "straypaw.org";
      text(site, PW - MX - textWidth(site, 9.5), PH - 39, 9.5, false, WHITE);
      y = PH - 104;
      if (doc.eyebrow) { text(doc.eyebrow.toUpperCase(), MX, y, 8.5, true, BLUE); y -= 24; }
      for (const l of wrap(title, 22, CW, true)) { text(l, MX, y, 22, true); y -= 27; }
      y += 4;
      const meta = [doc.organisation, doc.period, ...(doc.facts ?? []), `Generated ${when}`].filter(Boolean) as string[];
      for (const l of wrap(meta.join("  |  "), 9.5, CW)) { text(l, MX, y, 9.5, false, MUTE); y -= 13; }
      y -= 6; hline(MX, PW - MX, y, LINE, 0.8); y -= 22;
    } else {
      const head = `StrayPaw  |  ${title}`;
      text(head.length > 110 ? `${head.slice(0, 107)}...` : head, MX, PH - 30, 8.5, false, MUTE);
      hline(MX, PW - MX, PH - 38);
      y = TOP - 8;
    }
  };
  const need = (h: number) => { if (y - h < BOTTOM) newPage(); };

  newPage(true);
  for (const s of doc.sections) {
    if (s.heading) { need(40); text(s.heading, MX, y, 13, true); y -= 20; }
    if (s.figures?.length) {
      const per = Math.min(s.figures.length, wide ? 5 : 4), gap = 8, fw = (CW - gap * (per - 1)) / per, fh = 50;
      for (let i = 0; i < s.figures.length; i += per) {
        need(fh + 10);
        s.figures.slice(i, i + per).forEach((f, j) => {
          const x = MX + j * (fw + gap);
          rect(x, y - fh, fw, fh, FILL);
          text(f.value, x + 10, y - 24, 16, true);
          text(wrap(f.label, 8, fw - 20)[0], x + 10, y - 39, 8, false, MUTE);
        });
        y -= fh + gap;
      }
      y -= 16;
    }
    for (const para of s.paragraphs ?? []) {
      for (const l of wrap(para, 10, CW)) { need(14); text(l, MX, y, 10, false, INK); y -= 14; }
      y -= 6;
    }
    if (s.table && s.table.columns.length) table(s.table);
  }
  if (doc.notes?.length) {
    need(40); y -= 4; text("Method and limits", MX, y, 11, true); y -= 16;
    for (const n of doc.notes) {
      const lines = wrap(n, 8.5, CW - 10);
      need(lines.length * 11.5);
      text("-", MX, y, 8.5, false, MUTE);
      for (const l of lines) { text(l, MX + 10, y, 8.5, false, MUTE); y -= 11.5; }
      y -= 3;
    }
  }

  function table(t: BrandTable) {
    const size = t.columns.length > 9 ? 7 : 8, lh = size * 1.32, pad = 4;
    /* Long record codes read as their short form on paper (the spreadsheet keeps them whole). */
    const short = (v: string) => { const m = /^([A-Z]{2,5}(?:-[A-Z]{2,5})?)-([0-9A-F]{12,})$/i.exec(v.trim()); return m ? `${m[1]}-${m[2].slice(0, 6).toUpperCase()}` : v; };
    const cells = t.rows.map((r) => t.columns.map((_, i) => short(pdfText(r[i] ?? ""))));
    /* Each column gets room for its longest word (up to a limit), then the rest of the
       width goes to the columns with the most text, so short columns never break mid-word. */
    const floor = t.columns.map((c, i) => {
      const words = [...pdfText(c).split(/\s+/).map((w) => textWidth(w, size, true)), ...cells.slice(0, 60).flatMap((r) => r[i].split(/\s+/).map((w) => textWidth(w, size)))];
      return Math.min(96, Math.max(28, ...words)) + 2 * pad;
    });
    const want = t.columns.map((c, i) => {
      const sample = cells.slice(0, 60).map((r) => textWidth(r[i], size)).sort((a, b) => a - b);
      const typical = sample.length ? sample[Math.floor(sample.length * 0.8)] : 0;
      return Math.max(floor[i], Math.min(240, typical + 2 * pad));
    });
    const minSum = floor.reduce((a, b) => a + b, 0), wantSum = want.reduce((a, b) => a + b, 0);
    const widths = minSum >= CW ? floor.map((w) => (w / minSum) * CW)
      : wantSum <= CW ? want.map((w) => (w / wantSum) * CW)
      : floor.map((f, i) => f + ((want[i] - f) / (wantSum - minSum)) * (CW - minSum));
    const headLines = t.columns.map((c, i) => wrap(c, size, widths[i] - 2 * pad, true));
    const headH = Math.max(...headLines.map((l) => l.length)) * lh + 2 * pad;
    const drawHead = () => {
      rect(MX, y - headH, CW, headH, HEADFILL);
      let x = MX;
      headLines.forEach((ls, i) => { ls.forEach((l, k) => text(l, x + pad, y - pad - size - k * lh + 1, size, true)); x += widths[i]; });
      y -= headH;
    };
    if (t.caption) { need(16 + headH); text(t.caption, MX, y, 9, false, MUTE); y -= 14; }
    need(headH + lh * 2 + 2 * pad);
    drawHead();
    if (!cells.length) { text("No records in this scope.", MX + pad, y - pad - size, size, false, MUTE); y -= lh + 2 * pad; hline(MX, PW - MX, y); y -= 14; return; }
    cells.forEach((r, ri) => {
      const lines = r.map((c, i) => wrap(c, size, widths[i] - 2 * pad).slice(0, 6));
      const h = Math.max(...lines.map((l) => l.length)) * lh + 2 * pad;
      if (y - h < BOTTOM) { newPage(); drawHead(); }
      if (ri % 2 === 1) rect(MX, y - h, CW, h, [0.984, 0.988, 0.996]);
      let x = MX;
      lines.forEach((ls, i) => { ls.forEach((l, k) => text(l, x + pad, y - pad - size - k * lh + 1, size)); x += widths[i]; });
      y -= h;
      hline(MX, PW - MX, y, LINE, 0.4);
    });
    y -= 16;
  }

  /* Footer on every page, now that the page count is known. */
  pages.forEach((pg, i) => {
    p = pg;
    hline(MX, PW - MX, 40, LINE, 0.6);
    const left = `StrayPaw  |  ${title}`;
    text(left.length > 70 ? `${left.slice(0, 67)}...` : left, MX, 27, 8, false, MUTE);
    const mid = "Prepared from StrayPaw records";
    text(mid, PW / 2 - textWidth(mid, 8) / 2, 27, 8, false, MUTE);
    const num = `Page ${i + 1} of ${pages.length}`;
    text(num, PW - MX - textWidth(num, 8), 27, 8, false, MUTE);
  });

  return assemble(pages, PW, PH, title);
}

function circle(cx: number, cy: number, r: number) {
  const k = 0.5523 * r, f = (n: number) => n.toFixed(2);
  return `${f(cx + r)} ${f(cy)} m ${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c ${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c`;
}

function assemble(pages: Page[], PW: number, PH: number, title: string): Buffer {
  const objects = new Map<number, string>();
  const count = 5 + pages.length * 2;
  const pageNums = pages.map((_, i) => 6 + i * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] >>`);
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  objects.set(5, `<< /Title (${esc(title)}) /Author (StrayPaw) /Producer (StrayPaw) /Creator (StrayPaw) >>`);
  pages.forEach((cmds, i) => {
    const n = 6 + i * 2, stream = cmds.join("\n");
    objects.set(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n + 1} 0 R >>`);
    objects.set(n + 1, `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n%StrayPaw\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= count; i++) { offsets[i] = Buffer.byteLength(pdf, "latin1"); pdf += `${i} 0 obj\n${objects.get(i)}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${count + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
