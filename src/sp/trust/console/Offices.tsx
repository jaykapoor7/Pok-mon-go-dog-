"use client";

/* Trust console · reviewing offices (the government side of ABC reporting).

   Create an office, correct its name, and choose who reviews for it. A
   reviewer sees a report package only after an organisation submits it to
   their office; the database enforces that and every other rule. Someone
   is added by the email of an account that already exists, so access never
   goes to an address nobody has signed in with. */

import { useMemo, useState } from "react";
import { n, since } from "../../ui";
import { send } from "./api";
import { Confirm, Inspector, Line, lower, NoneMatch, Pane, ReceiptLine, Search, Table, useReceipt, type Col } from "./parts";
import type { P } from "./Queues";
import type { Office } from "./types";

export function Offices({ secret, read, reload, empty }: P<Office[]>) {
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const shown = rows.filter((o) => !q || `${lower(o.name)} ${lower(o.city)} ${o.reviewers.map((p) => `${lower(p.email)} ${lower(p.name)}`).join(" ")}`.includes(q.toLowerCase()));
  const cur = rows.find((o) => o.id === sel) ?? null;
  const busy = r === "pending";

  async function post(key: string, json: object, what: string) {
    setR("pending");
    const a = await send(secret, key, "/api/admin/offices", { json }, what);
    setR(a);
    if (a.ok) await reload();
    return a;
  }

  const cols: Col<Office>[] = [
    { key: "name", head: "Reviewing office", primary: true, cell: (o) => o.name },
    { key: "city", head: "City", cell: (o) => o.city ?? <span className="cn-unk">Not given</span> },
    { key: "people", head: "Reviewers", className: "mono", cell: (o) => n(o.reviewers.length) },
    { key: "pkgs", head: "Packages received", className: "mono", cell: (o) => n(o.packages) },
  ];

  const inspector = creating ? (
    <Inspector kicker="Reviewing offices" title="New reviewing office" onClose={() => setCreating(false)}>
      <p className="small">An office that receives ABC report packages, for example the veterinary department of a municipal corporation.</p>
      <label className="field"><span className="label">Office name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="e.g. Coimbatore Corporation, Veterinary Section" /></label>
      <label className="field"><span className="label">City <span className="small">(optional)</span></span><input className="input" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" /></label>
      <div className="cn-do">
        <button type="button" className="btn is-s is-ink" disabled={busy || name.trim().length < 3} onClick={async () => { const a = await post("office:create", { action: "create", name: name.trim(), city: city.trim() }, `${name.trim()} created`); if (a.ok) { setName(""); setCity(""); setCreating(false); } }}>Create</button>
        <button type="button" className="btn is-s" onClick={() => setCreating(false)}>Cancel</button>
      </div>
      <ReceiptLine r={r} />
    </Inspector>
  ) : cur && (
    <Inspector kicker="Reviewing office" title={cur.name} onClose={() => setSel(null)}>
      <dl className="ledger">
        <Line k="City">{cur.city ?? <span className="cn-unk">Not given</span>}</Line>
        <Line k="Packages">{n(cur.packages)} received</Line>
        <Line k="Created">{since(cur.created_at)}</Line>
      </dl>

      <h4 className="cn-h">Reviewers</h4>
      {!cur.reviewers.length ? <p className="small">Nobody reviews for this office yet.</p> : (
        <ul className="cn-people">
          {cur.reviewers.map((p) => (
            <li key={p.user_id}>
              <div className="cn-people-who"><b>{p.name ?? p.email ?? "Account"}</b>{p.name && p.email && <span className="small">{p.email}</span>}</div>
              <div className="cn-people-state">
                <span className="small">Added {since(p.added_at)}</span>
                <Confirm label="Remove" busy={busy} confirm={`Remove ${p.name ?? p.email ?? "this person"} as a reviewer for ${cur.name}? They lose access to its packages at once.`}
                  onConfirm={() => void post(`office:rm:${cur.id}:${p.user_id}`, { action: "removeReviewer", officeId: cur.id, userId: p.user_id }, `${p.email ?? "Reviewer"} removed`)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="cn-edit" onSubmit={async (e) => { e.preventDefault(); const v = email.trim(); if (!v) return; const a = await post(`office:add:${cur.id}`, { action: "addReviewer", officeId: cur.id, email: v }, `${v} now reviews for ${cur.name}`); if (a.ok) setEmail(""); }}>
        <label className="field"><span className="label">Add a reviewer by email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="name@municipality.gov.in" /></label>
        <button type="submit" className="btn is-s is-ink" disabled={busy || !email.trim()}>Add reviewer</button>
      </form>
      <p className="small">They need a StrayPaw account first: ask them to sign in once at straypaw.org/sign-in.</p>

      <h4 className="cn-h">Correct the name</h4>
      <form className="cn-edit" onSubmit={(e) => { e.preventDefault(); const v = name.trim(); if (v.length >= 3) void post(`office:rename:${cur.id}`, { action: "rename", officeId: cur.id, name: v, city: city.trim() || cur.city || "" }, `Renamed to ${v}`).then((a) => { if (a.ok) { setName(""); setCity(""); } }); }}>
        <label className="field"><span className="label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={cur.name} autoComplete="off" /></label>
        <label className="field"><span className="label">City</span><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder={cur.city ?? ""} autoComplete="off" /></label>
        <button type="submit" className="btn is-s" disabled={busy || name.trim().length < 3}>Save</button>
      </form>
      <ReceiptLine r={r} />
    </Inspector>
  );

  return (
    <Pane receipt={r} idle="Choose an office to see and change who reviews for it."
      tools={<>
        <Search value={q} onChange={setQ} placeholder="Search office, city, reviewer" />
        <button type="button" className="btn is-s is-ink" onClick={() => { setSel(null); setName(""); setCity(""); setCreating(true); }}>New office</button>
      </>}
      inspector={inspector || null}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => setQ("")} /> : null}
      {shown.length > 0 && <Table label="Reviewing offices table" rows={shown} cols={cols} selected={sel} onSelect={(id) => { setCreating(false); setName(""); setCity(""); setSel(id); }} />}
    </Pane>
  );
}
