"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  publishedSurveys,
  publishedTotals,
  surveysToCsv,
  type PublishedSurvey,
  type PublishedTotals,
} from "@/lib/dataset";

/* ════════════════════════════════════════════════════════════════════
   The dataset, published.

   This is the point of the whole system, so it is built to be argued with
   rather than admired. Every row says which organisation collected it,
   over what area, by what method, between which dates, how many
   observations it rests on and how many people made them. A figure you
   cannot trace is a figure nobody should quote.

   Unknowns are shown, never hidden in a denominator. A ward where 40
   animals were checked and 60 were not is 40 data points and a known blind
   spot, and saying so is the difference between a dataset and a claim.
   ════════════════════════════════════════════════════════════════════ */

const METHOD_LABEL: Record<string, string> = {
  census: "Ward census",
  sterilisation: "Sterilisation drive",
  vaccination: "Vaccination drive",
  treatment: "Treatment camp",
  other: "Other fieldwork",
};

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

function dates(r: PublishedSurvey) {
  const f = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (r.starts_on && r.ends_on && r.starts_on !== r.ends_on)
    return `${f(r.starts_on)} to ${f(r.ends_on)}`;
  if (r.starts_on) return f(r.starts_on);
  return "Not dated";
}

export function DatasetClient() {
  const [rows, setRows] = useState<PublishedSurvey[] | null>(null);
  const [totals, setTotals] = useState<PublishedTotals | null>(null);
  const [state, setState] = useState("");
  const [method, setMethod] = useState("");

  useEffect(() => {
    publishedSurveys().then(setRows).catch(() => setRows([]));
    publishedTotals().then(setTotals).catch(() => setTotals(null));
  }, []);

  const states = useMemo(
    () =>
      [...new Set((rows ?? []).map((r) => r.state).filter(Boolean))].sort() as string[],
    [rows]
  );
  const methods = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.method))].sort(),
    [rows]
  );

  const shown = (rows ?? []).filter(
    (r) => (!state || r.state === state) && (!method || r.method === method)
  );

  function download() {
    const blob = new Blob([surveysToCsv(shown)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `straypaw-surveys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows === null) {
    return (
      <div className="ds-load">
        <Loader2 size={18} className="imp-spin" /> Loading the dataset…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="ds-empty">
        <h2>No surveys published yet</h2>
        <p>
          A survey appears here once an organisation has filed fieldwork
          against a drive. Nothing is published automatically: a sighting
          nobody has reviewed is not evidence of anything, and it stays out of
          this table until somebody at an organisation has taken
          responsibility for it.
        </p>
      </div>
    );
  }

  return (
    <>
      {totals && (
        <section className="ds-head" aria-label="Dataset totals">
          <div className="ds-figures">
            <span>
              <b>{totals.animals.toLocaleString("en-IN")}</b>animals counted
            </span>
            <span>
              <b>{totals.surveys}</b>survey{totals.surveys === 1 ? "" : "s"}
            </span>
            <span>
              <b>{totals.areas}</b>area{totals.areas === 1 ? "" : "s"}
            </span>
            <span>
              <b>{totals.organisations}</b>organisation
              {totals.organisations === 1 ? "" : "s"}
            </span>
            <span>
              <b>{totals.observations.toLocaleString("en-IN")}</b>observations
            </span>
          </div>

          <div className="ds-rates">
            <p>
              <b>{pct(totals.sterilised_pct_of_checked)}</b> of the animals
              whose sterilisation status was established are sterilised, across{" "}
              {(totals.sterilised + totals.not_sterilised).toLocaleString(
                "en-IN"
              )}{" "}
              animals actually checked.
              {totals.sterilisation_unknown > 0 && (
                <>
                  {" "}
                  A further{" "}
                  {totals.sterilisation_unknown.toLocaleString("en-IN")} were
                  recorded without a status. They are excluded from that figure
                  rather than counted as unsterilised.
                </>
              )}
            </p>
            <p>
              <b>{pct(totals.vaccinated_pct_of_checked)}</b> of the animals
              whose rabies status was established are vaccinated, across{" "}
              {(totals.vaccinated + totals.not_vaccinated).toLocaleString(
                "en-IN"
              )}{" "}
              checked.
              {totals.vaccination_unknown > 0 && (
                <>
                  {" "}
                  {totals.vaccination_unknown.toLocaleString("en-IN")} were not
                  checked.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      <div className="ds-controls">
        <label>
          State
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m] ?? m}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ds-dl" onClick={download}>
          <Download size={15} /> Download {shown.length} row
          {shown.length === 1 ? "" : "s"} as CSV
        </button>
      </div>

      <div className="ds-scroll">
        <table className="ds-table">
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Method</th>
              <th scope="col">Dates</th>
              <th scope="col">Animals</th>
              <th scope="col">Sterilised</th>
              <th scope="col">Not</th>
              <th scope="col">Unknown</th>
              <th scope="col">Of checked</th>
              <th scope="col">Vaccinated</th>
              <th scope="col">Observations</th>
              <th scope="col">Collected by</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.survey_id}>
                <th scope="row">
                  {r.area}
                  <small>
                    {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                  </small>
                </th>
                <td>{METHOD_LABEL[r.method] ?? r.method}</td>
                <td>{dates(r)}</td>
                <td>{r.animals}</td>
                <td className="good">{r.sterilised}</td>
                <td className="warn">{r.not_sterilised}</td>
                <td className="muted">{r.sterilisation_unknown}</td>
                <td>
                  <b>{pct(r.sterilised_pct_of_checked)}</b>
                </td>
                <td className="good">
                  {r.vaccinated}
                  <small>{pct(r.vaccinated_pct_of_checked)} of checked</small>
                </td>
                <td>
                  {r.observations}
                  <small>
                    {r.collectors} {r.collectors === 1 ? "person" : "people"}
                  </small>
                </td>
                <td className="ds-org">{r.organisation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
