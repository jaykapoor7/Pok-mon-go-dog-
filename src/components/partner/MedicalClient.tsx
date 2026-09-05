"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Stethoscope } from "lucide-react";
import { getPartnerCases } from "@/lib/cases";
import { speciesLabel, type Case } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

/* Medical work, scoped to the organisation you belong to.

   This page used to read every case in the country on the server and
   render them, so a dog somebody logged in Delhi turned up on a Chennai
   team's medical list. Cases now load through my_org_cases(), which is
   scoped by my_ngo() inside the database, so signed out the page is
   genuinely empty rather than emptied afterwards. */

const MEDICAL_CATEGORIES = new Set(["injury", "vaccination", "sterilisation"]);
const isMedical = (c: Case) =>
  !!c.medical_notes || MEDICAL_CATEGORIES.has(c.category);

export function MedicalClient() {
  const [cases, setCases] = useState<Case[] | null>(null);

  useEffect(() => {
    getPartnerCases()
      .then((c) => setCases(c))
      .catch(() => setCases([]));
  }, []);

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

  if (medical.length === 0) {
    return (
      <div className="spa-empty">
        <Stethoscope size={40} strokeWidth={1.25} />
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
          <Link href={`/cases/${c.id}`}>
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
