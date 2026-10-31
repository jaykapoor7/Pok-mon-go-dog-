import { BarChart3, ClipboardCheck, FileSpreadsheet, Landmark, Map as MapIcon, ShieldCheck, Sparkles, Users } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { SolutionPage } from "@/sp3/site/Solution";

export const metadata = {
  title: "For municipalities · StrayPaw",
  description: "Oversee ABC and anti-rabies vaccination programmes delivered by NGO partners: one record of every intervention, an evidence review queue and monthly reports with sources.",
};

export default function MunicipalPage() {
  return <SolutionPage s={{
    eyebrow: "For municipalities",
    title: "Oversee your ABC/ARV programme on the record, not in spreadsheets.",
    lede: "Your NGO partners record each sterilisation and vaccination with its evidence. Your team reviews what is incomplete and gets a monthly report where every figure links to the records behind it.",
    primary: { href: "/demo?type=pilot", label: "Request a municipal pilot" },
    secondary: { href: "/city", label: "Open the city workspace" },
    visual: <DemoWindow view="overview" title="City workspace · Programme overview" />,
    problem: {
      title: "Programme reports arrive as totals nobody can trace.",
      body: "Contractors send a monthly count. Checking it means asking for registers, photos and vet sheets, then reconciling them by hand, usually after payment is due.",
      points: ["Counts without the animal-level records behind them", "Missing release photos and duplicate entries found late, if at all", "Coverage maps that cannot tell no data from no animals"],
    },
    steps: [
      { t: "Agree the programme", d: "Areas, partners, targets and the evidence each intervention needs." },
      { t: "Partners record the work", d: "Each animal and intervention is recorded once, with photos and place, on the web or phone." },
      { t: "Your team reviews", d: "Incomplete records, possible duplicates and inconsistencies arrive in one queue." },
      { t: "Report from accepted records", d: "Monthly and programme reports with sources and method attached, ready to file." },
    ],
    features: [
      { icon: <Landmark size={18} />, t: "Programme overview", d: "Recorded sterilisations, vaccinations and requests per programme and area, with sources.", href: "/city/programmes" },
      { icon: <ShieldCheck size={18} />, t: "Evidence review", d: "See which records are missing evidence or may be duplicates before they count.", href: "/platform#review" },
      { icon: <BarChart3 size={18} />, t: "City reports", d: "A print-ready report with method, sources and limits, built from the record.", href: "/city/report" },
      { icon: <FileSpreadsheet size={18} />, t: "Evidence workbook", d: "Export the records behind a figure for an auditor or council question." },
      { icon: <MapIcon size={18} />, t: "Contextual map", d: "Coverage and gaps by area when geography matters. Never exact animal locations.", href: "/city" },
      { icon: <Sparkles size={18} />, t: "StrayPaw AI", d: "Ask for the month's summary, the areas with no ARV recorded, or the records still open.", href: "/ai" },
      { icon: <Users size={18} />, t: "Partner access", d: "Each NGO sees its own records; your office sees the programme. Enforced in the database." },
      { icon: <ClipboardCheck size={18} />, t: "Decision history", d: "Every acceptance and request for evidence is kept with who made it and when." },
    ],
    pricing: <>Municipal deployments are scoped per programme: areas, partners, duration, deliverables and fees are agreed in writing before work begins. Usage-based terms are possible but not yet standard. We do not publish a price list.</>,
    notes: [
      "Today the city workspace shows public programme evidence. Scoped municipal accounts with a private review queue are set up as part of a pilot.",
      "Analysis areas are not municipal wards unless your ward boundaries are provided.",
      "Recorded coverage is not an estimate of total population.",
    ],
    story: "the-pawsome-people-project",
    cta: { title: "Start with one programme, one ward cluster, one month.", lede: "We will scope a pilot with your NGO partners and show the report before you commit.", primary: { href: "/demo?type=pilot", label: "Request a municipal pilot" }, secondary: { href: "/demo", label: "Book a demo" } },
  }} />;
}
