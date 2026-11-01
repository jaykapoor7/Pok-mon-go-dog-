/* Builds the real PowerPoint and Excel files Kaju produces in the product
   walkthrough, from the same illustrative October records as
   src/lib/demo/abc-demo.ts, plus PNG previews rendered by LibreOffice.
   Output: public/walkthrough/  ·  Run: node scripts/make-walkthrough-files.cjs */
const PptxGenJS = require("pptxgenjs");
const XLSX = require("xlsx");
const { execFileSync } = require("node:child_process");
const { mkdirSync, readdirSync, renameSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const OUT = join(__dirname, "..", "public", "walkthrough");
mkdirSync(OUT, { recursive: true });
const STREETS = ["4th Main Road", "Gandhi Nagar", "Kasturba Nagar", "LB Road", "Indira Nagar", "Besant Avenue", "Canal Bank Road", "Kotturpuram Market", "Shastri Nagar", "Elliot's Beach Road", "Tiger Varadachari Road", "Sardar Patel Road"];
const ZONES = ["Adyar", "Besant Nagar", "Thiruvanmiyur", "Kotturpuram", "Indira Nagar"];
const HELD = new Set([37, 88, 121, 140]);
const RATE = 1650;
const rows = [];
for (let i = 0; i < 146; i++) {
  if (HELD.has(i)) continue;
  const day = 1 + Math.floor((i * 30) / 146);
  rows.push({ code: `ADY-ABC-${1001 + i}`, date: `2026-10-${String(day).padStart(2, "0")}`, day, area: ZONES[i % 5], street: STREETS[i % 12], sex: i % 3 === 0 ? "Male" : "Female" });
}
const inr = (n) => `₹${n.toLocaleString("en-IN")}`;
const NAVY = "0B1E3D", BLUE = "2457CE", MUTE = "5F6B7E", LINE = "E2E7EF", CREAM = "F7F3EC", TURMERIC = "D99B1C";

/* ── board deck ───────────────────────────────────────────── */
const p = new PptxGenJS();
p.layout = "LAYOUT_WIDE";
const foot = (s, n) => { s.addText(`Coastal Paws Trust · ABC programme · October 2026`, { x: 0.5, y: 7.0, w: 9, h: 0.3, fontSize: 10, color: MUTE }); s.addText(String(n), { x: 12.3, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: MUTE, align: "right" }); };
const head = (s, k, t) => { s.addText(k, { x: 0.5, y: 0.45, w: 12, h: 0.35, fontSize: 13, color: BLUE, bold: true }); s.addText(t, { x: 0.5, y: 0.8, w: 12.3, h: 0.8, fontSize: 30, color: NAVY, bold: true }); };

let s = p.addSlide(); s.background = { color: CREAM };
s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: 7.5, fill: { color: TURMERIC } });
s.addText("ABC programme, October 2026", { x: 0.8, y: 2.2, w: 11, h: 1.0, fontSize: 44, bold: true, color: NAVY });
s.addText("Board update · Coastal Paws Trust · Zone 13, Chennai", { x: 0.8, y: 3.25, w: 11, h: 0.5, fontSize: 20, color: "33415C" });
s.addText("Prepared with StrayPaw AI, confirmed by Anjali Rao, programme coordinator", { x: 0.8, y: 5.9, w: 11, h: 0.4, fontSize: 13, color: MUTE });

s = p.addSlide(); head(s, "The month at a glance", "142 procedures verified and billed");
[["146", "Sterilisations done"], ["142", "Verified and billed"], [inr(142 * RATE), "Claimed from Zone 13"], ["0", "Animals billed twice"]].forEach(([v, l], i) => {
  const x = 0.5 + i * 3.1;
  s.addShape(p.ShapeType.roundRect, { x, y: 2.0, w: 2.9, h: 2.0, fill: { color: i === 2 ? "EEF3FD" : "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.08 });
  s.addText(v, { x: x + 0.25, y: 2.25, w: 2.5, h: 0.9, fontSize: i === 2 ? 30 : 40, bold: true, color: NAVY });
  s.addText(l, { x: x + 0.25, y: 3.2, w: 2.5, h: 0.5, fontSize: 14, color: MUTE });
});
s.addText([
  { text: "Every billed procedure has five evidence items and a vet sign-off by Dr. R. Menon.", options: { bullet: true } },
  { text: "4 records are held for November: 2 release photos, 1 vet sign-off, 1 duplicate removed.", options: { bullet: true } },
  { text: "Package submitted to the Zone 13 Veterinary Public Health Office on 1 November.", options: { bullet: true } },
], { x: 0.5, y: 4.5, w: 12.3, h: 1.8, fontSize: 16, color: "33415C", paraSpaceAfter: 8 });
foot(s, 2);

s = p.addSlide(); head(s, "Pace", "Procedures by week");
const weeks = [0, 0, 0, 0, 0]; rows.forEach((r) => { weeks[Math.min(4, Math.floor((r.day - 1) / 7))]++; });
s.addChart(p.ChartType.bar, [{ name: "Procedures", labels: ["1–7 Oct", "8–14 Oct", "15–21 Oct", "22–28 Oct", "29–31 Oct"], values: weeks }], { x: 0.5, y: 1.8, w: 8.2, h: 4.9, barDir: "col", chartColors: [BLUE], showValue: true, dataLabelColor: NAVY, dataLabelFontSize: 12, catAxisLabelColor: MUTE, valAxisHidden: true, valGridLine: { style: "none" }, catAxisLabelFontSize: 12 });
s.addText([{ text: "Average", options: { color: MUTE, fontSize: 13, breakLine: true } }, { text: `${Math.round(rows.length / (31 / 7))} a week`, options: { color: NAVY, fontSize: 28, bold: true, breakLine: true } }, { text: " ", options: { breakLine: true } }, { text: "Target", options: { color: MUTE, fontSize: 13, breakLine: true } }, { text: "30 a week", options: { color: NAVY, fontSize: 28, bold: true } }], { x: 9.2, y: 2.3, w: 3.6, h: 3.0, valign: "top" });
foot(s, 3);

s = p.addSlide(); head(s, "Where", "By area");
const by = {}; rows.forEach((r) => { by[r.area] = by[r.area] || { n: 0, f: 0 }; by[r.area].n++; if (r.sex === "Female") by[r.area].f++; });
s.addTable([["Area", "Procedures", "Female", "Male", "Amount"].map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } })),
  ...ZONES.map((z) => [z, by[z].n, by[z].f, by[z].n - by[z].f, inr(by[z].n * RATE)].map((v) => ({ text: String(v) }))),
  ["Total", rows.length, rows.filter((r) => r.sex === "Female").length, rows.filter((r) => r.sex === "Male").length, inr(rows.length * RATE)].map((v) => ({ text: String(v), options: { bold: true, fill: { color: "EEF3FD" } } }))],
  { x: 0.5, y: 1.9, w: 12.3, fontSize: 15, color: NAVY, border: { type: "solid", color: LINE, pt: 1 }, rowH: 0.55 });
foot(s, 4);

s = p.addSlide(); head(s, "Next", "Held for November, and what the team does now");
s.addText([
  { text: "ADY-ABC-1038, ADY-ABC-1089: release photos requested from Ravi Kumar by SMS.", options: { bullet: true } },
  { text: "ADY-ABC-1122: Dr. Menon to sign off the surgery record by 2 November.", options: { bullet: true } },
  { text: "ADY-ABC-1141: duplicate of ADY-ABC-1093, merged; never billed.", options: { bullet: true } },
  { text: "New intake from WhatsApp on 1 November (Gandhi Nagar 2nd Street) starts November's package.", options: { bullet: true } },
], { x: 0.5, y: 1.9, w: 12.3, h: 3.6, fontSize: 18, color: "33415C", paraSpaceAfter: 12 });
foot(s, 5);

/* ── ledger ────────────────────────────────────────────────── */
const wb = XLSX.utils.book_new();
const aoa = [["Record", "Procedure date", "Area", "Location", "Sex", "Vet sign-off", "Evidence items", "Rate (₹)", "Amount (₹)"],
  ...rows.map((r) => [r.code, r.date, r.area, r.street, r.sex, "Dr. R. Menon", 5, RATE, RATE]),
  ["Total", "", "", "", "", "", rows.length * 5, "", rows.length * RATE]];
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws["!cols"] = [14, 15, 15, 22, 9, 15, 15, 10, 12].map((w) => ({ wch: w }));
ws["!autofilter"] = { ref: `A1:I${rows.length + 1}` };
XLSX.utils.book_append_sheet(wb, ws, "Ledger");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["ABC programme, October 2026 · Coastal Paws Trust"], ["Verified procedures billed to the Zone 13 Veterinary Public Health Office"], [`${rows.length} records × ₹${RATE} = ₹${(rows.length * RATE).toLocaleString("en-IN")}`], ["Prepared with StrayPaw AI, confirmed by Anjali Rao"]]), "About");

/* The vet's own surgery register, as it arrives on the coordinator's laptop. */
const reg = XLSX.utils.book_new();
const regRows = [["Date", "Tag", "Sex", "Procedure", "Surgeon", "Remarks"]];
for (let i = 0; i < 146; i++) { const day = 1 + Math.floor((i * 30) / 146); regRows.push([`${String(day).padStart(2, "0")}/10/2026`, `T-${3301 + i}`, i % 3 === 0 ? "M" : "F", i % 3 === 0 ? "Castration" : "Spay", "Dr. R. Menon", i === 121 ? "Sign-off pending" : "Recovered, released"]); }
XLSX.utils.book_append_sheet(reg, XLSX.utils.aoa_to_sheet(regRows), "October");
mkdirSync(join(__dirname, "..", "demo-footage", "files"), { recursive: true });
XLSX.writeFile(reg, join(__dirname, "..", "demo-footage", "files", "Dr-Menon-surgery-register-October.xlsx"));

(async () => {
  const deck = join(OUT, "October-2026-ABC-board-deck.pptx");
  const ledger = join(OUT, "October-2026-ABC-ledger.xlsx");
  await p.writeFile({ fileName: deck });
  XLSX.writeFile(wb, ledger);
  /* Previews: PDF via LibreOffice, then one PNG per page. */
  const tmp = join(OUT, ".tmp"); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp);
  execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", tmp, deck, ledger], { stdio: "ignore" });
  execFileSync("pdftoppm", ["-png", "-r", "110", join(tmp, "October-2026-ABC-board-deck.pdf"), join(OUT, "deck")]);
  execFileSync("pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "1", join(tmp, "October-2026-ABC-ledger.pdf"), join(OUT, "ledger")]);
  rmSync(tmp, { recursive: true, force: true });
  for (const f of readdirSync(OUT)) { const m = f.match(/^(deck|ledger)-0*(\d+)\.png$/); if (m) renameSync(join(OUT, f), join(OUT, `${m[1]}-${m[2]}.png`)); }
  console.log(readdirSync(OUT).join("\n"));
})();
