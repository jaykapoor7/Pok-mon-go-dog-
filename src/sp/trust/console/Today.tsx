"use client";

/* ════════════════════════════════════════════════════════════════════
   Moderation · Today. The first thing an operator sees: what is waiting
   on a person (oldest first), the figures every public page prints, and
   whether the data underneath them is healthy. Every number is read
   from the server; a part that could not be read says so.
   ════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, RefreshCw } from "lucide-react";
import { since } from "../../ui";
import { send, type Read } from "./api";
import { ReceiptLine, useReceipt } from "./parts";
import type { Overview, SectionId } from "./types";

export type Need = { id: SectionId; label: string; n: number; oldest: string | null; what: string };

const f = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");
const age = (iso: string | null) => (iso ? since(iso) : null);
const hoursAgo = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : Infinity);

export function Today({ secret, read, needs, onGo, reload }: { secret: string; read: Read<Overview> | undefined; needs: Need[]; onGo: (id: SectionId) => void; reload: () => Promise<void> }) {
  const waiting = needs.filter((x) => x.n > 0).sort((a, b) => (a.oldest ?? "9").localeCompare(b.oldest ?? "9"));
  const total = waiting.reduce((s, x) => s + x.n, 0);
  const o = read && "data" in read ? read.data : undefined;

  return (
    <div className="op">
      <section className="op-needs" aria-labelledby="op-needs-h">
        <h2 id="op-needs-h" className="op-h">{total ? `${f(total)} ${total === 1 ? "thing needs" : "things need"} you` : "Nothing needs you"}</h2>
        {!waiting.length ? (
          <p className="op-calm"><Check size={16} aria-hidden /> {o?.settings.autoApproval ? "New reports that pass every check go live on their own. Anything else will wait here." : "Every queue is empty. Auto-approval is off, so each new report will wait here for you."}</p>
        ) : (
          <ol className="op-list">
            {waiting.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onGo(x.id)}>
                  <b className="op-n">{f(x.n)}</b>
                  <span className="op-what"><strong>{x.label}</strong><small>{x.what}</small></span>
                  <span className="op-age">{x.oldest ? `oldest ${age(x.oldest)}` : ""}</span>
                  <ArrowRight size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {read?.state === "failed" && !read.data ? (
        <p className="op-err" role="alert"><AlertTriangle size={16} aria-hidden /> The overview could not be read ({read.error}). The queues on the left were read separately.</p>
      ) : !o ? (
        <div className="cn-reading" role="status" aria-label="Reading the overview"><span className="skel" /><span className="skel" /><span className="skel" /></div>
      ) : (
        <>
          <Record o={o} />
          <Health o={o} secret={secret} reload={reload} onGo={onGo} />
          <Week o={o} onGo={onGo} />
        </>
      )}
    </div>
  );
}

/* ── what the public sees ─────────────────────────────────────────── */
function Record({ o }: { o: Overview }) {
  const r = o.record;
  const clinical = r.clinical.reduce((s, c) => s + c.animals, 0);
  return (
    <section className="op-sec" aria-labelledby="op-rec-h">
      <h2 id="op-rec-h" className="op-h2">The public record</h2>
      <p className="op-sub">Exactly what the landing page, product page and map print. They all read this one rollup.</p>
      <dl className="op-figs">
        <div><dt>Animal records</dt><dd>{f(r.animals)}</dd></div>
        <div><dt>Dogs treated</dt><dd>{r.treated === null ? "—" : f(r.treated)}</dd></div>
        <div><dt>Requests for help</dt><dd>{f(r.requests)}</dd></div>
        <div><dt>Cities</dt><dd>{f(r.cities)}</dd></div>
        <div><dt>Recorded sterilised</dt><dd>{f(r.sterilised)}</dd></div>
        <div><dt>Recorded vaccinated</dt><dd>{f(r.vaccinated)}</dd></div>
      </dl>
      {clinical > 0 && <p className="op-note">{f(clinical)} of the animal records are {r.clinical.map((c) => c.city).join(", ")}&rsquo;s clinical register. They are counted everywhere, and drawn as one city-level register on the map, never as streets.</p>}
      <table className="op-cities">
        <caption className="sr">Largest city registers</caption>
        <thead><tr><th scope="col">City</th><th scope="col">Animals</th><th scope="col">Requests</th></tr></thead>
        <tbody>{r.topCities.map((c) => <tr key={c.city}><th scope="row">{c.city}{c.clinical && <small> · clinical register</small>}</th><td>{f(c.animals)}</td><td>{f(c.requests)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

/* ── is the data healthy ──────────────────────────────────────────── */
function Health({ o, secret, reload, onGo }: { o: Overview; secret: string; reload: () => Promise<void>; onGo: (id: SectionId) => void }) {
  const [r, setR] = useReceipt();
  const q = o.pipeline.queue;
  const open = o.pipeline.imports.filter((b) => b.status !== "imported" && b.status !== "rolled_back");
  const stuck = open.filter((b) => hoursAgo(b.created_at) > 1);
  const noCity = o.orgs.filter((x) => x.verified && !x.city);
  const animalsMatch = o.source.animals === null || o.source.animals === o.record.animals;
  const requestsMatch = o.source.requests === null || o.source.requests === o.record.requests;
  const mapAge = hoursAgo(o.pipeline.mapBuiltAt);

  async function refresh() {
    setR("pending");
    const a = await send<{ refreshed?: unknown[] }>(secret, "spatial:refresh", "/api/admin/spatial/refresh", { json: {} }, (b) => `Map refreshed for ${Array.isArray(b.refreshed) ? b.refreshed.length : 0} cit${Array.isArray(b.refreshed) && b.refreshed.length === 1 ? "y" : "ies"}`);
    setR(a);
    if (a.ok) await reload();
  }

  const rows: { ok: boolean; title: string; detail: string; act?: ReactNode }[] = [
    { ok: animalsMatch, title: animalsMatch ? "Animal count matches the records" : "The animal count is behind the records", detail: animalsMatch ? `${f(o.record.animals)} in the rollup, ${f(o.source.animals)} public animal records.` : `${f(o.record.animals)} in the rollup, ${f(o.source.animals)} public animal records. A map refresh brings them together.` },
    { ok: requestsMatch, title: requestsMatch ? "Request count matches the records" : "The request count is behind the records", detail: `${f(o.record.requests)} in the rollup, ${f(o.source.requests)} public requests.` },
    { ok: q.length === 0, title: q.length ? `${q.length} ${q.length === 1 ? "city waits" : "cities wait"} for a map refresh` : "Map refresh queue is empty", detail: q.length ? `${q.slice(0, 4).map((x) => x.city).join(", ")}${q.length > 4 ? "…" : ""} · queued ${age(q[0].requested_at)}. The scheduled refresh drains it; refresh now to see changes immediately.` : "Every change has reached the map.",
      act: q.length || !animalsMatch || !requestsMatch ? <button type="button" className="btn is-s is-ink" disabled={r === "pending"} onClick={refresh}><RefreshCw size={14} aria-hidden /> Refresh the map</button> : undefined },
    { ok: mapAge < 26, title: "Map index", detail: o.pipeline.mapBuiltAt ? `Built ${age(o.pipeline.mapBuiltAt)}.` : "Never built: the map reads live, which is slower." },
    { ok: stuck.length === 0, title: stuck.length ? `${stuck.length} NGO ${stuck.length === 1 ? "import has" : "imports have"} not finished` : "No unfinished imports", detail: stuck.length ? stuck.map((b) => `${b.org}: ${b.file ?? "a workbook"} (${b.status}, ${f(b.imported)} of ${f(b.total)} rows, started ${age(b.created_at)})`).join(" · ") + ". The team can open the same file again; it carries on where it stopped." : open.length ? `${open.length} running now.` : "Every import closed with a receipt." },
    { ok: noCity.length === 0, title: noCity.length ? `${noCity.length} ${noCity.length === 1 ? "organisation has" : "organisations have"} no home city` : "Every organisation has a home city", detail: noCity.length ? `${noCity.map((x) => x.name).join(", ")}. Without one, their imports need a City column and their map has nowhere to open.` : "Imports and maps can place their animals.",
      act: noCity.length ? <button type="button" className="btn is-s" onClick={() => onGo("orgs")}>Set cities</button> : undefined },
  ];

  return (
    <section className="op-sec" aria-labelledby="op-health-h">
      <h2 id="op-health-h" className="op-h2">Data health</h2>
      <ul className="op-checks">
        {rows.map((x) => (
          <li key={x.title} className={x.ok ? "is-ok" : "is-warn"}>
            <i aria-hidden>{x.ok ? <Check size={14} /> : <AlertTriangle size={14} />}</i>
            <div><b>{x.title}</b><p>{x.detail}</p>{x.act}</div>
          </li>
        ))}
      </ul>
      <ReceiptLine r={r} />
      {o.pipeline.imports.length > 0 && (
        <details className="op-imports">
          <summary>Recent NGO imports</summary>
          <ul>{o.pipeline.imports.map((b) => <li key={b.id}><span><b>{b.org}</b> · {b.file ?? "workbook"}</span><small>{b.status} · {f(b.imported)} of {f(b.total)} rows{b.held ? ` · ${f(b.held)} held` : ""} · {age(b.completed_at ?? b.created_at)}</small></li>)}</ul>
        </details>
      )}
    </section>
  );
}

/* ── the last seven days ──────────────────────────────────────────── */
function Week({ o, onGo }: { o: Overview; onGo: (id: SectionId) => void }) {
  return (
    <section className="op-sec" aria-labelledby="op-week-h">
      <h2 id="op-week-h" className="op-h2">Last seven days</h2>
      <dl className="op-figs is-small">
        <div><dt>New animal records</dt><dd>{f(o.week.animals)}</dd></div>
        <div><dt>New requests</dt><dd>{f(o.week.requests)}</dd></div>
        <div><dt>Community sightings</dt><dd>{f(o.week.sightings)}</dd></div>
        <div><dt>Live sightings</dt><dd>{f(o.source.liveSightings)}</dd></div>
      </dl>
      <p className="op-note">Last community sighting {o.last.sighting ? age(o.last.sighting) : "never"} · last request {o.last.request ? age(o.last.request) : "never"}.</p>
      <button type="button" className="btn is-s" onClick={() => onGo("arrivals")}>See everything that came in <ArrowRight size={14} aria-hidden /></button>
    </section>
  );
}
