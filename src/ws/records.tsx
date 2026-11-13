"use client";

/* ════════════════════════════════════════════════════════════════════
   Records: the things with a page of their own (a case, an animal, a
   sign-off, a report package, a bite record, a sample).

   One registry says which addresses are records. The frame uses it for
   three things: a record gets its own tab; a record link opens in a peek
   over the page you are on; and the breadcrumb knows where a record
   lives. The peek renders the same component as the full page, so there
   is one record, never a summary of it.
   ════════════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { usePlaces } from "@/oh/places";
import { isFacility } from "@/oh/places";
import { Skeleton } from "./ui";

const loading = () => <Skeleton kind="record" />;
const CasePage = dynamic(() => import("@/sp/ngo/CasePage").then((m) => m.CasePage), { loading });
const Casefile = dynamic(() => import("@/sp/ngo/Casefile").then((m) => m.Casefile), { loading });
const VerificationCase = dynamic(() => import("@/sp/abc/VerificationCase").then((m) => m.VerificationCase), { loading });
const PackageView = dynamic(() => import("@/sp/abc/PackageView").then((m) => m.PackageView), { loading });
const ExposureRecord = dynamic(() => import("@/oh/pages/ExposureRecord").then((m) => m.ExposureRecord), { loading });
const SampleRecord = dynamic(() => import("@/oh/pages/lab").then((m) => m.SampleRecord), { loading });

function PlaceRecord({ org, id }: { org: string; id: string }) {
  const { places, ready } = usePlaces();
  const place = places.find((p) => p.organisation_id === org);
  if (!ready) return <Skeleton kind="record" />;
  if (!place) return <p className="ws-peek-note">This record belongs to a place you are not a member of.</p>;
  return isFacility(place.kind) ? <ExposureRecord id={id} place={place} /> : <SampleRecord id={id} place={place} />;
}

const ID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
export type RecordKind = { kind: string; label: string; icon: string; tone: string; re: RegExp; parent: (m: RegExpMatchArray) => string; View: ComponentType<{ m: RegExpMatchArray }> };

export const RECORDS: RecordKind[] = [
  { kind: "case", label: "Case", icon: "list", tone: "flame", re: new RegExp(`^/ngo/cases/${ID}$`), parent: () => "/ngo/pipeline", View: ({ m }) => <CasePage id={m[1]} /> },
  { kind: "animal", label: "Animal", icon: "paw", tone: "blue", re: new RegExp(`^/ngo/animals/${ID}$`), parent: () => "/ngo/animals", View: ({ m }) => <Casefile id={m[1]} /> },
  { kind: "signoff", label: "Sign-off", icon: "shield", tone: "violet", re: new RegExp(`^/ngo/verification/${ID}$`), parent: () => "/ngo/verification", View: ({ m }) => <VerificationCase id={m[1]} /> },
  { kind: "package", label: "Report package", icon: "file", tone: "green", re: new RegExp(`^/ngo/packages/${ID}$`), parent: () => "/ngo/packages", View: ({ m }) => <PackageView id={m[1]} side="operator" /> },
  { kind: "review", label: "Submission", icon: "check", tone: "violet", re: new RegExp(`^/city/review/${ID}$`), parent: () => "/city/review", View: ({ m }) => <PackageView id={m[1]} side="reviewer" /> },
  { kind: "place-record", label: "Record", icon: "stethoscope", tone: "teal", re: new RegExp(`^/workspace/${ID}/record/${ID}$`), parent: (m) => `/workspace/${m[1]}`, View: ({ m }) => <PlaceRecord org={m[1]} id={m[2]} /> },
];

export function recordAt(path: string): { rec: RecordKind; m: RegExpMatchArray } | null {
  for (const rec of RECORDS) { const m = path.match(rec.re); if (m) return { rec, m }; }
  return null;
}
