"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · Programmes (decisions 023, 029, 034; reference 09 Our
   World in Data). Every public programme organisations have shared, on
   one time axis: what kind of work, where, when, and the one figure it is
   about, in its honest unit ("vaccinated" only when vaccinations were
   recorded; otherwise "animals on record"). Filtered by city and kind.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useState } from "react";
import { programmeCategory, programmePrimaryTotal, programmePrimaryUnit, type PublicProgramme, type PublicProgrammeCategory } from "@/lib/public-programmes";
import { State } from "../ui";
import { CAT } from "./kinds";
import "./city.css";

const ms = (iso: string | null) => (iso ? Date.parse(`${iso}T00:00:00Z`) : NaN);
const f = (n: number) => n.toLocaleString("en-IN");
const short = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : null);

export function Programmes({ all, initialCity, now }: { all: PublicProgramme[]; initialCity: string | null; now: number }) {
  const cities = useMemo(() => [...new Set(all.map((p) => p.city).filter(Boolean) as string[])].sort(), [all]);
  const [city, setCity] = useState(initialCity && cities.includes(initialCity) ? initialCity : "");
  const [cat, setCat] = useState<PublicProgrammeCategory | "">("");
  const rows = useMemo(() => all.filter((p) => (!city || p.city === city) && (!cat || programmeCategory(p) === cat)), [all, city, cat]);
  const dated = rows.filter((p) => !Number.isNaN(ms(p.starts_on)) || !Number.isNaN(ms(p.ends_on)));
  const t0 = Math.min(...dated.map((p) => (Number.isNaN(ms(p.starts_on)) ? ms(p.ends_on) : ms(p.starts_on)))), t1 = Math.max(now, ...dated.map((p) => (Number.isNaN(ms(p.ends_on)) ? now : ms(p.ends_on))));
  const span = Math.max(1, t1 - t0);
  const years = dated.length ? Array.from({ length: new Date(t1).getUTCFullYear() - new Date(t0).getUTCFullYear() + 1 }, (_, i) => new Date(t0).getUTCFullYear() + i) : [];
  const x = (t: number) => `${((t - t0) / span) * 100}%`;
  const byCity = useMemo(() => { const m = new Map<string, PublicProgramme[]>(); for (const p of rows) { const k = p.city ?? "City not recorded"; m.set(k, [...(m.get(k) ?? []), p]); } return [...m.entries()].sort((a, b) => b[1].length - a[1].length); }, [rows]);

  return (
    <div className="cp">
      <header className="ci-head">
        <div className="ci-title"><p className="k">Municipality · programmes</p><h1 className="display">Programmes</h1><p className="ci-sub">Published work, on one time axis</p></div>
        <div className="ci-controls">
          <label className="field"><span className="label">City</span><select className="select" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Every city</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        </div>
        <p className="ci-ev">Programmes organisations have chosen to publish, with the figure each is about in its honest unit. A programme&rsquo;s figure is what its organisation recorded, not coverage of a city&rsquo;s animals.</p>
        <div className="row cp-cats" role="group" aria-label="Kind of work">
          <button type="button" className="chip" aria-pressed={!cat} onClick={() => setCat("")}>All kinds</button>
          {(Object.keys(CAT) as PublicProgrammeCategory[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={cat === k} onClick={() => setCat(cat === k ? "" : k)}><i className="cp-sw" style={{ background: CAT[k].ink }} />{CAT[k].label}</button>)}
        </div>
      </header>
      {!rows.length && <State title="No programme matches">No organisation has published a programme of this kind{city ? ` in ${city}` : ""}. That says what has been shared, not what has happened.</State>}
      {rows.length > 0 && (
        <div className="cp-wrap">
          {years.length > 0 && <div className="cp-axis" aria-hidden><span className="cp-axis-name" />{<span className="cp-axis-band">{years.map((y) => { const t = Date.UTC(y, 0, 1); return t >= t0 ? <i key={y} style={{ left: x(t) }}>{y}</i> : null; })}</span>}<span /></div>}
          {byCity.map(([c, list]) => (
            <section key={c} className="cp-city" aria-label={c}>
              <h2 className="cp-cname serif">{c} <small className="mono">{list.length}</small></h2>
              <ol>
                {list.map((p) => {
                  const k = programmeCategory(p), a = ms(p.starts_on), b = ms(p.ends_on), has = !Number.isNaN(a) || !Number.isNaN(b);
                  const s = Number.isNaN(a) ? b : a, e = Number.isNaN(b) ? (Number.isNaN(a) ? a : now) : b;
                  return (
                    <li key={p.id}>
                      <Link href={`/city/programmes/${p.id}`} className="cp-row">
                        <span className="cp-name"><b>{p.name}</b><small>{p.ngo_name}{p.zone ? ` · ${p.zone}` : ""}</small></span>
                        <span className="cp-band">{has ? <i className={Number.isNaN(b) ? "is-open" : ""} style={{ left: x(s), width: `max(8px, ${((e - s) / span) * 100}%)`, background: CAT[k].ink }} title={[short(p.starts_on), short(p.ends_on) ?? "ongoing"].filter(Boolean).join(" – ")} /> : <em className="small">dates not published</em>}</span>
                        <span className="cp-fig"><b>{f(programmePrimaryTotal(p))}</b><small>{programmePrimaryUnit(p)}</small></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
