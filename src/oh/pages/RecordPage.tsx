"use client";

import { useParams } from "next/navigation";
import { OhShell, isFacility, useOh } from "../Shell";
import { Empty } from "../ui";
import { ExposureRecord } from "./ExposureRecord";
import { SampleRecord } from "./SampleRecord";

export function RecordPage() { return <OhShell><Body /></OhShell>; }

function Body() {
  const { place } = useOh();
  const { rid } = useParams<{ rid: string }>();
  if (!place) return <main className="oh-page"><Empty title="You are not part of this place" /></main>;
  if (isFacility(place.kind)) return <ExposureRecord id={rid} />;
  return <SampleRecord id={rid} />;
}
