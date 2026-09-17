export type PdfBlock = {
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
  gapAfter?: number;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_X = 48;
const TOP = 790;
const BOTTOM = 52;

function ascii(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?");
}

function pdfEscape(value: string) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, size: number) {
  const width = PAGE_W - MARGIN_X * 2;
  const max = Math.max(28, Math.floor(width / (size * 0.52)));
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= max) line = next;
    else {
      if (line) lines.push(line);
      line = word.length > max ? word.slice(0, max) : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function contentFor(blocks: PdfBlock[]) {
  const pages: string[][] = [[]];
  let y = TOP;
  const pushPage = () => { pages.push([]); y = TOP; };
  for (const block of blocks) {
    const size = block.size ?? 10;
    const lineHeight = Math.max(12, size * 1.35);
    y -= block.gapBefore ?? 0;
    for (const line of wrap(block.text, size)) {
      if (y - lineHeight < BOTTOM) pushPage();
      const font = block.bold ? "F2" : "F1";
      pages[pages.length - 1].push(`BT /${font} ${size} Tf ${MARGIN_X} ${y.toFixed(1)} Td (${pdfEscape(line)}) Tj ET`);
      y -= lineHeight;
    }
    y -= block.gapAfter ?? 0;
  }
  return pages;
}

export function buildPdf(blocks: PdfBlock[]): Buffer {
  const pageStreams = contentFor(blocks);
  const objectCount = 4 + pageStreams.length * 2;
  const objects = new Map<number, string>();
  const pageNums = pageStreams.map((_, i) => 5 + i * 2);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Count ${pageNums.length} /Kids [${pageNums.map((n) => `${n} 0 R`).join(" ")}] >>`);
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  pageStreams.forEach((commands, i) => {
    const pageNum = 5 + i * 2;
    const contentNum = pageNum + 1;
    const stream = commands.join("\n");
    objects.set(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`);
    objects.set(contentNum, `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n%StrayPaw\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= objectCount; i++) {
    offsets[i] = Buffer.byteLength(pdf, "ascii");
    pdf += `${i} 0 obj\n${objects.get(i) ?? "<<>>"}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objectCount; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
