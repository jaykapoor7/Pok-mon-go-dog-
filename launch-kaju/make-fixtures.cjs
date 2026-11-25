/* Synthetic municipal documents for Kaju's document tests and the launch films.
   Every animal, person, office and number here is invented and matches only the anonymised staging organisation
   "Bengaluru Animal Care Trust". Discrepancies against the staging register are deliberate and listed in EXPECTED. */
const path = require('path'), fs = require('fs');
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));
const { chromium } = require('playwright');
const out = path.join(__dirname, 'fixtures');

// tag, name, ward, sex, procedure date (dd-mm-yyyy), ARV date, remarks
const ROWS = [
  ['KOR-101', 'Bruno',  'Koramangala',  'M', '03-10-2026', '03-10-2026', ''],
  ['IND-102', 'Kalu',   'Indiranagar',  'M', '08-10-2026', '08-10-2026', ''],            // StrayPaw: 06-10-2026  → date differs
  ['HSR-103', 'Rani',   'HSR Layout',   'F', '09-10-2026', '09-10-2026', ''],
  ['JAY-104', 'Tiger',  'Jayanagar',    'M', '13-10-2026', '13-10-2026', ''],
  ['BTM-105', 'Moti',   'BTM Layout',   'M', '16-10-2026', '16-10-2026', ''],
  ['MAL-106', 'Lucky',  'Malleshwaram', 'M', '21-10-2026', '21-10-2026', ''],
  ['WHI-107', 'Sheru',  'Whitefield',   'M', '24-10-2026', '24-10-2026', ''],
  ['YEL-108', 'Chotu',  'Yelahanka',    'M', '28-10-2026', '28-10-2026', ''],
  ['HSR-103', 'Rani',   'HSR Layout',   'F', '09-10-2026', '09-10-2026', 'Re-entered'],  // repeated tag
  ['BAN-109', 'Bhura',  'Banashankari', 'M', '01-11-2026', '01-11-2026', ''],
  ['RAJ-110', 'Julie',  'Rajajinagar',  'F', '02-11-2026', '02-11-2026', ''],
  ['KOR-111', 'Snowy',  'Koramangala',  'F', '03-11-2026', '03-11-2026', ''],
  ['WHI-117', 'Coco',   'Whitefield',   'F', '07-11-2026', '07-11-2026', 'ARV given'],   // StrayPaw: status unknown, no vaccination
  ['YEL-118', 'Ginger', 'Yelahanka',    'F', '10-11-2026', '10-11-2026', ''],            // StrayPaw: no procedure recorded
  ['YEL-128', '',       'Yelahanka',    'M', '11-11-2026', '11-11-2026', 'Released same ward'], // StrayPaw: not sterilised
  ['KOR-141', 'Rocky',  'Koramangala',  'M', '12-11-2026', '12-11-2026', ''],            // not on the StrayPaw register
];
const EXPECTED = {
  rows: ROWS.length, distinct_tags: 15,
  not_on_register: ['KOR-141'], repeated_in_document: ['HSR-103'],
  date_differs: [{ tag: 'IND-102', document: '2026-10-08', straypaw: '2026-10-06' }],
  status_differs: [{ tag: 'YEL-128', document: 'sterilised', straypaw: 'not_sterilised' }, { tag: 'WHI-117', document: 'sterilised + ARV', straypaw: 'status unknown; sterilisation event 2026-11-07; no vaccination' }, { tag: 'YEL-118', document: 'sterilised 2026-11-10', straypaw: 'no procedure recorded' }],
  on_straypaw_not_in_document: ['IND-112', 'HSR-113', 'JAY-114', 'BTM-115', 'MAL-116'],
  claimed_total_in_letter: 18,
};
const HEAD = ['Sl. No.', 'Tag No.', 'Name', 'Ward', 'Sex', 'ABC surgery date', 'ARV date', 'Remarks'];

function xlsx() {
  const aoa = [['Office of the Joint Director (Animal Husbandry), East Zone — ABC/ARV register'], ['Agency: Bengaluru Animal Care Trust', '', '', 'Period: 01-10-2026 to 15-11-2026'], [], HEAD, ...ROWS.map((r, i) => [i + 1, ...r])];
  const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [8, 12, 12, 16, 6, 18, 14, 22].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'ABC register');
  XLSX.writeFile(wb, path.join(out, 'East-Zone-ABC-register-Oct-Nov-2026.xlsx'));
}
const css = `body{font-family:Georgia,serif;color:#1b1b1b;margin:0;padding:56px 64px}h1{font-size:19px;text-align:center;margin:0}h2{font-size:14px;text-align:center;font-weight:400;margin:4px 0 18px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #333;padding:6px 8px;text-align:left}th{background:#eee}.meta{display:flex;justify-content:space-between;font-size:13px;margin:10px 0}.sig{margin-top:44px;display:flex;justify-content:space-between;font-size:13px}`;
const table = (hand) => `<table><tr>${HEAD.map((h) => `<th>${h}</th>`).join('')}</tr>${ROWS.map((r, i) => `<tr><td>${i + 1}</td>${r.map((c) => `<td class="${hand ? 'h' : ''}">${c}</td>`).join('')}</tr>`).join('')}</table>`;
const letter = `<html><head><meta charset="utf-8"><style>${css} p{font-size:14px;line-height:1.55}</style></head><body>
<h1>BRUHAT BENGALURU MAHANAGARA PALIKE (specimen)</h1><h2>Office of the Joint Director (Animal Husbandry), East Zone</h2>
<div class="meta"><span>No. JD(AH)/EZ/ABC/2026-27/114</span><span>Date: 18-11-2026</span></div>
<p>To<br>The Programme Lead,<br>Bengaluru Animal Care Trust</p>
<p><b>Sub: Reconciliation of ABC/ARV work for the period 01-10-2026 to 15-11-2026, and monthly report.</b></p>
<p>With reference to the above, this office's register for the period shows <b>18 ABC surgeries</b> and <b>18 anti-rabies vaccinations</b> carried out by your agency across the wards of Koramangala, Indiranagar, HSR Layout, Jayanagar, BTM Layout, Malleshwaram, Whitefield, Yelahanka, Banashankari and Rajajinagar. The register extract is enclosed.</p>
<p>You are requested to (1) confirm each entry against your own records by tag number and surgery date, (2) explain any entry that does not agree, and (3) submit the monthly ABC/ARV report for the period, ward-wise, on or before <b>30-11-2026</b>. Claims will be processed only for entries that agree with the agency's records and carry the required evidence.</p>
<p>Encl: Register extract (16 entries).</p>
<div class="sig"><span></span><span>Sd/-<br>Joint Director (Animal Husbandry)<br>East Zone</span></div>
<h2 style="margin-top:36px">Enclosure: register extract</h2>${table(false)}
<p style="font-size:11px;color:#555;margin-top:28px">Specimen document with invented entries, prepared for software testing. Not issued by any office.</p></body></html>`;
// A "scan": hand-entered ledger page, rasterised, slightly rotated with paper tone, so it carries no text layer.
const scan = `<html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Noto+Sans+Kannada&family=Noto+Sans+Devanagari&display=swap" rel="stylesheet"><style>${css}
body{background:#d9d4c7;padding:40px}.page{background:#f3eedf;padding:48px 44px;transform:rotate(-0.7deg);box-shadow:0 6px 30px rgba(0,0,0,.35);filter:contrast(.94) brightness(.98)}
.h{font-family:Caveat,cursive;font-size:21px;color:#1a2a6c}th{background:#e4dcc6;font-size:12px}td{padding:3px 8px}.stamp{border:2px solid #7a1f1f;color:#7a1f1f;display:inline-block;padding:6px 12px;transform:rotate(-8deg);font-size:12px;opacity:.7}</style></head><body><div class="page">
<h1>ಪ್ರಾಣಿ ಜನನ ನಿಯಂತ್ರಣ (ABC) ದಾಖಲೆ ಪುಸ್ತಕ · एबीसी रजिस्टर</h1><h2>ABC / ARV Register — East Zone — Agency: Bengaluru Animal Care Trust</h2>
<div class="meta"><span>Period: <span class="h">01-10-2026 to 15-11-2026</span></span><span>Page <span class="h">7</span></span></div>${table(true)}
<div class="sig"><span class="stamp">VERIFIED · EAST ZONE<br>specimen</span><span class="h">Total entries: 16 &nbsp; (claimed 18)</span></div></div></body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true }); xlsx();
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1300 }, deviceScaleFactor: 2 });
  await p.setContent(letter); await p.pdf({ path: path.join(out, 'JD-AH-East-Zone-reconciliation-letter.pdf'), format: 'A4', printBackground: true });
  await p.setContent(scan, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(800);
  const png = await p.screenshot({ fullPage: true, type: 'jpeg', quality: 72 });
  fs.writeFileSync(path.join(out, 'ABC-register-page-7-scan.jpg'), png);
  await p.setContent(`<html><body style="margin:0"><img src="data:image/jpeg;base64,${png.toString('base64')}" style="width:100%"></body></html>`);
  await p.pdf({ path: path.join(out, 'ABC-register-page-7-scan.pdf'), format: 'A4', printBackground: true });
  await b.close();
  fs.writeFileSync(path.join(out, 'EXPECTED.json'), JSON.stringify(EXPECTED, null, 2));
  console.log(fs.readdirSync(out).map((f) => `${f} ${fs.statSync(path.join(out, f)).size}`).join('\n'));
})();
