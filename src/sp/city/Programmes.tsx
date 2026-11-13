"use client";

/* ════════════════════════════════════════════════════════════════════
   Municipality · Programmes (decisions 023, 029, 034; reference 09 Our
   World in Data). Every public programme organisations have shared, on
   one time axis: what kind of work, where, when, and the one figure it is
   about, in its honest unit ("vaccinated" only when vaccinations were
   recorded; otherwise "animals on record"). Filtered by city and kind,
   and exported as shown: CSV, Excel, or a printed report.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { programmeCategory, programmePrimaryTotal, programmePrimaryUnit, type PublicProgramme, type PublicProgrammeCategory } from "@/lib/public-programmes";
import { Btn, Empty, Head, Lanes, Page, Panel, Table, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { CAT } from "./kinds";
import "./city.css";

const ms = (iso: string | null) => (iso ? Date.parse(`${iso}T00:00:00Z`) : NaN);
const f = (n: number) => n.toLocaleString("en-IN");
const short = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : null);

type Kind = PublicProgrammeCategory | "all";
const SHORT: Record<PublicProgrammeCategory, string> = { sterilisation: "Sterilisation", vaccination: "Vaccination", treatment: "Treatment", study: "Survey", other: "Other" };

export function Programmes({ all, initialCity, now }: { all: PublicProgramme[]; initialCity: string | null; now: number }) {
  const cities = useMemo(() => [...new Set(all.map((p) => p.city).filter(Boolean) as string[])].sort(), [all]);
  const [picked, setCity] = usePageState<string>("city", initialCity && cities.includes(initialCity) ? initialCity : "");
  const city = cities.includes(picked) ? picked : "";
  const [cat, setCat] = usePageState<Kind>("kind", "all");
  const inCity = useMemo(() => all.filter((p) => !city || p.city === city), [all, city]);
  const rows = useMemo(() => inCity.filter((p) => cat === "all" || programmeCategory(p) === cat), [inCity, cat]);
  const counts = useMemo(() => { const m = new Map<PublicProgrammeCategory, number>(); for (const p of inCity) m.set(programmeCategory(p), (m.get(programmeCategory(p)) ?? 0) + 1); return m; }, [inCity]);
  const dated = rows.filter((p) => !Number.isNaN(ms(p.starts_on)) || !Number.isNaN(ms(p.ends_on)));
  const t0 = Math.min(...dated.map((p) => (Number.isNaN(ms(p.starts_on)) ? ms(p.ends_on) : ms(p.starts_on)))), t1 = Math.max(now, ...dated.map((p) => (Number.isNaN(ms(p.ends_on)) ? now : ms(p.ends_on))));
  const span = Math.max(1, t1 - t0);
  const pct = (t: number) => `${((t - t0) / span) * 100}%`;
  const range = dated.length ? [short(new Date(t0).toISOString().slice(0, 10)), short(new Date(t1).toISOString().slice(0, 10))] : null;
  /* Cities with the most programmes first, each city's programmes together. */
  const ordered = useMemo(() => { const m = new Map<string, PublicProgramme[]>(); for (const p of rows) { const k = p.city ?? "City not recorded"; m.set(k, [...(m.get(k) ?? []), p]); } return [...m.entries()].sort((a, b) => b[1].length - a[1].length).flatMap(([, l]) => l); }, [rows]);
  const nCities = new Set(inCity.map((p) => p.city ?? "")).size;

  const cols: Col<PublicProgramme>[] = [
    { key: "name", label: "Programme", width: "minmax(0, 2fr)", render: (p) => <span className="cpk-name"><i style={{ background: CAT[programmeCategory(p)].ink }} aria-hidden />{p.name}</span> },
    { key: "org", label: "Organisation", width: "minmax(0, 1.2fr)", render: (p) => p.ngo_name },
    { key: "where", label: "Where", width: "minmax(0, 1.2fr)", render: (p) => [p.zone, p.city].filter(Boolean).join(", ") || "City not recorded" },
    { key: "when", label: range ? `${range[0]} to ${range[1]}` : "When", width: "minmax(0, 1.4fr)", render: (p) => {
      const k = programmeCategory(p), a = ms(p.starts_on), b = ms(p.ends_on), has = !Number.isNaN(a) || !Number.isNaN(b);
      const st = Number.isNaN(a) ? b : a, en = Number.isNaN(b) ? (Number.isNaN(a) ? a : now) : b;
      const when = has ? [short(p.starts_on), short(p.ends_on) ?? "ongoing"].filter(Boolean).join(" – ") : "Dates not published";
      return has ? <span className="cpk-band" title={when}><span className="sr-only">{when}</span><i aria-hidden className={Number.isNaN(b) ? "is-open" : undefined} style={{ left: pct(st), width: `max(8px, ${((en - st) / span) * 100}%)`, background: CAT[k].ink }} /></span> : when;
    } },
    { key: "fig", label: "On record", width: "144px", align: "end", keep: true, render: (p) => <><b className="cpk-n">{f(programmePrimaryTotal(p))}</b> {programmePrimaryUnit(p)}</> },
  ];

  /* The sentence says how much has been published and where; the lanes are the kinds of work; each row is one programme on the same time scale. */
  return (
    <Page className="cpk">
      <Head title="Programmes"
        sum={!all.length ? "No organisation has published a programme yet." : <><b>{inCity.length}</b> published {inCity.length === 1 ? "programme" : "programmes"}{city ? <> in {city}</> : <> in <b>{nCities}</b> {nCities === 1 ? "city" : "cities"}</>}. Each figure is in the unit its organisation recorded.</>} />
      <Tools end={
        <span className="cpk-export no-print" role="group" aria-label="Export the programmes shown">
          <Btn small variant="quiet" icon={<Download size={14} />} disabled={!rows.length} onClick={() => exportRows(rows, "csv", city, cat === "all" ? "" : cat)}>CSV</Btn>
          <Btn small variant="quiet" icon={<FileSpreadsheet size={14} />} disabled={!rows.length} onClick={() => exportRows(rows, "xlsx", city, cat === "all" ? "" : cat)}>Excel</Btn>
          <Btn small variant="quiet" icon={<Printer size={14} />} disabled={!rows.length} onClick={() => window.print()}>Print</Btn>
        </span>
      }>
        {inCity.length > 0 && counts.size > 1 ? <Lanes<Kind> label="Kind of work" value={cat} onChange={setCat} lanes={[{ id: "all", label: "All", count: inCity.length }, ...(Object.keys(CAT) as PublicProgrammeCategory[]).filter((k) => counts.get(k)).map((k) => ({ id: k as Kind, label: SHORT[k], count: counts.get(k) }))]} /> : null}
        {cities.length > 1 ? <label className="mh-pick"><span className="sr-only">City</span><select value={city} onChange={(e) => setCity(e.target.value)}><option value="">Every city</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></label> : null}
      </Tools>
      <Panel>
        <Table label="Published programmes" cols={cols} rows={ordered} rowKey={(p) => p.id} href={(p) => `/city/programmes/${p.id}`}
          empty={<Empty title="No programme matches">No organisation has published a programme of this kind{city ? ` in ${city}` : ""}. That says what has been shared, not what has happened.</Empty>} />
      </Panel>
    </Page>
  );
}

/* ── export: exactly the programmes shown, one row each ── */
function table(rows: PublicProgramme[]) {
  return rows.map((p) => ({
    Programme: p.name, Organisation: p.ngo_name, Kind: CAT[programmeCategory(p)]?.label ?? p.kind,
    City: p.city ?? "", State: p.state ?? "", Area: p.zone ?? "",
    Starts: p.starts_on ?? "", Ends: p.ends_on ?? "",
    Figure: programmePrimaryTotal(p), Unit: programmePrimaryUnit(p),
    "Animals recorded": p.animals_recorded, "Sterilised recorded": p.sterilised_recorded, "Vaccinated recorded": p.vaccinated_recorded,
    Summary: p.public_summary ?? "", Link: `https://www.straypaw.org/city/programmes/${p.id}`,
  }));
}

async function exportRows(rows: PublicProgramme[], kind: "csv" | "xlsx", city: string, cat: string) {
  const name = `straypaw-programmes${city ? `-${city.toLowerCase().replace(/\s+/g, "-")}` : ""}${cat ? `-${cat}` : ""}-${new Date().toISOString().slice(0, 10)}`;
  const data = table(rows);
  let blob: Blob;
  if (kind === "csv") {
    const cols = Object.keys(data[0] ?? {});
    const cell = (v: unknown) => { const t = String(v ?? ""); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    blob = new Blob(["\ufeff" + [cols.join(","), ...data.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(","))].join("\n")], { type: "text/csv;charset=utf-8" });
  } else {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), "Programmes");
    blob = new Blob([XLSX.write(book, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${name}.${kind}`; a.click();
  URL.revokeObjectURL(url);
}
