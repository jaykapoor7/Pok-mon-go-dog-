"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Stethoscope } from "lucide-react";
import { getPartnerCases } from "@/lib/cases";
import { speciesLabel, type Case } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { HairlineFigure } from "@/components/hairline/HairlineFigure";

/* Medical work, scoped to the organisation you belong to.

   This page used to read every case in the country on the server and
   render them, so a dog somebody logged in Delhi turned up on a Chennai
   team's medical list. Cases now load through my_org_cases(), which is
   scoped by my_ngo() inside the database, so signed out the page is
   genuinely empty rather than emptied afterwards. */

const MEDICAL_CATEGORIES = new Set(["injury", "vaccination", "sterilisation"]);
const isMedical = (c: Case) =>
  !!c.medical_notes || MEDICAL_CATEGORIES.has(c.category);

export function MedicalCases() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setCases(null); setError(false);
    getPartnerCases()
      .then((c) => setCases(c))
      .catch(() => { setError(true); setCases([]); });
  }, [reload]);

  const medical = (cases ?? [])
    .filter(isMedical)
    .sort(
      (a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)
    );

  if (cases === null) {
    return (
      <div className="spa-empty">
        <Loader2 size={26} className="imp-spin" />
        <p>Loading…</p>
      </div>
    );
  }

  if (error) return <div className="ws-state" role="alert"><b>Medical cases could not load.</b><p>No failed query has been shown as an empty list. <button type="button" className="ws-linkbtn" onClick={() => setReload((n) => n + 1)}>Try again</button></p></div>;

  if (medical.length === 0) {
    return (
      <div className="spa-empty">
        <HairlineFigure kind="empty" className="spa-empty-figure" label="An empty care drawer, ready for the first treatment record." />
        <h2>No medical work recorded yet</h2>
        <p>
          Treatment, vaccination and sterilisation your organisation records
          appear here. Cases from other organisations never do.
        </p>
      </div>
    );
  }

  return (
    <ul className="med-list">
      {medical.map((c) => (
        <li key={c.id}>
          <Link href={`/partner/cases/${c.id}`}>
            <span className="med-main">
              <b>{c.title}</b>
              <small>
                {speciesLabel(c.species ?? "dog")}
                {c.zone ? ` · ${c.zone}` : ""} · {timeAgo(c.last_activity_at)}
              </small>
              {c.medical_notes && <span className="med-note">{c.medical_notes}</span>}
            </span>
            <span className="med-status">{c.status.replace("_", " ")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
