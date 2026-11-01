import { Database, Download, Eye, Fingerprint, History, KeyRound, Server, ShieldCheck, Sparkles } from "lucide-react";
import { ProductPage } from "@/sp4/site/ProductPage";
import { AuditUi, MiniWindow } from "@/sp4/home/ui";

export const metadata = { title: "Security · StrayPaw", description: "How StrayPaw protects programme records: database permissions, organisation isolation, provenance, audit history and an AI that cannot approve." };

export default function SecurityPage() {
  return <ProductPage s={{
    id: "sec",
    eyebrow: "Security",
    title: ["Records someone", "has to defend"],
    lede: "Programme records are audited, queried and paid against. StrayPaw is built so every figure can be traced, every change has a name on it, and every limitation is visible.",
    primary: { href: "/demo", label: "Book a demo" },
    secondary: { href: "/data-governance", label: "Data governance" },
    hero: <MiniWindow title="Case SP-1067 · History" label="audit history of a case"><AuditUi /></MiniWindow>,
    heroV: 4,
    tiles: {
      title: ["Controls in the product", "today"],
      items: [
        { icon: <Database size={20} />, title: "Permissions in the database", body: "Row-level security decides every read and write by organisation and role. Hiding a button is never the guard." },
        { icon: <ShieldCheck size={20} />, title: "Organisation isolation", body: "Each organisation's records are readable only by its own members. In pilots, a reviewer sees only the packages submitted to their office." },
        { icon: <KeyRound size={20} />, title: "Invitation-only access", body: "No self-chosen roles. An admin invites each member with their email and a one-time code." },
        { icon: <History size={20} />, title: "Audit history", body: "Status changes, notes, follow-ups and reviews are kept on the record with who did them and when." },
        { icon: <Fingerprint size={20} />, title: "Provenance", body: "Imported, community-reported and operator-created records are labelled and never mixed up." },
        { icon: <Sparkles size={20} />, title: "AI with your permissions", body: "Kaju reads with the signed-in person's session and cannot save anything without their confirmation." },
        { icon: <Eye size={20} />, title: "Privacy by default", body: "Public views show areas, not exact locations. Reporter identity and veterinary notes stay private." },
        { icon: <Download size={20} />, title: "Exportable", body: "Your registers, evidence and reports export to XLSX, CSV and PDF at any time." },
        { icon: <Server size={20} />, title: "Hosting", body: "Managed Postgres on Supabase and the app on Vercel, both over TLS." },
      ],
    },
    pillars: {
      title: ["What we do not", "claim yet"],
      lede: "Security claims are only useful if they are true. These are the ones we will not make until they are.",
      items: [
        { t: "No certifications", d: "StrayPaw holds no ISO 27001, SOC 2 or government empanelment today. We will say so in any procurement." },
        { t: "No India data residency guarantee", d: "Our database is not hosted in an Indian region today. Ask us if your contract requires it." },
        { t: "No external audit yet", d: "Controls are reviewed by the team that builds them. An independent review will be published when done." },
      ],
    },
    note: <><b>Report a vulnerability.</b> Write to us through the <a className="s4-blue" href="/contact">contact page</a> with the details. We reply, fix and credit you if you wish.</>,
    close: { a: "Ask us anything", b: "about how records are kept.", primary: { href: "/demo", label: "Book a demo" }, secondary: { href: "/data-governance", label: "Data governance" } },
  }} />;
}
