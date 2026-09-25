import Link from "next/link";
import { SitePage } from "@/components/site/SitePage";
import { getContributorOrganisations } from "@/lib/contributors";
import {
  VolunteerClient,
  type VolRoute,
} from "@/components/app/VolunteerClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Volunteer with an organisation, StrayPaw",
  description:
    "Real ways to help, routed to named organisations across India that do that specific work.",
};

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
    body: "Assisting ABC drives: catching, holding, post-operative care and release. The work that changes a street’s dog population, rather than one animal’s day.",
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

export default async function GetInvolvedPage() {
  const contributors = await getContributorOrganisations();
  const partners = contributors.filter((org) => org.directoryKind === "partner");
  const states = [...new Map(partners.map((org) => [org.stateCode, { code: org.stateCode, name: org.state }])).values()]
    .filter((state) => state.code !== "IN-UN")
    .sort((a, b) => a.name.localeCompare(b.name));

  /* Resolved on the server so the client filter works over plain data. */
  const routes: VolRoute[] = ROUTES.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    commitment: r.commitment,
    orgs: partners.filter((org) => org.focus.some((focus) => focus.toLowerCase().includes(r.focus.toLowerCase()))).map((o) => ({
      id: o.id,
      name: o.name,
      city: o.city,
      state: o.state,
      stateCode: o.stateCode,
      url: o.url,
    })),
  })).filter((r) => r.orgs.length > 0);

  return (
    <SitePage
      kicker="Network / volunteer"
      title={<>Pick the work. We&apos;ll name <em>who needs it.</em></>}
      lede={
        <>
          Every route below lists organisations that do that specific work, with
          a link to reach them directly. {partners.length} verified partner {partners.length === 1 ? "organisation" : "organisations"} across{" "}
          {states.length} states and union territories. StrayPaw does not place
          volunteers. You
          contact the organisation, they decide.
        </>
      }
      actions={
        <Link href="/report" className="spa-cta">
          + Report an animal
        </Link>
      }
    >
      <VolunteerClient routes={routes} states={states} />

      <aside className="spa-note">
        <div>
          <b>If nothing here is near you.</b> This page only lists organisations that actively partner with StrayPaw. Data publishers are credited on the contributor page, but are not presented as volunteering contacts.{" "}
          <Link href="/orgs" className="tlink">
            Browse the full directory
          </Link>{" "}
          or report an animal to put your area on the map.
        </div>
      </aside>
    </SitePage>
  );
}
