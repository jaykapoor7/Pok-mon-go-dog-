import { ClipboardList, FileSpreadsheet, Inbox, MessageCircle, PawPrint, Smartphone, Sparkles, Users, FileText } from "lucide-react";
import { DemoWindow } from "@/sp3/home/Demos";
import { SolutionPage } from "@/sp3/site/Solution";

export const metadata = {
  title: "For NGOs & rescues · StrayPaw",
  description: "A free operational workspace for verified NGOs: inbox, cases, animal register, programmes, field mode, imports and reports, with StrayPaw AI.",
};

export default function NGOsPage() {
  return <SolutionPage s={{
    eyebrow: "For NGOs & rescues",
    title: "Record your fieldwork once. Report it anywhere.",
    lede: "A free workspace for verified NGOs: new requests, cases, the animal register, ABC/ARV drives and follow-ups, on a laptop or a phone in the field. Monthly reports come out of the same record.",
    primary: { href: "/partner-apply", label: "Apply for a workspace" },
    secondary: { href: "/sign-in?next=/ngo", label: "Sign in to your workspace" },
    visual: <DemoWindow view="records" title="NGO workspace · Animal register" />,
    problem: {
      title: "Teams spend evenings re-typing registers.",
      body: "Field updates arrive as photos and messages. Someone copies them into a spreadsheet, then again into a report for the municipality or a funder. Follow-ups slip because nobody can see what is due.",
      points: ["Field updates scattered across phones and chat groups", "The same animal entered twice by two people", "Reports assembled by hand at month end"],
    },
    steps: [
      { t: "Intake", d: "Requests from residents and your own field team land in the inbox." },
      { t: "Work the case", d: "Take it, treat it, schedule follow-ups and close it with an outcome." },
      { t: "Programmes", d: "File sterilisations and vaccinations into a drive register with evidence." },
      { t: "Report", d: "Programme reports and an evidence workbook, straight from the record." },
    ],
    features: [
      { icon: <Inbox size={18} />, t: "Inbox & triage", d: "New reports and requests, with a clear next step for each.", href: "/ngo/inbox" },
      { icon: <ClipboardList size={18} />, t: "Cases & follow-ups", d: "Assign, treat, follow up and close with an outcome.", href: "/ngo" },
      { icon: <PawPrint size={18} />, t: "Animal register", d: "One history per animal: requests, care, sterilisation, vaccination.", href: "/ngo/animals" },
      { icon: <Smartphone size={18} />, t: "Field mode", d: "A one-hand phone view for teams on the street.", href: "/ngo/field" },
      { icon: <FileSpreadsheet size={18} />, t: "Register import", d: "Bring the Excel or CSV you already keep. Uncertain matches go to review.", href: "/ngo/import" },
      { icon: <FileText size={18} />, t: "Reports & proof", d: "Programme reports and evidence on demand.", href: "/ngo/proof" },
      { icon: <Sparkles size={18} />, t: "StrayPaw AI", d: "Paste a field message and get a prepared record. Ask what is due today.", href: "/ai" },
      { icon: <MessageCircle size={18} />, t: "WhatsApp intake", d: "Coming with CareOS. Not connected yet; the web field mode works today.", href: "/whatsapp" },
      { icon: <Users size={18} />, t: "Team & access", d: "Invite members with codes, set roles, remove access.", href: "/ngo/team" },
    ],
    pricing: <>The core operational workspace is free for verified NGOs. Advanced AI reporting, evidence reconciliation for a municipal contract and institutional oversight may be paid services, agreed with the institution funding the programme.</>,
    notes: ["A workspace opens after verification. Membership and every read are checked in the database, not in the browser."],
    story: "the-pawsome-people-project",
    cta: { title: "Bring the spreadsheet. Keep the ownership.", lede: "Apply for a workspace, import your register and invite your team.", primary: { href: "/partner-apply", label: "Apply for a workspace" }, secondary: { href: "/demo", label: "Book a walkthrough" } },
  }} />;
}
