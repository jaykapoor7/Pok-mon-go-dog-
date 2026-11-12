import Link from "next/link";
import { ArrowRight, BarChart3, Eye, FileSpreadsheet, Info, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { ProductPage } from "@/sp4/site/ProductPage";
import "@/sp3/home/home.css";

export const metadata = {
  title: "For funders, StrayPaw",
  description: "Scoped monitoring of the animal-welfare programmes you fund: recorded interventions, evidence and reports from the operating record.",
};

const learnMore = (href: string) => <Link href={href} className="s4-link is-sm">Learn more <ArrowRight size={14} aria-hidden /></Link>;

export default function FundersPage() {
  return <ProductPage s={{
    id: "funders",
    eyebrow: "For funders",
    title: ["See what your grant actually did,", "record by record."],
    lede: "Follow the work you fund directly: every recorded intervention, its evidence and its reports.",
    primary: { href: "/demo?type=funder", label: "Talk to us" },
    secondary: { href: "/partner-programmes", label: "See published programmes" },
    /* The earlier site's report window; .s3-root carries its colour tokens. */
    hero: <div className="s3-root s4-dw"><DemoWindow view="reports" title="Programme report · scoped view" /></div>,
    heroV: 2,
    problem: {
      eyebrow: "The problem",
      title: ["Grant reports are written after the fact."],
      body: "At the end of a grant, funders get a story and a number, with no way to check either.",
      points: ["Totals without underlying records", "No view of what is missing or still in review", "Different formats from every grantee"],
    },
    steps: {
      eyebrow: "Workflow",
      title: ["How the work moves."],
      items: [
        { t: "Scope", d: "Agree the programme, areas and period the funding covers." },
        { t: "Operate", d: "The NGO records the work in its own workspace." },
        { t: "Review", d: "Incomplete records are visible as incomplete." },
        { t: "Report", d: "A programme report with sources at any point in the grant." },
      ],
    },
    tiles: {
      eyebrow: "Capabilities",
      title: ["What you get."],
      items: [
        { icon: <Eye size={20} />, title: "Scoped visibility", body: "Read access limited to the programme you fund, agreed with the grantee." },
        { icon: <BarChart3 size={20} />, title: "Programme reports", body: "Recorded interventions over time, with method and sources.", tag: learnMore("/partner-programmes") },
        { icon: <FileSpreadsheet size={20} />, title: "Evidence workbook", body: "The records behind a figure, exportable for your own review." },
        { icon: <ShieldCheck size={20} />, title: "Clear status", body: "Imported history, records in review and accepted records are always distinguished." },
        { icon: <Sparkles size={20} />, title: "AI summaries", body: "A plain-language summary of progress and gaps, citing the records it used.", tag: learnMore("/ai") },
        { icon: <Lock size={20} />, title: "Grantee control", body: "The NGO owns its records. Funder access is granted, never assumed." },
      ],
    },
    extra: (
      <section className="s4-sec">
        <div className="s4-wrap s4-notes">
          <div className="s4-note"><Info size={20} aria-hidden /><div><b>Commercial terms</b><br />Funder monitoring is a scoped service agreed per programme. We do not publish prices.</div></div>
          <div className="s4-note"><Info size={20} aria-hidden /><div><b>What to know</b><br />Scoped funder accounts are configured per engagement; there is no self-serve funder sign-up today. Published programme pages are public.</div></div>
        </div>
      </section>
    ),
    close: { a: "Fund a programme you can follow.", b: null, sub: null, primary: { href: "/demo?type=funder", label: "Talk to us" }, secondary: { href: "/customers", label: "Read customer stories" } },
  }} />;
}
