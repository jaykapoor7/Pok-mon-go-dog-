"use client";

/* Trust console · organisations and who can get in.

   Creating one, giving its team lead a six-character code (emailed, and
   shown here because an email that never lands is the usual failure),
   every code it holds including the ones its own lead cut, turning a code
   off, taking someone's access away, and removing the organisation. */

import { useMemo, useState } from "react";
import { n, since } from "../../ui";
import { send } from "./api";
import { Confirm, Filters, Inspector, Line, lower, NoneMatch, Pane, ReceiptLine, Search, Table, useReceipt, type Col } from "./parts";
import type { P } from "./Queues";
import type { Org } from "./types";

export function Orgs({ secret, read, reload, empty }: P<Org[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "active" | "retired">("all");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [minted, setMinted] = useState<{ code: string; email: string; org: string } | null>(null);
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((o) => (f === "all" || (f === "active" ? o.verified : !o.verified)) && (!q || `${lower(o.name)} ${lower(o.city)} ${(o.invites ?? []).map((i) => `${lower(i.email)} ${lower(i.name)}`).join(" ")}`.includes(q.toLowerCase())));
  const cur = rows.find((o) => o.id === sel) ?? null;
  const busy = r === "pending";

  async function post<T>(key: string, json: object, what: string | ((b: T) => string)) {
    setR("pending");
    const a = await send<T>(secret, key, "/api/admin/orgs", { json }, what);
    setR(a);
    if (a.ok) await reload();
    return a;
  }
  async function create() {
    const a = await post("org:create", { action: "create", name: name.trim(), city: city.trim() }, `${name.trim()} created as a verified organisation`);
    if (a.ok) { setName(""); setCity(""); setCreating(false); }
  }
  async function invite(role: "lead" | "member") {
    if (!cur) return;
    setMinted(null);
    const who = person.trim();
    const a = await post<{ code?: string; emailed?: boolean }>(`org:invite:${cur.id}`, { action: "invite", ngoId: cur.id, email: email.trim(), personName: who, role },
      (b) => `${who} added as ${role === "lead" ? "team lead" : "member"}. ${b.emailed ? `The code was emailed to ${email.trim()}.` : "No email was sent (the mail service is not configured), so pass the code on yourself."}`);
    if (a.ok) { if (a.body.code) setMinted({ code: a.body.code, email: email.trim(), org: cur.id }); setPerson(""); setEmail(""); }
  }

  const cols: Col<Org>[] = [
    { key: "name", head: "Organisation", primary: true, cell: (o) => o.name },
    { key: "city", head: "City", cell: (o) => o.city ?? <span className="cn-unk">Not given</span> },
    { key: "state", head: "Status", cell: (o) => (o.verified ? <span className="pill is-care">Verified</span> : <span className="pill is-plain">Retired</span>) },
    { key: "people", head: "With access", className: "mono", cell: (o) => n(o.members) },
    { key: "animals", head: "Animals", className: "mono", cell: (o) => n(o.animals) },
    { key: "codes", head: "Volunteer codes on", className: "mono", cell: (o) => n(o.active_codes) },
  ];

  const inspector = creating ? (
    <Inspector kicker="Organisations" title="New organisation" onClose={() => setCreating(false)}>
      <p className="small">Created as verified, ready for you to give someone access.</p>
      <label className="field"><span className="label">Organisation name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
      <label className="field"><span className="label">City <span className="small">(optional)</span></span><input className="input" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" /></label>
      <div className="cn-do"><button type="button" className="btn is-s is-ink" disabled={busy || name.trim().length < 2} onClick={create}>Create</button><button type="button" className="btn is-s" onClick={() => setCreating(false)}>Cancel</button></div>
      <ReceiptLine r={r} />
    </Inspector>
  ) : cur && (
    <Inspector kicker={cur.verified ? "Organisation" : "Organisation · retired"} title={cur.name} onClose={() => { setSel(null); setMinted(null); }}>
      <dl className="ledger">
        <Line k="City">{cur.city ?? <span className="cn-unk">Not given</span>}</Line>
        <Line k="Holds">{n(cur.members)} with access · {n(cur.animals)} animals · {n(cur.active_codes)} volunteer code{cur.active_codes === 1 ? "" : "s"} on</Line>
      </dl>

      {minted && minted.org === cur.id && (
        <div className="cn-code" role="status">
          <p className="k">Code for {minted.email}</p>
          <p className="mono cn-code-big">{minted.code}</p>
          <p className="small">They enter it at straypaw.org/join. It is how they sign in every time, until it is turned off.</p>
        </div>
      )}

      <h4 className="cn-h">Dashboard access</h4>
      {cur.invites === undefined ? <p className="small cn-unk">Not returned by the server (the access-code migration may not have run).</p> : !cur.invites.length ? <p className="small">Nobody has been given access yet.</p> : (
        <ul className="cn-people">
          {cur.invites.map((i) => (
            <li key={i.id ?? i.email}>
              <div className="cn-people-who">
                <b>{i.name ?? i.email}</b>{i.name && <span className="small">{i.email}</span>}
                <span className="k">{i.role}{i.by_org ? " · added by the organisation" : ""}</span>
              </div>
              <div className="cn-people-state">
                {i.code && <code className="mono cn-chipcode">{i.code}</code>}
                <span className="small">{i.revoked ? "Removed" : i.accepted ? `Signed in${i.uses > 1 ? ` ${i.uses}×` : ""}${i.last_used_at ? ` · last ${since(i.last_used_at)}` : ""}` : "Not signed in yet"}</span>
                {!i.revoked && <button type="button" className="btn is-xs" disabled={busy} onClick={() => post(`org:rm:${cur.id}:${i.email}`, { action: "remove", ngoId: cur.id, email: i.email }, `${i.email} no longer has access to ${cur.name}`)}>Remove access</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h4 className="cn-h">Volunteer reporting codes</h4>
      {cur.volunteer_codes === undefined ? <p className="small cn-unk">Not returned by the server.</p> : !cur.volunteer_codes.length ? <p className="small">No volunteer codes.</p> : (
        <ul className="cn-people">
          {cur.volunteer_codes.map((c) => (
            <li key={c.id} className={c.active ? undefined : "is-quiet"}>
              <div className="cn-people-who"><b>{c.name ?? "Unnamed code"}</b>{c.email && <span className="small">{c.email}</span>}</div>
              <div className="cn-people-state">
                <code className="mono cn-chipcode">{c.code}</code>
                <span className="small">{n(c.reports)} report{c.reports === 1 ? "" : "s"}{c.active ? "" : " · turned off"}</span>
                {c.active && <button type="button" className="btn is-xs" disabled={busy} onClick={() => post(`org:revoke:${c.id}`, { action: "revokeCode", id: c.id }, `Code ${c.code} turned off`)}>Turn off</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h4 className="cn-h">Give someone access</h4>
      <label className="field"><span className="label">Their full name</span><input className="input" value={person} onChange={(e) => setPerson(e.target.value)} autoComplete="off" /></label>
      <label className="field"><span className="label">Their email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="name@organisation.org" /></label>
      <div className="cn-do">
        <button type="button" className="btn is-s is-ink" disabled={busy || !person.trim() || !email.trim()} onClick={() => invite("lead")}>Make team lead</button>
        <button type="button" className="btn is-s" disabled={busy || !person.trim() || !email.trim()} onClick={() => invite("member")}>Add as member</button>
      </div>
      <p className="small">A team lead adds the rest of their own team, so this is normally done once per organisation. Every code stays listed above, including the ones they issue.</p>

      <h4 className="cn-h">Remove</h4>
      <Confirm label="Delete organisation" busy={busy} onConfirm={async () => { const a = await post<{ message?: string }>(`org:retire:${cur.id}`, { action: "retire", ngoId: cur.id }, (b) => b.message ?? `${cur.name} removed`); if (a.ok) setSel(null); }}
        confirm={`Delete ${cur.name}? Everyone loses access. Animals, cases and documents it recorded are kept but will belong to nobody. This cannot be undone here.`} />
      <ReceiptLine r={r} />
    </Inspector>
  );

  return (
    <Pane receipt={r} idle="Choose an organisation to see who can get in, issue a code or remove access."
      tools={<>
        <Search value={q} onChange={setQ} placeholder="Search name, city, person, email" />
        <Filters label="Filter by status" value={f} onChange={setF} options={[{ key: "all", label: "All", n: rows.length }, { key: "active", label: "Verified", n: rows.filter((o) => o.verified).length }, { key: "retired", label: "Retired", n: rows.filter((o) => !o.verified).length }]} />
        <button type="button" className="btn is-s is-ink" onClick={() => { setSel(null); setCreating(true); }}>New organisation</button>
      </>}
      inspector={inspector || null}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setQ(""); setF("all"); }} /> : null}
      {shown.length > 0 && <Table label="Organisations table" rows={shown} cols={cols} selected={sel} onSelect={(id) => { setCreating(false); setMinted(null); setSel(id); }} rowClass={(o) => (o.verified ? undefined : "is-quiet")} />}
    </Pane>
  );
}
