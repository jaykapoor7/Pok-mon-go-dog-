import { ClipboardPen, FileSearch, History, Lock, ScanText, ShieldAlert } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { AskUi, ExtractUi, OvernightUi, ProposeUi } from "@/sp4/home/ui";
import { AiBand } from "@/sp4/home/Interactive";

export const metadata = { title: "Kaju · StrayPaw", description: "A tool-using assistant inside every StrayPaw workspace: searches the records you can read, answers with citations, finds gaps and prepares changes a person confirms." };

export default function AiPage() {
  return <ProductPage s={{
    id: "ai",
    eyebrow: "Kaju",
    title: ["The paperwork between", "the work, done for you"],
    lede: "Kaju reads the programme record you are allowed to read, answers with citations, finds what is missing and prepares records for you to confirm. It never approves anything on its own.",
    primary: { href: "/assistant", label: "Open Kaju" },
    secondary: { href: "/demo", label: "Book a demo" },
    hero: <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14, justifyItems: "center", width: "100%" }}><AskUi /><ProposeUi /></div>,
    heroV: 2,
    pillars: {
      title: ["An assistant with", "the same rules as your team"],
      items: [
        { t: "Your permissions", d: "It reads with your signed-in session, so database row-level security applies to every query it makes." },
        { t: "Prepared, then confirmed", d: "Every change is shown as a preview and saved only when you press Confirm, through the same checked actions as the manual screens." },
        { t: "Cited and logged", d: "Answers name the records they read. Confirmed changes carry the confirmer's name in the record's history." },
      ],
    },
    extra: <section className="s4-dark" aria-labelledby="ai-title"><div className="s4-wrap"><AiBand /></div></section>,
    splits: [
      { tag: <Status s="live" />, title: ["Ask in plain words,", "check every answer"], body: "How many releases lack a photo? Which follow-ups are overdue? Answers come with the records behind them.", ui: <AskUi />, v: 0 },
      { tag: <Status s="live" />, title: ["From a field message", "to a draft record"], body: "Paste a message or a register row. Kaju structures it into a draft and asks for what is still missing.", ui: <ExtractUi />, v: 5 },
      { tag: <Status s="live" />, title: ["Find the gaps", "before the report"], body: "Missing evidence, possible duplicates and unsigned procedures, found on request across the records you can read.", ui: <OvernightUi />, v: 3 },
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
    note: <><b>Honest status.</b> The record tools above run today in every workspace. Free-form answers need a language model key on the deployment; without one, Kaju still runs its tools and says that free-form answers are off. Conversations on this page use illustrative records.</>,
    faq: [
      ["Does Kaju train on our data?", "No. Records are sent to the model provider's API only to answer your request at that moment, and are not used to train models."],
      ["Can it see other organisations' records?", "No. It reads with your own session, so it sees exactly what you can see and nothing else."],
      ["What if it is wrong?", "Every answer names its records so you can check it, and nothing it prepares is saved until a person confirms."],
    ],
    close: { a: "Give the routine checks", b: "to Kaju.", primary: { href: "/demo", label: "Book a demo" }, secondary: { href: "/assistant", label: "Open Kaju" } },
  }} />;
}
