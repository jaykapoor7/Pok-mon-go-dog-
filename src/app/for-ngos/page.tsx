import { ClipboardList, FileSpreadsheet, FileText, Inbox, PawPrint, Smartphone, Sparkles, Users } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { CaptureUi, EvidenceUi, MiniWindow, QueueUi, ReportUi } from "@/sp4/home/ui";

export const metadata = {
  title: "ABC operators & NGOs · StrayPaw",
  description: "For NGOs and contractors running funded ABC and vaccination programmes: record the work once, check the evidence, and report it to the office that funds you.",
};

export default function OperatorsPage() {
  return <ProductPage s={{
    id: "ngo",
    eyebrow: "ABC operators & NGOs",
    title: ["Record the work once.", "Get paid for all of it."],
    lede: "Field capture, treatment, evidence and follow-ups on one record, on a laptop or a phone. Report packages for the office that funds you come out of the same record.",
    primary: { href: "/demo", label: "Book a demo" },
    secondary: { href: "/sign-in?next=/ngo", label: "Sign in to your workspace" },
    hero: <MiniWindow title="Home · Today" label="the operator's daily queue"><QueueUi v={1} /></MiniWindow>,
    heroV: 1,
    steps: {
      title: ["How a programme", "runs on StrayPaw"],
      items: [
        { t: "Capture", d: "Field staff record each animal with photos and place." },
        { t: "Treat", d: "Procedures recorded and authorised by the vet who did them." },
        { t: "Check", d: "Evidence gaps and duplicates fixed the same week." },
        { t: "Report", d: "A package for the funding office, from the records." },
      ],
    },
    splits: [
      { tag: <Status s="live" />, title: ["Built for the", "field team's phone"], body: "A one-hand field mode that works on low-end Android phones and slow networks.", ui: <CaptureUi v={2} />, v: 0 },
      { tag: <Status s="staging" />, title: ["Know what is missing", "before month end"], body: "Each animal shows the evidence your contract asks for, so gaps are fixed while the team can still fix them.", ui: <EvidenceUi v={2} />, v: 2 },
      { tag: <Status s="live" />, title: ["Reports without", "the late nights"], body: "Programme reports, evidence workbooks and municipal reports straight from the record, in PDF and XLSX.", ui: <ReportUi v={4} />, v: 5 },
    ],
    tiles: {
      title: ["Everything in", "the operator workspace"],
      items: [
        { icon: <Inbox size={20} />, title: "Inbox & triage", body: "Requests, community reports and field drafts with a clear next step.", tag: <Status s="live" /> },
        { icon: <ClipboardList size={20} />, title: "Cases & follow-ups", body: "Assign, treat, follow up and close with an outcome.", tag: <Status s="live" /> },
        { icon: <PawPrint size={20} />, title: "Animal register", body: "One history per animal, from capture to release.", tag: <Status s="live" /> },
        { icon: <Smartphone size={20} />, title: "Field mode", body: "A one-hand phone view for teams on the street.", tag: <Status s="live" /> },
        { icon: <FileSpreadsheet size={20} />, title: "Register import", body: "Bring your Excel or CSV. Rows stay labelled as historical.", tag: <Status s="live" /> },
        { icon: <FileText size={20} />, title: "Reports & proof", body: "Programme reports and evidence on demand.", tag: <Status s="live" /> },
        { icon: <Sparkles size={20} />, title: "Kaju", body: "Find gaps, read field messages, prepare records for confirmation.", tag: <Status s="live" /> },
        { icon: <Users size={20} />, title: "Team & roles", body: "Invite members with codes, set roles, remove access.", tag: <Status s="live" /> },
        { icon: <Smartphone size={20} />, title: "WhatsApp intake", body: "Built, awaiting Meta approval. Field mode works meanwhile.", tag: <Status s="off" /> },
      ],
    },
    note: <><b>Pricing.</b> StrayPaw is scoped and priced per programme before any work begins; we do not publish a price list yet. Small community and welfare groups can ask us about an accessible plan.</>,
    faq: [
      ["How long does setup take?", "It depends on your registers and team. We agree a plan with you before starting; most of the time goes into importing past registers and training field staff."],
      ["Who owns our records?", "You do. Export everything to XLSX, CSV and PDF at any time."],
      ["We are a small rescue, not an ABC contractor.", "Rescue and care run on the same record. Ask us about an accessible plan for small welfare groups."],
    ],
    close: { a: "Bring your registers.", b: "Leave with a record you can prove.", primary: { href: "/demo", label: "Book a demo" }, secondary: { href: "/abc-operations", label: "See the workflow" } },
  }} />;
}
