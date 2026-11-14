"use client";

/* ════════════════════════════════════════════════════════════════════
   Moderation · Today. The first thing an operator sees: what is waiting
   on a person (oldest first), the figures every public page prints, and
   whether the data underneath them is healthy. Every number is read
   from the server; a part that could not be read says so.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, RefreshCw } from "lucide-react";
import { since } from "../../ui";
import { get, send, type Read } from "./api";
import { ReceiptLine, useReceipt } from "./parts";
import type { Overview, SectionId } from "./types";
import { friendlyError } from "@/lib/friendly-error";

export type Need = { id: SectionId; label: string; n: number; oldest: string | null; what: string };

/* /api/admin/platform: the platform as it is now. */
type Partner = { id: string; name: string; kind: string; city: string | null; sample: boolean; people: number; invites: number; week: number; month: number; last: string | null };
type Platform = {
  live: { production: { sha: string; environment: string }; demo: { up: boolean; sha: string | null; database: string | null; ms: number | null }; kaju: "model" | "tools_only"; automations: { state: "ready" | "awaiting_database" | "unread"; on: number } };
  partners: Partner[];
  connected: { sent: number; answered: number; overdue: number; samplesSent: number; resulted: number; waitingAtLab: number };
  site: { views: number; visitors: number; logins: number; pages: { path: string; n: number }[]; capped: boolean };
  unread: string[];
};
const KIND: Record<string, string> = { ngo: "NGO", hospital: "Hospital", clinic: "Clinic", laboratory: "Laboratory", coordinator: "Programme", municipal: "Municipal office", state: "State", research: "Research", training: "Training" };

const f = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");
const age = (iso: string | null) => (iso ? since(iso) : null);
const hoursAgo = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 36e5 : Infinity);

export function Today({ secret, read, needs, onGo, reload }: { secret: string; read: Read<Overview> | undefined; needs: Need[]; onGo: (id: SectionId) => void; reload: () => Promise<void> }) {
  const waiting = needs.filter((x) => x.n > 0).sort((a, b) => (a.oldest ?? "9").localeCompare(b.oldest ?? "9"));
  const total = waiting.reduce((s, x) => s + x.n, 0);
  const o = read && "data" in read ? read.data : undefined;
  const [pf, setPf] = useState<Read<Platform> | undefined>();
  const readPf = useCallback(async () => { setPf((x) => ({ state: "reading", data: x && "data" in x ? x.data : undefined })); setPf(await get<Platform>(secret, "/api/admin/platform", (b) => b as unknown as Platform)); }, [secret]);
  useEffect(() => { void readPf(); }, [readPf, read]);
  const p = pf && "data" in pf ? pf.data : undefined;

  return (
    <div className="op">
      {pf?.state === "failed" && !p ? <p className="op-err" role="alert"><AlertTriangle size={16} aria-hidden /> The platform could not be read. {friendlyError(pf.error)}</p>
        : !p ? <div className="cn-reading" role="status" aria-label="Reading the platform"><span className="skel" /></div>
        : <Live p={p} />}

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
        <p className="op-err" role="alert"><AlertTriangle size={16} aria-hidden /> The overview could not be read. {friendlyError(read.error)} The queues on the left were read separately.</p>
      ) : !o ? (
        <div className="cn-reading" role="status" aria-label="Reading the overview"><span className="skel" /><span className="skel" /><span className="skel" /></div>
      ) : (
        <>
          {p ? <><Partners p={p} onGo={onGo} /><Connected p={p} /><Site p={p} /></> : null}
          <Health o={o} secret={secret} reload={reload} onGo={onGo} />
          <details className="op-more">
            <summary>Public record and the last seven days</summary>
            <Record o={o} />
            <Week o={o} onGo={onGo} />
          </details>
        </>
      )}
    </div>
  );
}

/* ── is it up ──────────────────────────────────────────────────────── */
function Live({ p }: { p: Platform }) {
  const { production: pr, demo, kaju, automations: au } = p.live;
  const same = !!demo.sha && demo.sha === pr.sha;
  const tiles: { ok: boolean; k: string; v: string; s: string }[] = [
    { ok: true, k: "Production", v: "Up", s: `build ${pr.sha.slice(0, 7)}` },
    { ok: demo.up && demo.database === "ok", k: "Demo site", v: !demo.up ? "Down" : demo.database === "ok" ? "Up" : "Database not answering", s: demo.sha ? (same ? "same build as production" : `build ${demo.sha.slice(0, 7)}`) : "no answer" },
    { ok: kaju === "model", k: "Kaju", v: kaju === "model" ? "Model on" : "Without a model", s: kaju === "model" ? "answers with the paid model" : "answers from records only" },
    { ok: au.state === "ready", k: "Automations", v: au.state === "ready" ? `${au.on} on` : au.state === "awaiting_database" ? "Not switched on" : "Not read", s: au.state === "awaiting_database" ? "needs the database change" : au.state === "ready" ? "run daily" : "" },
  ];
  return (
    <section className="op-live" aria-label="Is it up">
      {tiles.map((t) => <div key={t.k} className={t.ok ? "is-ok" : "is-warn"}><i aria-hidden /><span>{t.k}</span><b>{t.v}</b><small>{t.s}</small></div>)}
    </section>
  );
}

/* ── who is on StrayPaw, and are they using it ─────────────────────── */
const state = (x: Partner) => (x.week ? { t: "Active this week", c: "is-ok" } : x.month ? { t: "Quiet", c: "is-warn" } : { t: x.people ? "Not started" : "No one joined", c: "is-off" });
function Partners({ p, onGo }: { p: Platform; onGo: (id: SectionId) => void }) {
  const real = p.partners.filter((x) => !x.sample), sample = p.partners.filter((x) => x.sample);
  const active = real.filter((x) => x.week).length;
  const row = (x: Partner) => { const s = state(x); return (
    <tr key={`${x.kind}:${x.id}`}>
      <th scope="row"><b>{x.name}</b><small>{KIND[x.kind] ?? x.kind}{x.city ? ` · ${x.city}` : ""}</small></th>
      <td><span className={`op-pill ${s.c}`}>{s.t}</span></td>
      <td>{x.people}{x.invites ? <small> +{x.invites} invited</small> : null}</td>
      <td>{x.week || "—"}</td>
      <td>{x.last ? since(x.last) : "never"}</td>
    </tr>); };
  const table = (xs: Partner[], label: string) => (
    <table className="op-orgs"><caption className="sr">{label}</caption>
      <thead><tr><th scope="col">Organisation</th><th scope="col">Status</th><th scope="col">People</th><th scope="col">This week</th><th scope="col">Last work</th></tr></thead>
      <tbody>{xs.map(row)}</tbody></table>);
  return (
    <section className="op-sec" aria-labelledby="op-org-h">
      <div className="op-row"><h2 id="op-org-h" className="op-h2">Partners</h2><button type="button" className="btn is-s" onClick={() => onGo("orgs")}>Manage <ArrowRight size={14} aria-hidden /></button></div>
      <p className="op-sub">{real.length ? <><b>{active}</b> of {real.length} working this week.</> : "No partner has a workspace yet."}</p>
      {real.length ? table(real, "Partner organisations") : null}
      {sample.length ? <details className="op-more is-inner"><summary>{sample.length} sample organisations (demo data)</summary>{table(sample, "Sample organisations")}</details> : null}
    </section>
  );
}

/* ── work passed between organisations ─────────────────────────────── */
function Connected({ p }: { p: Platform }) {
  const c = p.connected;
  return (
    <section className="op-sec" aria-labelledby="op-con-h">
      <h2 id="op-con-h" className="op-h2">Between organisations · 7 days</h2>
      <dl className="op-figs is-small is-6">
        <div><dt>Requests sent</dt><dd>{f(c.sent)}</dd></div>
        <div><dt>Answered</dt><dd>{f(c.answered)}</dd></div>
        <div className={c.overdue ? "is-hot" : undefined}><dt>Overdue now</dt><dd>{f(c.overdue)}</dd></div>
        <div><dt>Samples sent</dt><dd>{f(c.samplesSent)}</dd></div>
        <div><dt>Results reported</dt><dd>{f(c.resulted)}</dd></div>
        <div><dt>At the laboratory</dt><dd>{f(c.waitingAtLab)}</dd></div>
      </dl>
    </section>
  );
}

/* ── the public site ───────────────────────────────────────────────── */
function Site({ p }: { p: Platform }) {
  const s = p.site, top = Math.max(1, ...s.pages.map((x) => x.n));
  return (
    <section className="op-sec" aria-labelledby="op-site-h">
      <h2 id="op-site-h" className="op-h2">straypaw.org · 7 days</h2>
      <dl className="op-figs is-small">
        <div><dt>Visitors</dt><dd>{f(s.visitors)}</dd></div>
        <div><dt>Pages opened</dt><dd>{f(s.views)}{s.capped ? "+" : ""}</dd></div>
        <div><dt>Sign-ins</dt><dd>{f(s.logins)}</dd></div>
      </dl>
      {s.pages.length ? <ul className="op-bars" aria-label="Most opened">{s.pages.map((x) => <li key={x.path}><span>{x.path === "/" ? "Home" : x.path}</span><i style={{ ["--v" as string]: `${(x.n / top) * 100}%` }} aria-hidden /><b>{f(x.n)}</b></li>)}</ul> : null}
      <p className="op-note">Visitors who opted out of counting are not included. Demo site visits are counted on the demo, not here.</p>
    </section>
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

  const bad = rows.filter((x) => !x.ok);
  const list = (xs: typeof rows) => (
      <ul className="op-checks">
        {xs.map((x) => (
          <li key={x.title} className={x.ok ? "is-ok" : "is-warn"}>
            <i aria-hidden>{x.ok ? <Check size={14} /> : <AlertTriangle size={14} />}</i>
            <div><b>{x.title}</b><p>{x.detail}</p>{x.act}</div>
          </li>
        ))}
      </ul>);
  return (
    <section className="op-sec" aria-labelledby="op-health-h">
      <h2 id="op-health-h" className="op-h2">Data health</h2>
      {bad.length ? list(bad) : <p className="op-calm"><Check size={16} aria-hidden /> All {rows.length} checks pass.</p>}
      {bad.length && bad.length < rows.length ? <details className="op-more is-inner"><summary>{rows.length - bad.length} passing</summary>{list(rows.filter((x) => x.ok))}</details> : null}
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
