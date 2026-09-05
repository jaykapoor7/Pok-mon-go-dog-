import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ORGS, orgsForFocus, statesWithOrgs } from "@/lib/platform/orgs";
import { STATE_BY_CODE } from "@/lib/platform/geography";
import {
  VolunteerClient,
  type VolRoute,
} from "@/components/app/VolunteerClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Volunteer, StrayPaw",
  description:
    "Real ways to help, routed to named organisations across India that do that specific work.",
};

const stateName = (code: string) => STATE_BY_CODE.get(code)?.name ?? code;

/**
 * Each route maps a thing a person can actually do to the focus tag that
 * identifies organisations doing it, so "I want to help at a shelter"
 * returns the organisations that run shelters, by name, with a link.
 */
const ROUTES: {
  id: string;
  title: string;
  body: string;
  focus: string;
  commitment: string;
}[] = [
  {
    id: "rescue",
    title: "Rescue and emergency response",
    body: "Responding to injured animals, transport to a vet, first aid at the scene. Physically demanding and often at short notice.",
    focus: "Rescue",
    commitment: "On-call, irregular",
  },
  {
    id: "abc",
    title: "Sterilisation programme support",
    body: "Assisting ABC drives: catching, holding, post-operative care and release. The single highest-leverage work in street-animal welfare.",
    focus: "ABC",
    commitment: "Scheduled camps",
  },
  {
    id: "shelter",
    title: "Shelter and daily care",
    body: "Feeding rounds, cleaning, socialising animals, dog-walking. Steady, unglamorous, and the thing shelters are most short of.",
    focus: "Shelter",
    commitment: "Weekly, recurring",
  },
  {
    id: "adoption",
    title: "Fostering and adoption",
    body: "Taking an animal into your home while it recovers or waits for a permanent placement, and helping run adoption drives.",
    focus: "Adoption",
    commitment: "Weeks to months",
  },
  {
    id: "education",
    title: "Community education",
    body: "Explaining to neighbours and resident associations why ABC works and relocation does not. Changes how a whole street behaves.",
    focus: "Education",
    commitment: "Occasional",
  },
  {
    id: "advocacy",
    title: "Advocacy and policy",
    body: "Pushing local bodies to meet their obligations under the ABC Rules, and to publish what they already collect.",
    focus: "Advocacy",
    commitment: "Ongoing",
  },
];

export default function GetInvolvedPage() {
  const states = statesWithOrgs(stateName);

  /* Resolved on the server so the client filter works over plain data. */
  const routes: VolRoute[] = ROUTES.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    commitment: r.commitment,
    orgs: orgsForFocus(r.focus).map((o) => ({
      id: o.id,
      name: o.name,
      city: o.city,
      state: stateName(o.stateCode),
      stateCode: o.stateCode,
      url: o.url,
    })),
  })).filter((r) => r.orgs.length > 0);

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Network / volunteer</span>
          <h1>
            Pick the work. We&apos;ll name <em>who needs it.</em>
          </h1>
        </div>
        <Link href="/report" className="spa-cta">
          + Report an animal
        </Link>
      </div>

      <p className="spa-lede">
        Every route below lists organisations that do that specific work, with a
        link to reach them directly. {ORGS.length} organisations across{" "}
        {states.length} states. StrayPaw does not place volunteers, you contact
        the organisation, they decide.
      </p>

      <VolunteerClient routes={routes} states={states} />

      <aside className="spa-note">
        <div>
          <b>If nothing here is near you.</b> The directory is not exhaustive. It lists organisations we could verify from published sources. Absence
          from it means we have not listed them, not that nothing exists where
          you are.{" "}
          <Link href="/orgs" className="tlink">
            Browse the full directory
          </Link>{" "}
          or report an animal to put your area on the map.
        </div>
      </aside>
    </AppShell>
  );
}
