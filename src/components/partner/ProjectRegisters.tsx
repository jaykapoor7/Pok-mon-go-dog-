Warning: truncated output (original token count: 3158)
Total output lines: 217

"use client";

/* ════════════════════════════════════════════════════════════════════
   Projects: a register for work that is not a census — a rabies drive or
   education round. Each project names its own
   fields; each entry fills them in.

   A register is only as good as what gets filled in, so every project
   shows two things above its rows: entries week by week (is anyone still
   recording?) and, per field, how often it was actually filled — the
   missing part hatched, as everywhere else on StrayPaw. Projects are kept
   as surveys carrying a field marker; the flows are unchanged.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Loader2, Plus } from "lucide-react";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { getSurveys, getSurveyResponses, PROJECT_MARKER } from "@/lib/surveys";
import { createSurvey, submitSurveyResponse } from "@/lib/survey-actions";
import "./projects.css";

type Project = { id: string; title: string; species: string; description: string | null; status: string; created_at: string };
type Entry = { id: string; attributes: Record<string, unknown>; notes: string | null; created_at: string; count: number; species: string | null };

const fieldsOf = (p: Project) => {
  const line = (p.description ?? "").split("\n").find((x) => x.startsWith(PROJECT_MARKER));
  return line ? line.slice(PROJECT_MARKER.length).split("|").map((x) => x.trim()).filter(Boolean) : [];
};
const purposeOf = (p: Project) => (p.description ?? "").split("\n").filter((x) => !x.startsWith(PROJECT_MARKER)).join("\n").trim();
const filled = (v: unknown) => v != null && String(v).trim() !== "";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function ProjectRegisters() {
  const { member, ready } = usePartnerAccess();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selected, setSelected] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState(""), [species, setSpecies] = useState("dog"), [fieldText, setFieldText] = useState(""), [purpose, setPurpose] = useState("");
  const [values, setValues] = useState<Record<string, string>>({}), [notes, setNotes] = useState("");

  const reload = async () => {
    const all = (await getSurveys()) as unknown as Project[];
    const p = all.filter((x) => (x.description ?? "").includes(PROJECT_MARKER));
    setProjects(p);
    setSelected((s) => s || p[0]?.id || "");
  };
  const loadEntries = async (id: string) => setEntries((await getSurveyResponses(id, 25000)) as unknown as Entry[]);
  useEffect(() => { if (ready) reload().catch(() => setProjects([])); }, [ready, member]);
  useEffect(() => { if (!selected) { setEntries([]); return; } loadEntries(selected).catch(() => setEntries([])); }, [selected]);

  const project = projects?.find((p) => p.id === selected) ?? null;
  const fields = project ? fieldsOf(project) : [];

  const make = async (e: FormEvent) => {
    e.preventDefault();
    const f = fieldText.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    if (!name.trim() || !f.length) return;
    setBusy(true); setError(null);
    try {
      const id = …1158 tokens truncated…    </div>

              <Pulse entries={entries} />
              {entries.length > 0 && <Completeness fields={fields} entries={entries} />}

              {member && (
                <form onSubmit={add} className="pj-entry">
                  <p className="pj-h">A new entry</p>
                  {fields.map((f) => <label key={f}>{f}<input value={values[f] || ""} onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))} /></label>)}
                  <label className="is-wide">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
                  <div className="pj-row is-wide"><button type="submit" disabled={busy} className="sys-btn">{busy ? <Loader2 size={15} className="animate-spin" /> : null} Add the entry</button></div>
                </form>
              )}

              <div className="pj-table">
                <table>
                  <thead><tr><th>Date</th>{fields.map((f) => <th key={f}>{f}</th>)}<th>Notes</th></tr></thead>
                  <tbody>
                    {entries.slice(0, 500).map((r) => (
                      <tr key={r.id}>
                        <td className="sys-mono">{day(r.created_at)}</td>
                        {fields.map((f) => <td key={f} className={filled(r.attributes?.[f]) ? "" : "is-empty"}>{filled(r.attributes?.[f]) ? String(r.attributes?.[f]) : <span aria-label="not recorded" />}</td>)}
                        <td className="is-note">{r.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length > 500 && <p className="pj-fine">The latest 500 of {entries.length.toLocaleString("en-IN")} entries are shown here; the export carries all of them.</p>}
                {!entries.length && <p className="pj-fine">No entries yet.</p>}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

/** Entries per week across the project's life: is anyone still recording? */
function Pulse({ entries }: { entries: Entry[] }) {
  const weeks = useMemo(() => {
    if (!entries.length) return [];
    const W = 7 * 86_400_000;
    const ts = entries.map((e) => Date.parse(e.created_at));
    const t0 = Math.min(...ts), n = Math.max(1, Math.ceil((Date.now() - t0) / W));
    const out = Array.from({ length: Math.min(n, 104) }, () => 0);
    for (const t of ts) { const k = Math.floor((t - t0) / W) - Math.max(0, n - 104); if (k >= 0) out[k]++; }
    return out;
  }, [entries]);
  if (!entries.length) return <p className="pj-pulse-empty">Nothing recorded yet. The first entry starts this project&rsquo;s clock.</p>;
  const max = Math.max(...weeks);
  const last = entries.map((e) => Date.parse(e.created_at)).sort((a, b) => b - a)[0];
  const quiet = Math.floor((Date.now() - last) / 86_400_000);
  return (
    <figure className="pj-pulse">
      <div className="pj-pulse-bars" aria-hidden>{weeks.map((v, i) => <i key={i} style={{ height: `${v ? Math.max(8, (v / max) * 100) : 0}%` }} className={v ? "" : "is-zero"} />)}</div>
      <figcaption><b>{entries.length.toLocaleString("en-IN")}</b> entries over {weeks.length} {weeks.length === 1 ? "week" : "weeks"}; {quiet === 0 ? "the last one today" : <>the last one <span className={quiet > 30 ? "is-hot" : ""}>{quiet} {quiet === 1 ? "day" : "days"} ago</span></>}.</figcaption>
    </figure>
  );
}

/** Each field: how often it was filled in. The missing part is hatched. */
function Completeness({ fields, entries }: { fields: string[]; entries: Entry[] }) {
  return (
    <ol className="pj-fields">
      {fields.map((f) => {
        const n = entries.filter((e) => filled(e.attributes?.[f])).length;
        const p = n / entries.length;
        return (
          <li key={f}>
            <span>{f}</span>
            <i className="pj-band"><em style={{ width: `${p * 100}%` }} /></i>
            <b className="sys-mono">{Math.round(p * 100)}%</b>
          </li>
        );
      })}
    </ol>
  );
}
