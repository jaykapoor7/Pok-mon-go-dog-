"use client";

/* Trust console · "Can you help?" sign-ups: volunteers and NGO enquiries. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { animalTag } from "@/lib/animal-name";
import { day, since } from "../../ui";
import { send } from "./api";
import { Contact, Filters, Inspector, Line, lower, NoneMatch, Pane, ReceiptLine, Search, Table, useReceipt, type Col } from "./parts";
import type { P } from "./Queues";
import type { Helper } from "./types";

export function Helpers({ secret, read, reload, empty, kind, orgs = [] }: P<Helper[]> & { kind: "volunteer" | "ngo"; orgs?: { id: string; name: string }[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const [r, setR] = useReceipt();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"waiting" | "done" | "all">("waiting");
  const rows = useMemo(() => read?.data ?? [], [read]);
  const name = (h: Helper) => (kind === "ngo" && h.ngo_name ? h.ngo_name : h.name);
  const shown = rows.filter((h) => (f === "all" || (f === "waiting" ? !h.acknowledged : h.acknowledged)) && (!q || `${lower(h.name)} ${lower(h.ngo_name)} ${lower(h.contact)} ${lower(h.zone)} ${lower(h.message)}`.includes(q.toLowerCase())));
  const cur = rows.find((h) => h.id === sel) ?? null;

  async function toggle() {
    if (!cur) return;
    const next = !cur.acknowledged;
    setR("pending");
    const a = await send(secret, `helper:${cur.id}`, "/api/admin/helpers", { json: { action: next ? "acknowledge" : "unacknowledge", id: cur.id } }, next ? `${name(cur)} marked as reached out to` : `${name(cur)} marked as not yet reached`);
    setR(a);
    if (a.ok) await reload();
  }

  const [to, setTo] = useState("");
  /* Route a general sign-up to one organisation: the only way an organisation sees a
     volunteer who did not offer to help one of its own animals. */
  async function route(ngoId: string | null) {
    if (!cur) return;
    setR("pending");
    const org = orgs.find((o) => o.id === ngoId)?.name;
    const a = await send(secret, `route:${cur.id}`, "/api/admin/helpers", { json: { action: "route", id: cur.id, ngoId } }, ngoId ? `${name(cur)} routed to ${org ?? "the organisation"}` : `${name(cur)} is with operators only again`);
    setR(a);
    if (a.ok) await reload();
  }

  const cols: Col<Helper>[] = [
    { key: "name", head: kind === "ngo" ? "Organisation" : "Name", primary: true, cell: name },
    ...(kind === "ngo" ? [{ key: "person", head: "Contact person", cell: (h: Helper) => h.name }] : []),
    { key: "contact", head: "Contact", cell: (h) => <Contact value={h.contact} /> },
    { key: "place", head: "Place", cell: (h) => h.zone ?? <span className="cn-unk">Not given</span> },
    { key: "dog", head: "For an animal", cell: (h) => (h.dog_id ? animalTag({ id: h.dog_id }) : "—") },
    { key: "when", head: "Signed up", className: "mono", cell: (h) => since(h.created_at) },
    { key: "ack", head: "Reached out", cell: (h) => (h.acknowledged ? <span className="pill is-care">Yes</span> : <span className="pill is-caution">Not yet</span>) },
  ];
  const label = kind === "ngo" ? "NGO enquiries" : "Volunteers";

  return (
    <Pane receipt={r} idle={`Choose a ${kind === "ngo" ? "enquiry" : "volunteer"} to read their message and mark them reached out to.`}
      tools={<>
        <Search value={q} onChange={setQ} placeholder="Search name, contact, place, message" />
        <Filters label="Filter by follow-up" value={f} onChange={(k) => { setF(k); setSel(null); }} options={[{ key: "waiting", label: "Not yet reached", n: rows.filter((h) => !h.acknowledged).length }, { key: "done", label: "Reached out", n: rows.filter((h) => h.acknowledged).length }, { key: "all", label: "All", n: rows.length }]} />
      </>}
      inspector={cur && (
        <Inspector kicker={kind === "ngo" ? "NGO enquiry" : "Volunteer"} title={name(cur)} onClose={() => setSel(null)}>
          <dl className="ledger">
            {kind === "ngo" && cur.ngo_name && <Line k="Person">{cur.name}</Line>}
            <Line k="Contact"><Contact value={cur.contact} /></Line>
            <Line k="Place">{cur.zone ?? <span className="cn-unk">Not given</span>}</Line>
            <Line k="Signed up">{day(cur.created_at)} · {since(cur.created_at)}</Line>
            {cur.dog_id && <Line k="Offered for"><Link className="link" href={`/animal/${cur.dog_id}`} target="_blank">{animalTag({ id: cur.dog_id })}</Link></Line>}
            <Line k="Reached out">{cur.acknowledged ? "Yes" : "Not yet"}</Line>
            {kind === "volunteer" && <Line k="Visible to">{cur.routed_ngo_id ? (orgs.find((o) => o.id === cur.routed_ngo_id)?.name ?? "One organisation") : cur.dog_id ? "The organisation that keeps this animal" : "Operators only"}</Line>}
          </dl>
          {cur.message && <blockquote className="tr-notes">{cur.message}</blockquote>}
          <div className="cn-do"><button type="button" className={`btn is-s${cur.acknowledged ? "" : " is-ink"}`} disabled={r === "pending"} onClick={toggle}>{cur.acknowledged ? "Undo: not yet reached" : "Mark reached out"}</button></div>
          {kind === "volunteer" && (
            <div className="cn-do">
              <label className="field"><span>Share with one organisation</span>
                <select className="input cn-select" value={to} onChange={(e) => setTo(e.target.value)} disabled={!orgs.length}>
                  <option value="">{orgs.length ? "Choose an organisation" : "Read Organisations first"}</option>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
              <div className="row" style={{ ["--g" as string]: "8px" }}>
                <button type="button" className="btn is-s is-ink" disabled={!to || r === "pending"} onClick={() => void route(to)}>Share</button>
                {cur.routed_ngo_id && <button type="button" className="btn is-s" disabled={r === "pending"} onClick={() => void route(null)}>Stop sharing</button>}
              </div>
              <p className="small">The organisation then sees this person&rsquo;s name and contact in its Volunteers page. Nobody else does.</p>
            </div>
          )}
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setF("all"); setQ(""); }} /> : null}
      {shown.length > 0 && <Table label={`${label} table`} rows={shown} cols={cols} selected={sel} onSelect={setSel} rowClass={(h) => (h.acknowledged ? "is-quiet" : undefined)} />}
    </Pane>
  );
}
