import "server-only";
import * as XLSX from "xlsx";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { buildBrandPdf } from "./brand-pdf";
import { MIME } from "./native";
import type { ComposedDoc } from "@/sp3/ai/types";

/* A report Kaju wrote (sections of figures, paragraphs and tables) as a file in the StrayPaw report template:
   PDF through the same brand template as every other report, Word with the same order and colours, Excel with one
   sheet per table. Every file says how it was made, so a reader never takes it for a certified return. */

const generated = () => new Date().toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const PREPARED_NOTE = "Prepared with Kaju from StrayPaw records and the documents named above, read with the account that downloaded this file. Check each figure against the linked records before it is signed or submitted.";

export async function makeComposedFile(kind: "pdf" | "docx" | "xlsx", doc: ComposedDoc, organisation: string | null): Promise<{ bytes: Buffer; mime: string; filename: string }> {
  const filename = `StrayPaw-${doc.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "report"}.${kind}`;
  const notes = [...doc.notes, PREPARED_NOTE];
  if (kind === "pdf") {
    const bytes = buildBrandPdf({ title: doc.title, eyebrow: doc.eyebrow, organisation: organisation ?? undefined, period: doc.period, facts: doc.addressedTo ? [`For: ${doc.addressedTo}`] : undefined,
      sections: doc.sections.map((s) => ({ heading: s.heading, figures: s.figures.length ? s.figures : undefined, paragraphs: s.paragraphs.length ? s.paragraphs : undefined, table: s.table })), notes });
    return { bytes, mime: MIME.pdf, filename };
  }
  if (kind === "xlsx") {
    const wb = XLSX.utils.book_new();
    const summary: (string | number)[][] = [["StrayPaw"], [doc.title], ...(doc.eyebrow ? [[doc.eyebrow]] : []), [], ["Organisation", organisation ?? ""], ["For", doc.addressedTo ?? ""], ["Period", doc.period ?? ""], ["Generated", generated()], []];
    for (const s of doc.sections) {
      if (s.heading) summary.push([s.heading]);
      for (const f of s.figures) summary.push([f.label, f.value]);
      for (const p of s.paragraphs) summary.push(["", p]);
      summary.push([]);
    }
    summary.push(["Method and limits"], ...notes.map((n) => ["", n]));
    const about = XLSX.utils.aoa_to_sheet(summary); about["!cols"] = [{ wch: 30 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, about, "Summary");
    const used = new Set<string>(["Summary"]);
    doc.sections.forEach((s, i) => {
      if (!s.table) return;
      let name = (s.heading ?? s.table.caption ?? `Table ${i + 1}`).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || `Table ${i + 1}`;
      while (used.has(name)) name = `${name.slice(0, 25)} ${i + 1}`;
      used.add(name);
      const sheet = XLSX.utils.aoa_to_sheet([s.table.columns, ...s.table.rows]);
      sheet["!cols"] = s.table.columns.map((c, ci) => ({ wch: Math.min(48, Math.max(10, c.length + 2, ...s.table!.rows.slice(0, 200).map((r) => String(r[ci] ?? "").length + 2))) }));
      if (s.table.rows.length) sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: s.table.rows.length, c: s.table.columns.length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, sheet, name);
    });
    return { bytes: Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })), mime: MIME.xlsx, filename };
  }
  const line = { style: BorderStyle.SINGLE, size: 4, color: "E4E8F0" };
  const borders = { top: line, bottom: line, left: line, right: line };
  const cell = (t: string, head = false) => new TableCell({ borders, margins: { top: 60, bottom: 60, left: 90, right: 90 }, ...(head ? { shading: { type: ShadingType.CLEAR, fill: "F5F7FB", color: "auto" } } : {}), children: [new Paragraph({ children: [new TextRun({ text: t, bold: head, size: 18, color: head ? "0B1E3D" : "33415C" })] })] });
  const body: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: "StrayPaw", bold: true, color: "2457CE", size: 22 })] }),
    ...(doc.eyebrow ? [new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: doc.eyebrow.toUpperCase(), color: "6B7486", size: 16, bold: true })] })] : []),
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: [organisation, doc.addressedTo ? `For: ${doc.addressedTo}` : "", doc.period, `Generated ${generated()}`].filter(Boolean).join("  |  "), color: "6B7486", size: 18 })] }),
  ];
  for (const s of doc.sections) {
    if (s.heading) body.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } }));
    if (s.figures.length) body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: s.figures.map((f) => new TableCell({ borders, margins: { top: 120, bottom: 40, left: 120, right: 120 }, shading: { type: ShadingType.CLEAR, fill: "F5F7FB", color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: f.value, bold: true, size: 40, color: "2457CE" })] })] })) }),
      new TableRow({ children: s.figures.map((f) => new TableCell({ borders, margins: { top: 40, bottom: 120, left: 120, right: 120 }, shading: { type: ShadingType.CLEAR, fill: "F5F7FB", color: "auto" }, children: [new Paragraph({ children: [new TextRun({ text: f.label, size: 18, color: "42526B" })] })] })) }),
    ] }), new Paragraph({ text: "" }));
    for (const p of s.paragraphs) body.push(new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: p, size: 21, color: "1B2A44" })] }));
    if (s.table) {
      if (s.table.caption) body.push(new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: s.table.caption, italics: false, size: 18, color: "6B7486" })] }));
      body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: s.table.columns.map((c) => cell(c, true)) }), ...s.table.rows.map((r) => new TableRow({ children: s.table!.columns.map((_, i) => cell(String(r[i] ?? ""))) }))] }));
    }
  }
  body.push(new Paragraph({ text: "Method and limits", heading: HeadingLevel.HEADING_2, spacing: { before: 320, after: 100 } }), ...notes.map((n) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: n, size: 18, color: "42526B" })] })));
  const file = new Document({ styles: { default: { document: { run: { font: "Calibri" } } } }, sections: [{ children: body }] });
  return { bytes: Buffer.from(await Packer.toBuffer(file)), mime: MIME.docx, filename };
}
