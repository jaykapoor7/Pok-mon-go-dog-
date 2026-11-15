"use client";

/* Organisations (/community/organisations): who keeps the record. A
   ledger, not a logo wall: each organisation's kind (field partner,
   listed NGO or data source), where it works, and what its public record
   holds, in units. Being listed is not an endorsement or a rating. */

import { useState } from "react";
import type { DirectoryOrg } from "@/lib/partners";
import type { OrgImpact } from "@/lib/org-public";
import { Body, Empty, Head, Lanes, SearchBox, Table, Tools, type Col } from "../kit";

const f = (n: number) => n.toLocaleString("en-IN");
type Kind = DirectoryOrg["kind"] | "all";
const KINDS = ["Field partner", "Listed NGO", "Data source"] as const;

export function Organisations({ orgs, impacts }: { orgs: DirectoryOrg[]; impacts: Record<string, OrgImpact> | null }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const t = q.trim().toLowerCase();
  const found = orgs.filter((o) => !t || `${o.name} ${o.city ?? ""} ${o.state ?? ""} ${o.mission ?? ""}`.toLowerCase().includes(t));
  /* Field partners lead, then listed NGOs, then data sources; within a kind, the fullest public record first. */
  const rows = found.filter((o) => kind === "all" || o.kind === kind)
    .sort((x, y) => KINDS.indexOf(x.kind) - KINDS.indexOf(y.kind) || (impacts?.[y.id]?.animalsRecorded ?? 0) - (impacts?.[x.id]?.animalsRecorded ?? 0));
  const records = (o: DirectoryOrg) => {
    if (!impacts) return <span className="pb-unknown">Not read just now</span>;
    const im = impacts[o.id];
    const figs = im ? ([[im.animalsRecorded, "animal profiles"], [im.caseRecords, "requests"], [im.sterilised, "sterilised"]] as const).filter(([n]) => n > 0) : [];
    return figs.length ? figs.map(([n, l]) => `${f(n)} ${l}`).join(" · ") : <span className="pb-unknown">No public records yet</span>;
  };
  const kinds = KINDS.filter((k) => orgs.some((o) => o.kind === k));
  const cols: Col<DirectoryOrg>[] = [
    { key: "name", label: "Organisation", render: (o) => o.name },
    { key: "city", label: "City", render: (o) => [o.city, o.state].filter(Boolean).join(", ") || <span className="pb-unknown">Place not published</span> },
    { key: "what", label: "What they do", className: "pb-clip", render: (o) => o.mission ?? <span className="pb-unknown">Not published</span> },
    { key: "kind", label: "Kind", render: (o) => o.kind },
    { key: "rec", label: "Records published", render: records },
  ];
  return (
    <>
      <Head title="Organisations"
        sum={!orgs.length ? "The directory could not be read just now." : <><b>{orgs.length}</b> organisations whose work is on StrayPaw. Being listed is not an endorsement or a rating.</>} />
      <Body>
        <Tools end={<SearchBox value={q} onChange={setQ} placeholder="Name, city or work" label="Search organisations" />}>
          {kinds.length > 1 ? <Lanes<Kind> label="Kind of organisation" value={kind} onChange={setKind} lanes={[{ id: "all", label: "All", count: found.length }, ...kinds.map((k) => ({ id: k as Kind, label: `${k}s`, count: found.filter((o) => o.kind === k).length }))]} /> : null}
        </Tools>
        <Table label="Organisations" cols={cols} rows={rows} rowKey={(o) => o.id} href={(o) => `/community/organisations/${o.slug}`}
          empty={!orgs.length ? <Empty alert title="Not read">The directory could not be read just now. That is not the same as there being no organisations; reload to try again.</Empty> : <Empty title="No organisation matches">Try a different name or city. That says what has been listed, not who is working.</Empty>} />
        <p className="pb-fine">{impacts ? "Figures are each organisation’s public record: animal profiles, requests and recorded sterilisations are different units and are not added together." : "Figures are unavailable just now: not read, not zero."}</p>
      </Body>
    </>
  );
}
