import { BarChart3, Eye, FileSpreadsheet, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { SolutionPage } from "@/sp3/site/Solution";

export const metadata = {
  title: "For funders · StrayPaw",
  description: "Scoped monitoring of the animal-welfare programmes you fund: recorded interventions, evidence and reports from the operating record.",
};

export default function FundersPage() {
  return <SolutionPage s={{
    eyebrow: "For funders",
    title: "See what your grant actually did, record by record.",
    lede: "When a programme you fund runs on StrayPaw, you can follow its recorded interventions, evidence and reports directly, scoped to that programme and nothing else.",
    primary: { href: "/demo?type=funder", label: "Talk to us" },
    secondary: { href: "/partner-programmes", label: "See published programmes" },
    visual: <DemoWindow view="reports" title="Programme report · scoped view" />,
    problem: {
      title: "Grant reports are written after the fact.",
      body: "Funders receive a narrative and a number at the end of a grant, with little way to see how it was counted or what is still incomplete.",
      points: ["Totals without underlying records", "No view of what is missing or still in review", "Different formats from every grantee"],
    },
    steps: [
      { t: "Scope", d: "Agree the programme, areas and period the funding covers." },
      { t: "Operate", d: "The NGO records the work in its own workspace." },
      { t: "Review", d: "Incomplete records are visible as incomplete." },
      { t: "Report", d: "A programme report with sources at any point in the grant." },
    ],
    features: [
      { icon: <Eye size={18} />, t: "Scoped visibility", d: "Read access limited to the programme you fund, agreed with the grantee." },
      { icon: <BarChart3 size={18} />, t: "Programme reports", d: "Recorded interventions over time, with method and sources.", href: "/partner-programmes" },
      { icon: <FileSpreadsheet size={18} />, t: "Evidence workbook", d: "The records behind a figure, exportable for your own review." },
      { icon: <ShieldCheck size={18} />, t: "Honest status", d: "Imported history, records in review and accepted records are always distinguished." },
      { icon: <Sparkles size={18} />, t: "AI summaries", d: "A plain-language summary of progress and gaps, citing the records it used.", href: "/ai" },
      { icon: <Lock size={18} />, t: "Grantee control", d: "The NGO owns its records. Funder access is granted, never assumed." },
    ],
    pricing: <>Funder monitoring is a scoped service agreed per programme. We do not publish prices.</>,
    notes: ["Scoped funder accounts are configured per engagement; there is no self-serve funder sign-up today. Published programme pages are public."],
    cta: { title: "Fund a programme you can follow.", primary: { href: "/demo?type=funder", label: "Talk to us" }, secondary: { href: "/customers", label: "Read customer stories" } },
  }} />;
}
