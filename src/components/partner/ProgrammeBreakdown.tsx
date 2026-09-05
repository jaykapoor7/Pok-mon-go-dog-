"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { programmeBreakdown, KIND_LABEL, type Breakdown } from "@/lib/campaigns";

/* ════════════════════════════════════════════════════════════════════
   Sterilisation and rabies coverage, split by drive.

   The figure an organisation is asked for is never "your rate across
   everything you have ever recorded". It is the ward census, or the round
   in one area over three days. This is that table: one row per drive, the
   counts behind each rate, and both percentages side by side.

   Two rows exist that are not drives and are shown anyway. Unfiled is
   everything on the register that belongs to no drive, because a large
   number there means the drive rows understate the work. Waiting is what
   has come in and not been filed at all, which counts for nothing yet and
   should not be discovered at the end of a quarter.
   ════════════════════════════════════════════════════════════════════ */

function pct(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : `${n}%`;
}

export function ProgrammeBreakdown() {
  const [bd, setBd] = useState<Breakdown | null | "loading">("loading");

  useEffect(() => {
    programmeBreakdown()
      .then((b) => setBd(b))
      .catch(() => setBd(null));
  }, []);

  if (bd === "loading") {
    return (
      <div className="pb-load">
        <Loader2 size={16} className="imp-spin" /> Loading coverage…
      </div>
    );
  }
  if (!bd) return null;

  const drives = bd.drives ?? [];
  const waiting = (bd.waiting?.ours ?? 0) + (bd.waiting?.community ?? 0);

  return (
    <section className="pb" aria-label="Coverage by drive">
      <header>
        <h2>Coverage by drive</h2>
        <p>
          Counted over animals, not observations. The first percentage is of
          the animals whose status you actually established; the second is of
          everything recorded, which is lower wherever animals were not
          checked. An unknown is never counted as a negative.
        </p>
      </header>

      <div className="pb-scroll">
        <table className="pb-table">
          <thead>
            <tr>
              <th scope="col">Drive</th>
              <th scope="col">Animals</th>
              <th scope="col">Sterilised</th>
              <th scope="col">Not</th>
              <th scope="col">Unknown</th>
              <th scope="col">Of checked</th>
              <th scope="col">Of all</th>
              <th scope="col">Vaccinated</th>
            </tr>
          </thead>
          <tbody>
            {drives.length === 0 && (
              <tr>
                <td colSpan={8} className="pb-empty">
                  No drives yet. Create one on{" "}
                  <Link href="/partner/drives">Drives</Link> and file your
                  team&rsquo;s reports against it.
                </td>
              </tr>
            )}
            {drives.map((d) => (
              <tr key={d.id} className={d.archived ? "off" : ""}>
                <th scope="row">
                  <Link href={`/partner/drives/${d.id}`}>{d.name}</Link>
                  <small>
                    {KIND_LABEL[d.kind]}
                    {d.zone ? ` · ${d.zone}` : ""}
                    {d.archived ? " · finished" : ""}
                  </small>
                </th>
                <td>{d.total}</td>
                <td className="good">{d.sterilised}</td>
                <td className="warn">{d.not_sterilised}</td>
                <td className="muted">{d.ster_unknown}</td>
                <td>
                  <b>{pct(d.ster_pct_of_known)}</b>
                </td>
                <td>{pct(d.ster_pct_of_all)}</td>
                <td className="good">
                  {d.vaccinated}{" "}
                  <small>{pct(d.vacc_pct_of_known)} of checked</small>
                </td>
              </tr>
            ))}

            {bd.unfiled?.animals > 0 && (
              <tr className="pb-other">
                <th scope="row">
                  Not in any drive
                  <small>On the register, filed against nothing</small>
                </th>
                <td>{bd.unfiled.animals}</td>
                <td className="good">{bd.unfiled.sterilised}</td>
                <td className="warn">{bd.unfiled.not_sterilised}</td>
                <td className="muted">{bd.unfiled.ster_unknown}</td>
                <td colSpan={3} />
              </tr>
            )}

            {bd.overall && (
              <tr className="pb-total">
                <th scope="row">
                  Everything on the register
                  <small>All animals your organisation holds</small>
                </th>
                <td>{bd.overall.total}</td>
                <td className="good">{bd.overall.sterilised}</td>
                <td className="warn">{bd.overall.not_sterilised}</td>
                <td className="muted">{bd.overall.ster_unknown}</td>
                <td>
                  <b>{pct(bd.overall.ster_pct_of_known)}</b>
                </td>
                <td>{pct(bd.overall.ster_pct_of_all)}</td>
                <td className="good">
                  {bd.overall.vaccinated}{" "}
                  <small>{pct(bd.overall.vacc_pct_of_known)} of checked</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {waiting > 0 && (
        <Link href="/partner/incoming" className="pb-waiting">
          <b>
            {waiting} observation{waiting === 1 ? "" : "s"} are not in any of
            these figures.
          </b>
          <span>
            {bd.waiting.ours} from your own team
            {bd.waiting.community > 0
              ? `, ${bd.waiting.community} unclaimed nearby`
              : ""}
            . Filing them is what makes them count. Open Incoming →
          </span>
        </Link>
      )}
    </section>
  );
}
