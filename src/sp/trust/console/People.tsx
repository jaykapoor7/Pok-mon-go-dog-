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

export function Helpers({ secret, read, reload, empty, kind }: P<Helper[]> & { kind: "volunteer" | "ngo" }) {
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
          </dl>
          {cur.message && <blockquote className="tr-notes">{cur.message}</blockquote>}
          <div className="cn-do"><button type="button" className={`btn is-s${cur.acknowledged ? "" : " is-ink"}`} disabled={r === "pending"} onClick={toggle}>{cur.acknowledged ? "Undo: not yet reached" : "Mark reached out"}</button></div>
          <ReceiptLine r={r} />
        </Inspector>
      )}>
      {!rows.length && empty}
      {rows.length > 0 && !shown.length ? <NoneMatch onClear={() => { setF("all"); setQ(""); }} /> : null}
      {shown.length > 0 && <Table label={`${label} table`} rows={shown} cols={cols} selected={sel} onSelect={setSel} rowClass={(h) => (h.acknowledged ? "is-quiet" : undefined)} />}
    </Pane>
  );
}
