"use client";

/* Does Google have photorealistic 3D where our dogs are?

   Measured, one city at a time: Cesium opens on the densest StrayPaw cell in
   each city (the real recorded coordinate), streams Google's tiles for 12
   seconds, and counts how many fine-grained tiles (under ~250 m across)
   arrive within 3 km. Fine tiles mean real photogrammetry; none means the
   city falls back to OpenStreetMap buildings. */

import "../sys.css";
import "./sp.css";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import raw from "../../data/spatial.json";
import { Band } from "../parts";
import { A, cellOf, cellCentre, type Data } from "./engine";
import type { Coverage } from "./City3D";
import { LS_KEY } from "./Spatial";

const City3D = dynamic(() => import("./City3D").then((m) => m.City3D), { ssr: false });
const data = raw as unknown as Data;
const ENV_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY ?? "";

type Row = { name: string; dogs: number; at: [number, number]; result?: Coverage; detail?: string };

export function SystemCoverageTest() {
  const rows0 = useMemo<Row[]>(() => data.cities.map((c, ci) => {
    // The densest recorded cell in the city: where a "View in city" is most likely to land.
    const count = new Map<string, number>();
    data.animals.forEach((a) => { if (a[A.city] === ci) { const k = cellOf(a[A.lng], a[A.lat]); count.set(k, (count.get(k) ?? 0) + 1); } });
    const best = [...count.entries()].sort((x, y) => y[1] - x[1])[0];
    return { name: c.name, dogs: data.animals.filter((a) => a[A.city] === ci).length, at: best ? cellCentre(best[0]) : [c.lng, c.lat] };
  }), []);
  const [rows, setRows] = useState<Row[]>(rows0);
  const [key, setKey] = useState(ENV_KEY);
  const [draft, setDraft] = useState("");
  const [run, setRun] = useState(-1);
  useEffect(() => { if (!ENV_KEY) try { const k = localStorage.getItem(LS_KEY); if (k) setKey(k); } catch { /* storage blocked */ } }, []);

  const start = () => { setRows(rows0); setRun(0); };
  const save = () => { const k = draft.trim(); if (!k) return; try { localStorage.setItem(LS_KEY, k); } catch { /* storage blocked */ } setKey(k); setDraft(""); };
  const cur = run >= 0 && run < rows.length ? rows[run] : null;

  return (
    <main className="sx night sx-spatial">
      <Band current="/lab/system/spatial" crumbs={["India", "Spatial intelligence", "3D coverage"]} />
      <div className="sp-cov">
        <section className="sp-cov-side">
          <span className="lbl">3D City · coverage test</span>
          <h1>Does Google have our streets in 3D?</h1>
          <p className="note">Each city opens on its densest StrayPaw cell and streams Google Photorealistic 3D Tiles for 12 seconds. Fine tiles (under ~250 m across) within 3 km mean photogrammetry exists there. No fine tiles: that city falls back to OpenStreetMap buildings.</p>
          {!key ? (
            <div className="sp-cov-key">
              <p className="note">No Google key in this build (<code>NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY</code>). Paste a Map Tiles API key to test from this browser; it is kept in this browser only.</p>
              <label htmlFor="gkey" className="lbl">Map Tiles API key</label>
              <div className="row"><input id="gkey" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} /><button type="button" className="sp-tool strong" onClick={save}>Use key</button></div>
            </div>
          ) : (
            <div className="row"><button type="button" className="sp-tool strong" onClick={start} disabled={!!cur}>{cur ? `Testing ${cur.name}…` : "Run the test"}</button>
              {!ENV_KEY && <button type="button" className="sp-link" onClick={() => { try { localStorage.removeItem(LS_KEY); } catch { /* ok */ } setKey(""); }}>Forget key</button>}</div>
          )}
          <table className="sp-cov-t">
            <thead><tr><th>City</th><th className="n">Dogs</th><th>Tested at</th><th>Result</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.name} className={i === run ? "on" : ""}>
                <td>{r.name}</td><td className="n m">{r.dogs.toLocaleString("en-IN")}</td><td className="m">{r.at[1].toFixed(3)}, {r.at[0].toFixed(3)}</td>
                <td className={r.result === "photoreal" ? "yes" : r.result ? "no" : ""}>{r.result === "photoreal" ? "Photorealistic 3D" : r.result === "none" ? "No coverage → OSM" : r.result === "error" ? "Refused → OSM" : i === run ? "streaming…" : "—"}{r.detail ? <small>{r.detail}</small> : null}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
        <div className="sp-cov-view">
          {cur && key ? (
            <City3D key={cur.name} apiKey={key} focus={{ lng: cur.at[0], lat: cur.at[1], records: 0 }} points={[]} cells={[]} step="cluster"
              onCoverage={(c, detail) => { if (c === "checking") return; setRows((rs) => rs.map((r, i) => (i === run ? { ...r, result: c, detail } : r))); setRun((x) => x + 1); }} />
          ) : <p className="empty">{key ? (run >= rows.length ? "Done. Open any city from the spatial map to see it." : "Run the test to stream each city.") : "Waiting for a key."}</p>}
        </div>
      </div>
    </main>
  );
}
