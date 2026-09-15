#!/usr/bin/env node
/*
 * Stage the supplied Pawesome workbook as private, reviewable historical
 * records. This does NOT turn every rescue row into a new animal: the source
 * has repeat TVT doses, repeat rescue attempts and no durable animal key on
 * many rows. It creates a real import batch per operational sheet, preserves
 * every raw row, and leaves identity decisions as `review` for Pawesome.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/stage-pawesome-import.mjs ../Rescue-List.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import * as XLSX from "xlsx";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source || !fs.existsSync(source)) { console.error("Give the path to the Pawesome workbook."); process.exit(1); }
function fromEnvFile(key) { const p = path.join(root, ".env.local"); if (!fs.existsSync(p)) return null; const line = fs.readFileSync(p, "utf8").split("\n").find((value) => value.trim().startsWith(`${key}=`)); return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null; }
const connectionString = process.env.DATABASE_URL ?? fromEnvFile("DATABASE_URL");
if (!connectionString) { console.error("DATABASE_URL is required."); process.exit(1); }

const OPERATIONAL_SHEETS = new Set(["Rescue Requests", "Rescue Requests 2025", "Rescue Requests 2026", "Review and Appoint", "TVT", "Chiloo Sterilization Drive", "Adopt - Foster"]);
const mappings = {
  "Rescue Requests": { date: "Date", location: "Location", informer: "Informer", detail: "Case detail", condition: "Injury Type", source: "Call via", status: "Status", plan: "Rescue Plan", update: "Detailed Status", followup: "Review Date", outcome: "Completed" },
  "Rescue Requests 2025": { date: "Date", location: "Location", informer: "Informer", detail: "Case detail", condition: "Injury Type", source: "Call via", status: "Status", plan: "Rescue Plan", update: "Detailed Status", followup: "Review Date", outcome: "Completed" },
  "Rescue Requests 2026": { date: "Date", location: "Location", informer: "Informer", detail: "Case detail", condition: "Injury Type", source: "Call via", status: "Status", plan: "Rescue Plan", update: "Detailed Status", followup: "Review Date", outcome: "Completed" },
  "Review and Appoint": { date: "Date", location: "Location", informer: "Informer", detail: "Case detail", source: "Call via", status: "Status", update: "Details", followup: "Appointment" },
  "TVT": { date: "Date", location: "Location", detail: "Details", status: "Status", followup: "Next Dose" },
  "Chiloo Sterilization Drive": { date: "Date", name: "Name", informer: "Contact", location: "Location", sex: "Gender", colour: "Colour", admitDate: "Admit Date", releaseDate: "Release Date", followup: "New Appt Date" },
  "Adopt - Foster": { date: "Month", detail: "Adoptions", location: "Location", status: "Foster" },
};
const text = (value) => String(value ?? "").trim();
function rowsForSheet(book, sheetName) { const matrix = XLSX.utils.sheet_to_json(book.Sheets[sheetName], { header: 1, defval: "", raw: false }); const at = matrix.findIndex((row) => row.filter((cell) => text(cell)).length >= 2); if (at < 0) return []; const headers = matrix[at].map(text); return matrix.slice(at + 1).map((values, index) => ({ sourceRowNumber: at + index + 2, raw: Object.fromEntries(headers.map((header, col) => [header, values[col] ?? ""]).filter(([header]) => header)) })).filter(({ raw }) => Object.values(raw).some((value) => text(value))); }

const book = XLSX.readFile(source, { cellDates: true });
const relevant = book.SheetNames.filter((name) => OPERATIONAL_SHEETS.has(name));
console.log(`Staging ${relevant.length} operational sheets. Excluding finance, salary, rent and vehicle-cost sheets.`);
const client = new pg.Client({ connectionString, ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows: partners } = await client.query("select id from ngos where slug = 'the-pawsome-people-project' limit 1");
  if (!partners[0]) throw new Error("The Pawesome partner row is missing. Run the pilot migrations first.");
  const ngoId = partners[0].id;
  for (const sheetName of relevant) {
    const rows = rowsForSheet(book, sheetName); const mapping = mappings[sheetName] ?? {};
    const { rows: batches } = await client.query(`insert into import_batches (ngo_id, source_filename, source_kind, sheet_name, mapping, status, rows_total) values ($1, $2, 'xlsx', $3, $4::jsonb, 'reviewing', $5) returning id`, [ngoId, path.basename(source), sheetName, JSON.stringify(mapping), rows.length]);
    const batchId = batches[0].id;
    for (const row of rows) await client.query(`insert into import_rows (batch_id, source_row_number, raw_row, normalized, decision) values ($1, $2, $3::jsonb, $4::jsonb, 'review')`, [batchId, row.sourceRowNumber, JSON.stringify(row.raw), JSON.stringify({ source_sheet: sheetName, ...Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, text(row.raw[header]) || null])) })]);
    console.log(`${sheetName}: ${rows.length} rows staged in ${batchId}`);
  }
  /* A sheet title is not evidence that a drive is complete. Programme rows
     remain staged with their source sheet until Pawesome confirms dates,
     outcomes and the aggregate they want to publish. */
  console.log("Pawesome historical import staged. No animal profile or public drive was created without an identity and outcome review.");
} finally { await client.end(); }
