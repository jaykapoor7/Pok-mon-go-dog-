"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Import a workbook (decisions 022, 038, 044).

   Bring the register the organisation already keeps, as it is:
     1 · Choose the file. Nothing is written yet.
     2 · Read it: which sheet, what kind of sheet it looks like, and how
         its columns map to StrayPaw's fields. The preview is computed by
         the server and stored nowhere.
     3 · Decide identity for the rows shown: a new animal, the same as a
         suggested existing record, hold for review, or skip. Matching is
         a person's decision; a likeness never merges records. Rows not
         shown default to "hold for review".
     4 · Import. The original file is filed with the batch; the receipt
         says how many rows were imported, held and failed.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { FileUp } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useMembership } from "../shell/Shell";
import { Ack, n } from "../ui";
import { NgoGate } from "./Gate";
import "./ngo.css";

type Mapping = Record<string, string | null>;
type Profile = { name: string; rows: number; headers: string[]; kind: string; label: string; confidence: string; reason: string };
type Sample = { sourceRowNumber: number; raw: Record<string, unknown>; normalized: Record<string, unknown> };
type Preview = { sheetName: string; sheetProfiles: Profile[]; headers: string[]; rows: unknown[]; mapping: Mapping; sample: Sample[]; matches: Record<string, { id: string; label: string; reasons: string[] }[]> };
type Decision = { decision: "new" | "merge" | "review" | "skip"; matchedDogId?: string };
type Result = { batchId: string; imported: number; review: number; failed: number; sourceStored: boolean };

const FIELDS: [string, string][] = [
  ["name", "Animal name"], ["animalCode", "Your animal ID"], ["species", "Species"], ["sex", "Sex"], ["colour", "Colour / markings"],
  ["location", "Locality"], ["city", "City"], ["latitude", "Latitude"], ["longitude", "Longitude"], ["condition", "Condition"],
  ["status", "Status"], ["caseDetail", "Case detail"], ["date", "Date reported"], ["reviewDate", "Review / follow-up date"],
  ["detailedStatus", "Outcome / update"], ["programme", "Programme / drive"],
];

async function token() { const s = getSupabase(); return s ? (await s.auth.getSession()).data.session?.access_token ?? null : null; }

export function Import() {
  const mem = useMembership();
  const [file, setFile] = useState<File | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [dec, setDec] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState<"read" | "send" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  const post = async (action: "preview" | "commit", sheet?: string, map?: Mapping | null) => {
    const fd = new FormData();
    fd.set("action", action); fd.set("file", file!);
    const t = await token(); if (t) fd.set("accessToken", t);
    if (sheet) fd.set("sheetName", sheet);
    if (map) fd.set("mapping", JSON.stringify(map));
    if (action === "commit") fd.set("decisions", JSON.stringify(dec));
    const res = await fetch("/api/partner/import", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({ error: "The server's answer could not be read." }));
    if (!res.ok) throw new Error(body.error ?? "The import could not be processed.");
    return body;
  };
  const read = async (sheet?: string, map?: Mapping | null) => {
    if (!file) return;
    setBusy("read"); setErr(null);
    try {
      const p = (await post("preview", sheet, map)) as Preview;
      setPv(p); setMapping(p.mapping);
      setDec(Object.fromEntries(p.sample.map((s) => { const m = p.matches?.[s.sourceRowNumber]?.[0]; return [String(s.sourceRowNumber), m ? { decision: "merge" as const, matchedDogId: m.id } : { decision: "review" as const }]; })));
    } catch (e) { setErr(e instanceof Error ? e.message : "Not read."); }
    finally { setBusy(null); }
  };
  const commit = async () => {
    setBusy("send"); setErr(null);
    try { setDone((await post("commit", pv?.sheetName, mapping)) as Result); } catch (e) { setErr(e instanceof Error ? e.message : "Not imported."); }
    finally { setBusy(null); }
  };
  const total = pv?.sheetProfiles.find((s) => s.name === pv.sheetName)?.rows ?? 0;
  const counts = Object.values(dec).reduce((m, d) => ({ ...m, [d.decision]: (m[d.decision] ?? 0) + 1 }), {} as Record<string, number>);
  const step = done ? 4 : pv ? 3 : file ? 2 : 1;

  return (
    <NgoGate title="Import" lede="Bring in the register your organisation already keeps.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · records</p><h1 className="serif">Import a workbook</h1></div>
          <p className="ngo-sum">Your register as it is: .xlsx, .xls or .csv, up to 25 MB. The original file is filed with what it produced, and nothing merges without a person deciding.</p>
        </header>
        <ol className="im-steps" aria-label="Steps">{["Choose the file", "Read and map", "Decide identity", "Imported"].map((s, i) => <li key={s} className={step > i + 1 ? "is-done" : step === i + 1 ? "is-on" : ""}><span className="mono">{String(i + 1).padStart(2, "0")}</span>{s}</li>)}</ol>
        {err && <p className="im-err" role="alert"><Ack state="failed">{err}</Ack> Nothing was written.</p>}

        {done ? (
          <section className="im-done">
            <Ack state="saved">Imported. Batch {done.batchId.slice(0, 8)}</Ack>
            <dl className="ledger"><div><dt>Imported</dt><dd>{n(done.imported)} rows</dd></div><div><dt>Held for review</dt><dd>{n(done.review)} rows</dd></div><div><dt>Failed</dt><dd>{n(done.failed)} rows{done.failed ? " (each kept with its error)" : ""}</dd></div><div><dt>Original file</dt><dd>{done.sourceStored ? "filed with the batch" : "could not be stored; keep your copy"}</dd></div></dl>
            <p className="small">Imported statuses wait in Historical review until someone confirms them; they are never counted as today&rsquo;s work.</p>
            <div className="row"><Link className="btn is-ink" href="/ngo/review?cohort=history">Historical review</Link><Link className="btn" href="/ngo/animals">The register</Link><button type="button" className="btn is-ghost" onClick={() => { setFile(null); setPv(null); setDone(null); setDec({}); }}>Import another</button></div>
          </section>
        ) : !pv ? (
          <section className="im-pick">
            <label className="im-drop">
              <FileUp size={28} aria-hidden />
              <b>{file ? file.name : "Choose a workbook"}</b>
              <small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · nothing is written until the last step` : ".xlsx, .xls or .csv"}</small>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }} />
            </label>
            <button type="button" className="btn is-ink" disabled={!file || busy === "read"} onClick={() => void read()}>{busy === "read" ? "Reading…" : "Read it"}</button>
            <p className="small">Dogs only for now: a sheet with other species is refused before anything is written. Sheets that look like salaries or rent are flagged as private and should not be imported.</p>
          </section>
        ) : (
          <div className="im-grid">
            <section className="im-sheets">
              <h2 className="h3">Sheets in {file?.name}</h2>
              <ul>{pv.sheetProfiles.map((s) => (
                <li key={s.name}><button type="button" className={`im-sheet${s.name === pv.sheetName ? " is-on" : ""}${s.kind === "administrative" ? " is-private" : ""}`} onClick={() => void read(s.name, null)} disabled={busy === "read"}>
                  <b>{s.name}</b><small>{n(s.rows)} rows · {s.label}</small><small className="im-why">{s.reason}</small>
                </button></li>
              ))}</ul>
            </section>
            <section className="im-map">
              <h2 className="h3">Columns → fields</h2>
              <p className="small">Suggested from the headers. Change any; unmapped fields stay empty, never guessed.</p>
              <div className="im-fields">{FIELDS.map(([k, l]) => (
                <label key={k} className="im-field"><span>{l}</span><select className="select" value={mapping?.[k] ?? ""} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value || null })}><option value="">Not in this sheet</option>{pv.headers.filter(Boolean).map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
              ))}</div>
              <button type="button" className="btn is-s" disabled={busy === "read"} onClick={() => void read(pv.sheetName, mapping)}>{busy === "read" ? "Reading…" : "Read again with this mapping"}</button>
            </section>
            <section className="im-rows">
              <div className="im-rows-head">
                <h2 className="h3">Identity for the first {pv.sample.length} of {n(total)} rows</h2>
                <div className="row" style={{ ["--g" as string]: "6px" }}>
                  <button type="button" className="chip" onClick={() => setDec((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.decision === "merge" ? v : { decision: "new" }])))}>Unmatched → new animals</button>
                  <button type="button" className="chip" onClick={() => setDec((d) => Object.fromEntries(Object.keys(d).map((k) => [k, { decision: "review" }])))}>Hold all for review</button>
                </div>
              </div>
              <div className="im-table" role="region" aria-label="Rows" tabIndex={0}>
                <table>
                  <thead><tr><th>Row</th><th>Animal</th><th>Place</th><th>Condition / status</th><th>Decision</th></tr></thead>
                  <tbody>{pv.sample.map((s) => {
                    const k = String(s.sourceRowNumber), m = pv.matches?.[k] ?? [], d = dec[k] ?? { decision: "review" }, v = s.normalized as Record<string, string | undefined>;
                    return (
                      <tr key={k} className={`is-${d.decision}`}>
                        <td className="mono">{k}</td>
                        <td><b>{v.name ?? "—"}</b>{v.animalCode && <small className="mono"> {v.animalCode}</small>}<br /><small>{[v.sex, v.colour].filter(Boolean).join(" · ")}</small></td>
                        <td>{[v.location, v.city].filter(Boolean).join(", ") || <i className="small">not given</i>}</td>
                        <td><small>{[v.condition, v.status].filter(Boolean).join(" · ") || "—"}</small></td>
                        <td>
                          <select className="select im-dec" value={d.decision === "merge" ? `merge:${d.matchedDogId}` : d.decision} onChange={(e) => { const x = e.target.value; setDec({ ...dec, [k]: x.startsWith("merge:") ? { decision: "merge", matchedDogId: x.slice(6) } : { decision: x as Decision["decision"] } }); }} aria-label={`Decision for row ${k}`}>
                            <option value="review">Hold for review</option><option value="new">New animal</option>
                            {m.map((c) => <option key={c.id} value={`merge:${c.id}`}>Same as {c.label} ({c.reasons.join(", ")})</option>)}
                            <option value="skip">Skip this row</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div className="im-go">
                <p className="small">{n(counts.new ?? 0)} new · {n(counts.merge ?? 0)} same as an existing record · {n(counts.review ?? 0)} held · {n(counts.skip ?? 0)} skipped{total > pv.sample.length ? <> · the other {n(total - pv.sample.length)} rows are held for review</> : null}.</p>
                <button type="button" className="btn is-flame" disabled={busy === "send"} onClick={() => void commit()}>{busy === "send" ? "Importing…" : `Import ${n(total)} rows`}</button>
                {busy === "send" && <Ack state="pending">Importing. Large registers take up to a minute; keep this page open.</Ack>}
              </div>
            </section>
          </div>
        )}
      </div>
    </NgoGate>
  );
}
