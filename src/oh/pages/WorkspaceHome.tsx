"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { OhShell, isFacility, oversees, useOh } from "../Shell";
import { Empty, Loading } from "../ui";
import { ClinicToday } from "./ClinicToday";
import { LabQueue } from "./LabQueue";
import { FieldFollowUps } from "./FieldFollowUps";

export function WorkspaceHome() { return <OhShell><Body /></OhShell>; }

function Body() {
  const { place } = useOh();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  useEffect(() => { if (place && oversees(place.kind)) router.replace(`/programme/${place.programme.slug}`); }, [place, router]);
  if (!place) return <main className="oh-page"><Empty title="You are not part of this place">Ask the programme coordinator to add you, or go back to <a className="oh-btn quiet small" href="/today">Today</a>.</Empty></main>;
  if (place.institution_id !== id) return <main className="oh-page"><Loading /></main>;
  if (isFacility(place.kind)) return <ClinicToday />;
  if (place.kind === "laboratory") return <LabQueue />;
  if (place.kind === "ngo") return <FieldFollowUps />;
  return <main className="oh-page"><Loading /></main>;
}
