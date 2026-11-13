"use client";

/* ════════════════════════════════════════════════════════════════════
   Community · Organisations: who keeps the record. A ledger, not a logo
   wall: each organisation's kind (field partner, listed NGO or data
   source), where it works, and what its public record holds, in units.
   An organisation being listed is not an endorsement or a rating.
   ════════════════════════════════════════════════════════════════════ */

import type { DirectoryOrg } from "@/lib/partners";
import type { OrgImpact } from "@/lib/org-public";
import { Empty, Head, Lanes, Page, Panel, SearchBox, Table, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import "./more.css";

const f = (n: number) => n.toLocaleString("en-IN");
type Kind = DirectoryOrg["kind"] | "all";
const KINDS = ["Field partner", "Listed NGO", "Data source"] as const;

export function Organisations({ orgs, impacts }: { orgs: DirectoryOrg[]; impacts: Map<string, OrgImpact> | null }) {
  const [q, setQ] = usePageState("q", "");
  const [kind, setKind] = usePageState<Kind>("kind", "all");
  const t = q.trim().toLowerCase();
  const found = orgs.filter((o) => !t || `${o.name} ${o.city ?? ""} ${o.state ?? ""} ${o.mission ?? ""}`.toLowerCase().includes(t));
  /* Field partners lead, then listed NGOs, then data sources; within a kind, the fullest public record first. */
  const rows = found.filter((o) => kind === "all" || o.kind === kind)
    .sort((x, y) => KINDS.indexOf(x.kind) - KINDS.indexOf(y.kind) || (impacts?.get(y.id)?.animalsRecorded ?? 0) - (impacts?.get(x.id)?.animalsRecorded ?? 0));
  const records = (o: DirectoryOrg) => {
    if (!impacts) return "Not read just now";
    const im = impacts.get(o.id);
    const figs = im ? ([[im.animalsRecorded, "animal profiles"], [im.caseRecords, "requests"], [im.sterilised, "sterilised"]] as const).filter(([n]) => n > 0) : [];
    return figs.length ? figs.map(([n, l]) => `${f(n)} ${l}`).join(" · ") : "No public records yet";
  };
  const cols: Col<DirectoryOrg>[] = [
    { key: "name", label: "Organisation", width: "minmax(0, 1.6fr)", render: (o) => o.name },
    { key: "city", label: "City", width: "minmax(0, 1fr)", render: (o) => [o.city, o.state].filter(Boolean).join(", ") || "Place not published" },
    { key: "what", label: "What they do", width: "minmax(0, 2fr)", render: (o) => <span title={o.mission ?? undefined}>{o.mission ?? o.kind}</span> },
    { key: "kind", label: "Kind", width: "112px", render: (o) => o.kind },
    { key: "rec", label: "Records published", width: "minmax(0, 1.6fr)", render: (o) => records(o) },
  ];
  return (
    <Page>
      <Head title="Organisations"
        sum={!orgs.length ? "The directory could not be read just now." : <><b>{orgs.length}</b> organisations whose work is on StrayPaw. Being listed is not an endorsement or a rating.</>} />
      <Tools end={<SearchBox value={q} onChange={setQ} placeholder="Name, city or work" label="Search organisations" />}>
        <Lanes<Kind> label="Kind of organisation" value={kind} onChange={setKind} lanes={[{ id: "all", label: "All", count: found.length }, ...KINDS.filter((k) => orgs.some((o) => o.kind === k)).map((k) => ({ id: k as Kind, label: `${k}s`, count: found.filter((o) => o.kind === k).length }))]} />
      </Tools>
      <Panel>
        <Table label="Organisations" cols={cols} rows={rows} rowKey={(o) => o.id} href={(o) => `/community/organisations/${o.slug}`}
          empty={!orgs.length ? <div role="alert"><Empty title="Didn't load">The directory could not be read just now.</Empty></div> : <Empty title="No organisation matches">Try a different name or city. That says what has been listed, not who is working.</Empty>} />
      </Panel>
      <p className="cmo-fine">{impacts ? "Figures are each organisation's public record: animal profiles, requests and recorded sterilisations are different units and are not added together." : "Figures are unavailable just now: not read, not zero."}</p>
    </Page>
  );
}
