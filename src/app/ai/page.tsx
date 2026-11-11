import { ClipboardPen, FileSearch, History, Lock, ScanText, ShieldAlert } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { AskUi, ExtractUi, OvernightUi, ProposeUi } from "@/sp4/home/ui";
import { AiBand } from "@/sp4/home/Interactive";
import { KajuScene } from "@/site6/KajuScene";
import { SiteMotion } from "@/site6/Motion";
import "@/site6/site6.css";

export const metadata = { title: "Meet Kaju · StrayPaw", description: "A tool-using assistant inside every StrayPaw workspace: searches the records you can read, answers with citations, finds gaps and prepares changes a person confirms." };

export default function AiPage() {
  return <ProductPage s={{
    id: "ai",
    eyebrow: "Kaju",
    title: ["Meet Kaju.", "He prepares. People approve."],
    lede: "Kaju answers from your records, finds what is missing and prepares the next piece of work. Nothing changes without a yes.",
    primary: { href: "/assistant", label: "Open Kaju" },
    secondary: { href: "/demo", label: "Book a demo" },
    hero: <div className="s6 s6-embed" style={{ width: "100%", maxWidth: 560, paddingTop: 76, textAlign: "left" }}><SiteMotion /><KajuScene /></div>,
    heroV: 2,
    pillars: {
      title: ["An assistant with", "the same rules as your team"],
      items: [
        { t: "Your permissions", d: "It reads with your signed-in session, so database row-level security applies to every query it makes." },
        { t: "Prepared, then confirmed", d: "Every change is shown as a preview and saved only when you press Confirm, through the same checked actions as the manual screens." },
        { t: "Cited and logged", d: "Answers name the records they read. Confirmed changes carry the confirmer's name in the record's history." },
      ],
    },
    extra: <section className="s4-dark" aria-labelledby="ai-title"><div className="s4-wrap"><AiBand v={1} /></div></section>,
    splits: [
      { tag: <Status s="live" />, title: ["Ask for the job,", "check every answer"], body: "Ask “which records are missing evidence?” Kaju runs the right tool and shows the records behind its answer. Unclear requests get a list of actions it can run.", ui: <AskUi v={4} />, v: 0 },
      { tag: <Status s="live" />, title: ["From a field message", "to a draft record"], body: "Paste a message or a register row. Kaju structures it into a draft and asks for what is still missing.", ui: <ExtractUi v={2} />, v: 5 },
      { tag: <Status s="live" />, title: ["Find the gaps", "before the report"], body: "Quiet critical cases, unscheduled reviews, missing evidence, unsigned procedures and this month's claimable records, found before anyone goes looking, with follow-ups and the month's package ready to confirm.", ui: <OvernightUi v={2} />, v: 3 },
    ],
    tiles: {
      title: ["What Kaju", "can and cannot do"],
      items: [
        { icon: <FileSearch size={20} />, title: "Search and cite", body: "Animals, cases and programmes you are allowed to read, with the records named in every answer." },
        { icon: <ShieldAlert size={20} />, title: "Find gaps", body: "Missing evidence, likely duplicates and overdue follow-ups, for a person to resolve." },
        { icon: <ScanText size={20} />, title: "Read field messages", body: "Turns a forwarded message or a register row into a structured draft." },
        { icon: <ClipboardPen size={20} />, title: "Prepare changes", body: "Open a case, add a note, schedule a follow-up or record care, after you confirm." },
        { icon: <Lock size={20} />, title: "Cannot approve", body: "It cannot authorise a procedure, accept a report, approve a payment or invent evidence." },
        { icon: <History size={20} />, title: "Leaves a trail", body: "Changes prepared with Kaju are marked as such, with the confirmer's name." },
      ],
    },
    note: <><b>Status.</b> Kaju currently runs on record tools only: no language model is called, and free-form conversation is off until it is deliberately enabled with a spending limit. Record tools use your authorised workspace access. Prepared changes wait for your confirmation. Conversations on this page use illustrative records.</>,
    faq: [
      ["What can Kaju do?", "Search your records, summarise work, find missing evidence and duplicates, read field messages and prepare cases, notes, follow-ups and care records."],
      ["Can Kaju see other organisations' records?", "No. Kaju reads with your own session, so it sees exactly what you can see."],
      ["What if Kaju is wrong?", "Answers based on records include source links. Prepared changes wait for a person to confirm."],
    ],
    close: { a: "Give the routine checks", b: "to Kaju.", primary: { href: "/demo", label: "Book a demo" }, secondary: { href: "/assistant", label: "Open Kaju" } },
  }} />;
}
