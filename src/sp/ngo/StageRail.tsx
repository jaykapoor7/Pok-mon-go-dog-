"use client";

/* The rail for the line of work: the same stages, names and order as the
   Pipeline board. Each stage opens the board at that stage, so a person can
   step from one record to everything else waiting beside it. */

import { Rail } from "../ui/Rail";
import { STAGES, stageHref, type StageId } from "./pipeline";

export function StageRail({ stages, at, end, ended = false }: { /** The stages this kind of record passes through. */ stages: StageId[]; /** The stage it is at now. */ at: StageId; /** The name of the end of the line (Closed, Reported). */ end: string; ended?: boolean }) {
  const steps = stages.map((id) => { const s = STAGES.find((x) => x.id === id)!; return { title: s.title, href: stageHref(s.id), hint: `See everything at “${s.title}” on the board` }; });
  return <Rail label="Where this record is in the line of work" steps={steps} at={stages.indexOf(at)} end={end} ended={ended} />;
}
