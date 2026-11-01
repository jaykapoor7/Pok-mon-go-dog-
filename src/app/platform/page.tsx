import { Download, FileSpreadsheet, Landmark, Mail, Map as MapIcon, MessageCircle } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { AskUi, AuditUi, HeroWindow, QueueUi, MiniWindow, ReportUi } from "@/sp4/home/ui";

export const metadata = { title: "Platform · StrayPaw", description: "One operating record for street-animal programmes: operations, Kaju and field intake, on the same data." };

export default function PlatformPage() {
  return <ProductPage s={{
    id: "pf",
    dark: true,
    title: ["One record for the", "whole programme"],
    lede: "Intake, animals, treatment, evidence, review and reports, with Kaju and field intake working on the same data. No second database, no copy for the AI, no spreadsheet at the end.",
    primary: { href: "/demo", label: "Book a demo" },
    secondary: { href: "#modules", label: "Take a tour" },
    hero: <div style={{ width: "min(1100px, 100%)" }}><HeroWindow /></div>,
    heroV: 2,
    strip: <><b>Field partners on StrayPaw</b><span>The Pawsome People Project</span><span>The Kind Hour Foundation</span><span>PAWS Chennai</span><span>Mission Rabies</span><span>Humane Animal Society</span></>,
    pillars: {
      title: ["Built for organisations where", "the record has to hold up"],
      items: [
        { t: "Grounded in your records", d: "Every screen, answer and report reads the same records your team creates. Nothing is estimated or generated." },
        { t: "Permissions at the database", d: "Row-level security decides what each member can read and change, for people and for Kaju alike." },
        { t: "Observable and auditable", d: "Every change is dated and named. Imported, reported and operator-created records stay distinguishable." },
      ],
    },
    splits: [
      { title: ["The day's work,", "in one queue"], body: "Requests, drafts from the field, follow-ups due and evidence gaps arrive in one place, ready to assign.", ui: <MiniWindow title="Home · Today" label="the operator's queue"><QueueUi v={0} /></MiniWindow>, v: 1 },
      { title: ["Answers that", "cite their records"], body: "Kaju searches what you are allowed to read, answers in plain words and names its sources.", link: { href: "/ai", label: "Kaju" }, ui: <AskUi v={2} />, v: 2 },
      { title: ["History you", "can audit"], body: "Every change to a case writes a line with who, what and when, including changes prepared by Kaju and confirmed by a person.", link: { href: "/security", label: "Security" }, ui: <MiniWindow title="Case SP-1067 · History" label="a case's audit history"><AuditUi v={0} /></MiniWindow>, v: 3 },
      { title: ["Reports built", "from the work"], body: "Programme and municipal reports, evidence workbooks and exports, generated from accepted records with the method attached.", ui: <ReportUi v={5} />, v: 4 },
    ],
    modules: {
      title: ["Run and verify", "street-animal programmes"],
      lede: "Each module works on its own and better together.",
      items: [
        { label: "Operate", t: "ABC Operations & Verification", d: "Capture to accepted report for sterilisation and vaccination programmes.", href: "/abc-operations", cta: "Explore" },
        { label: "Assist", t: "Kaju", d: "Search, summarise, find gaps and prepare records for confirmation.", href: "/ai", cta: "Explore" },
        { label: "Intake", t: "WhatsApp field intake", d: "Field messages into draft records for review. Not yet connected.", href: "/whatsapp", cta: "Explore" },
        { label: "Care", t: "Rescue & care", d: "Requests, treatment and follow-ups for injured and sick animals.", href: "/solutions/rescue-care", cta: "Explore" },
        { label: "Oversee", t: "Government review", d: "Read-only review and acceptance of operator packages.", href: "/for-governments", cta: "Explore" },
        { label: "Public", t: "Community reports & map", d: "Residents report animals and see recorded care by place.", href: "/for-community", cta: "Explore" },
      ],
    },
    tiles: {
      id: "integrations",
      title: ["Integrations,", "with their real status"],
      items: [
        { icon: <FileSpreadsheet size={20} />, title: "Excel & CSV registers", body: "Import past registers as they are. Rows keep their source and stay labelled as historical.", tag: <Status s="live" /> },
        { icon: <Download size={20} />, title: "PDF & XLSX exports", body: "Report packages, evidence workbooks and registers, exported whenever you need them.", tag: <Status s="live" /> },
        { icon: <Mail size={20} />, title: "Email", body: "Invitations, sign-in codes and demo requests are delivered by email.", tag: <Status s="live" /> },
        { icon: <MapIcon size={20} />, title: "Maps & embeds", body: "Coverage by place, and a public map you can embed on your own site.", tag: <Status s="live" /> },
        { icon: <MessageCircle size={20} />, title: "WhatsApp Cloud API", body: "Built and tested against the staging database; awaiting a verified number and Meta approval.", tag: <Status s="off" /> },
        { icon: <Landmark size={20} />, title: "Government portals", body: "No municipal system is connected. We will integrate with a department's system only when it asks.", tag: <Status s="planned" /> },
      ],
    },
    faq: [
      ["Is the AI a separate system?", "No. Kaju uses the same database and the same permissions as the rest of the app, through named tools. There is no separate copy of your data."],
      ["Where is our data hosted?", "On Supabase (managed Postgres) and Vercel. Database row-level security isolates each organisation's records."],
      ["Can we leave?", "Yes. Registers, evidence and reports export to XLSX, CSV and PDF at any time."],
    ],
  }} />;
}
