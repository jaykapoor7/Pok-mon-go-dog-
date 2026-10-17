/* ════════════════════════════════════════════════════════════════════
   Community · Organisations: who keeps the record. A ledger, not a logo
   wall: each organisation's kind (field partner, listed NGO or data
   source), where it works, and what its public record holds, in units.
   An organisation being listed is not an endorsement or a rating.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { DirectoryOrg } from "@/lib/partners";
import type { OrgImpact } from "@/lib/org-public";
import { State } from "../../ui";
import "./more.css";

const f = (n: number) => n.toLocaleString("en-IN");
const KIND_NOTE: Record<DirectoryOrg["kind"], string> = { "Field partner": "Works its cases in StrayPaw", "Listed NGO": "Has a StrayPaw workspace", "Data source": "Shared a historical register" };

export function Organisations({ orgs, impacts }: { orgs: DirectoryOrg[]; impacts: Map<string, OrgImpact> | null }) {
  const kinds = (["Field partner", "Listed NGO", "Data source"] as const).map((k) => ({ k, list: orgs.filter((o) => o.kind === k) })).filter((g) => g.list.length);
  return (
    <div className="mo">
      <header className="mo-head">
        <p className="k">Community · organisations</p>
        <h1 className="display">Who keeps the record</h1>
        <p className="lede">The organisations whose work is on StrayPaw, and what kind of record each keeps. Listing is not an endorsement, a rating or a claim that they cover a whole city.</p>
      </header>
      {!orgs.length && <State title="Not read">The directory could not be read just now.</State>}
      {kinds.map(({ k, list }) => (
        <section key={k} className="og-sec" aria-labelledby={`og-${k}`}>
          <h2 id={`og-${k}`} className="og-k serif">{k}s <small className="small">{KIND_NOTE[k]}</small></h2>
          <div className="og-table" role="table" aria-label={`${k}s`}>
            <div className="og-row is-head" role="row"><span role="columnheader">Organisation</span><span role="columnheader">Where</span><span role="columnheader">Animal profiles</span><span role="columnheader">Requests on record</span><span role="columnheader">Recorded sterilised</span></div>
            {list.map((o) => { const im = impacts?.get(o.id); return (
              <Link key={o.id} href={`/community/organisations/${o.slug}`} className="og-row" role="row">
                <span role="cell" className="og-name"><b className="serif">{o.name}</b>{o.mission && <small>{o.mission}</small>}</span>
                <span role="cell">{[o.city, o.state].filter(Boolean).join(", ") || "—"}</span>
                <span role="cell" className="mono">{im ? f(im.animalsRecorded) : "—"}</span>
                <span role="cell" className="mono">{im ? f(im.caseRecords) : "—"}</span>
                <span role="cell" className="mono">{im ? f(im.sterilised) : "—"}</span>
              </Link>
            ); })}
          </div>
        </section>
      ))}
      <p className="small mo-foot">{impacts ? "Figures are each organisation's public record: animal profiles, requests and recorded sterilisations are different units and are not added together." : "Figures are unavailable just now; a dash means not read, not zero."}</p>
    </div>
  );
}
