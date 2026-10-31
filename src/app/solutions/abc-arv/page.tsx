import { BarChart3, CalendarClock, ClipboardList, Copy, ScanSearch, Syringe } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { SolutionPage } from "@/sp3/site/Solution";

export const metadata = {
  title: "ABC / ARV programmes · StrayPaw",
  description: "Animal birth control and anti-rabies vaccination programmes, end to end: drive registers, evidence, duplicate checks, review and reports.",
};

export default function AbcArvPage() {
  return <SolutionPage s={{
    eyebrow: "ABC / ARV programmes",
    title: "Sterilisation and vaccination, counted once and counted right.",
    lede: "StrayPaw's first and most complete workflow. Plan a drive, record each animal with its evidence, catch duplicates before they count, and report from accepted records.",
    primary: { href: "/demo?type=pilot", label: "Request a pilot" },
    secondary: { href: "/partner-programmes", label: "See recorded programmes" },
    visual: <DemoWindow view="review" title="ABC drive · Evidence review" />,
    problem: {
      title: "The same dog, counted twice. The release photo, never taken.",
      body: "ABC programmes are paid per animal. Without animal-level records and evidence, double counting and missing documentation are discovered at audit, if ever.",
      points: ["Drive sheets typed up days later", "Ear notch and release evidence not linked to the animal", "Vaccination due dates nobody tracks"],
    },
    steps: [
      { t: "Plan the drive", d: "Programme, area, team and the evidence each record needs." },
      { t: "Record each animal", d: "Capture, surgery or vaccination, release, with photo and place." },
      { t: "Check and review", d: "Duplicates and missing evidence flagged; a person decides." },
      { t: "Report", d: "Accepted interventions by area and month, with sources." },
    ],
    features: [
      { icon: <ClipboardList size={18} />, t: "Drive registers", d: "File animals and reports into an ABC or ARV programme.", href: "/ngo/programmes" },
      { icon: <Copy size={18} />, t: "Duplicate candidates", d: "Same area, sex and marks within days are flagged for a person to compare." },
      { icon: <ScanSearch size={18} />, t: "Evidence checks", d: "Records without required evidence wait in review instead of counting." },
      { icon: <Syringe size={18} />, t: "ARV on the animal", d: "Vaccinations recorded against the animal, not a separate tally." },
      { icon: <CalendarClock size={18} />, t: "Due lists", d: "Follow-ups and boosters that are due, by team and area." },
      { icon: <BarChart3 size={18} />, t: "Programme reports", d: "Recorded figures with method, sources and limits.", href: "/city/programmes" },
    ],
    notes: ["Duplicate detection suggests candidates; nothing is merged without a person's decision.", "StrayPaw records veterinary procedures as reported by the organisation. It does not certify them."],
    story: "the-pawsome-people-project",
    cta: { title: "Run one drive on StrayPaw and compare the report.", primary: { href: "/demo?type=pilot", label: "Request a pilot" }, secondary: { href: "/for-governments", label: "For municipalities" } },
  }} />;
}
