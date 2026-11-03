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
const TINTS = ["#2457ce", "#0f7b8a", "#c2532d", "#6b4fd8", "#1f8a52", "#b4590f"];
const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = (t: string) => t.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(the|of|and|for)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const KIND_NOTE: Record<DirectoryOrg["kind"], string> = { "Field partner": "Animal-welfare organisations on StrayPaw", "Listed NGO": "Has a StrayPaw workspace", "Data source": "Shared a historical register" };

export function Organisations({ orgs, impacts }: { orgs: DirectoryOrg[]; impacts: Map<string, OrgImpact> | null }) {
  const kinds = (["Field partner", "Listed NGO", "Data source"] as const).map((k) => ({ k, list: orgs.filter((o) => o.kind === k) })).filter((g) => g.list.length);
  return (
    <div className="mo">
      <header className="mo-head st-head">
        <p className="k">Community · organisations</p>
        <h1 className="display">Who keeps the record</h1>
        <p className="lede">The organisations whose work is on StrayPaw, and what kind of record each keeps. Listing is not an endorsement, a rating or a claim that they cover a whole city.</p>
      </header>
      {!orgs.length && <State title="Didn't load">The directory could not be read just now.</State>}
      {kinds.map(({ k, list }) => {
        const section = (
        <section key={k} className="og-sec" aria-labelledby={`og-${k}`}>
          <h2 id={`og-${k}`} className="og-k serif">{k}s <small className="small">{KIND_NOTE[k]}</small></h2>
          <ul className="og-grid">
            {[...list].sort((x, y) => (impacts?.get(y.id)?.animalsRecorded ?? 0) - (impacts?.get(x.id)?.animalsRecorded ?? 0)).map((o) => {
              const im = impacts?.get(o.id);
              const figs = im ? ([[im.animalsRecorded, "animal profiles"], [im.caseRecords, "requests"], [im.sterilised, "sterilised"]] as const).filter(([n]) => n > 0) : [];
              return (
                <li key={o.id}>
                  <Link href={`/community/organisations/${o.slug}`} className="og-card">
                    <span className="og-av" aria-hidden style={{ ["--og" as string]: TINTS[hash(o.name) % TINTS.length] }}>{initials(o.name)}</span>
                    <span className="og-main">
                      <b>{o.name}</b>
                      <small>{[o.city, o.state].filter(Boolean).join(", ") || "Place not published"}</small>
                      {o.mission && <span className="og-mission">{o.mission}</span>}
                      <span className="og-figs2">{figs.length ? figs.map(([n, l]) => <span key={l}><b>{f(n)}</b> {l}</span>) : <span className="is-none">{impacts ? "No public records yet" : "Figures not read just now"}</span>}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        );
        // Data sources (councils, archives, observation platforms) fold away so field partners lead.
        return k === "Data source"
          ? <details key={k} className="og-fold"><summary><span>{k}s <small>{list.length} that shared a historical register or observations</small></span></summary>{section}</details>
          : section;
      })}
      <p className="small mo-foot">{impacts ? "Figures are each organisation's public record: animal profiles, requests and recorded sterilisations are different units and are not added together." : "Figures are unavailable just now; a dash means not read, not zero."}</p>
    </div>
  );
}
