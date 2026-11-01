import Link from "next/link";
import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { ProductPage, Status } from "@/sp4/site/ProductPage";
import { ExtractUi, HeroPhone, MiniWindow, QueueUi } from "@/sp4/home/ui";
import { Rise } from "@/sp4/site/Rise";
import { TwoTone } from "@/sp4/site/kit";

export const metadata = { title: "WhatsApp field intake · StrayPaw", description: "Field messages become draft records for operator review. Status: built and tested in staging; not yet connected to WhatsApp in production." };

const STATUS: [string, "done" | "wait" | "todo", string][] = [
  ["Intake contract: text, photo, location, procedure updates", "done", "Defined in the app and the database contract."],
  ["Database functions for intake and the operator inbox", "done", "Deployed and tested in the staging project. Not yet in production."],
  ["Webhook with Meta signature check", "done", "Verifies X-Hub-Signature-256 and queues each message once. Refuses everything until Meta credentials are set."],
  ["Structuring a field message into a draft", "done", "Works today: paste a message into Kaju in the operator workspace."],
  ["Verified WhatsApp Business number", "wait", "Needs the operating organisation's Meta Business verification."],
  ["Meta app review and message templates", "wait", "Submitted once the number is verified."],
  ["Production database functions", "todo", "Applied after review, never silently."],
];

export default function WhatsAppPage() {
  return <ProductPage s={{
    id: "wa",
    eyebrow: <Status s="off" />,
    title: ["Field reports from", "the phone they already have"],
    lede: "A catcher sends a photo and a line of text. StrayPaw turns it into a draft record and places it in the operator's intake queue for a person to review.",
    primary: { href: "/demo?type=careos", label: "Join the pilot list" },
    secondary: { href: "/abc-operations", label: "ABC Operations" },
    hero: <HeroPhone />,
    heroV: 3,
    steps: {
      title: ["One channel", "into one record"],
      items: [
        { t: "Authorised sender", d: "Only numbers linked to a member of a verified organisation can send records." },
        { t: "Structured draft", d: "Text, photo and location become a draft: animal, condition, place and time." },
        { t: "Missing details", d: "It asks only for what the record still needs." },
        { t: "Human review", d: "The draft waits in the operator's intake. A coordinator accepts it into the programme." },
      ],
    },
    splits: [
      { title: ["Drafts, never", "final records"], body: "Nothing from a message is saved as a finished record. It becomes a draft in the intake queue with the original message attached.", ui: <MiniWindow title="Intake · Today" label="the intake queue with a WhatsApp draft" active={0}><QueueUi v={2} /></MiniWindow>, v: 1 },
      { title: ["Works today", "by pasting"], body: "Until WhatsApp is connected, a coordinator can paste a forwarded message into Kaju and get the same structured draft.", ui: <ExtractUi v={3} />, v: 5 },
    ],
    extra: (
      <section className="s4-sec" aria-labelledby="wa-status">
        <div className="s4-wrap">
          <Rise className="s4-sechead"><div><h2 id="wa-status" className="s4-h2"><TwoTone a="Exactly where" b="field intake is today" /></h2><p className="s4-lede">We will not call it live until a real message has gone end to end in production.</p></div></Rise>
          <div className="s4-faq" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
            <div>{STATUS.map(([t, s, d]) => (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center", padding: "22px 0", borderTop: "1px solid var(--s4-line)" }}>
                <div><b style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em" }}>{t}</b><p className="s4-body" style={{ marginTop: 6 }}>{d}</p></div>
                <span className={`s4-tag ${s === "done" ? "is-green" : s === "wait" ? "is-amber" : ""}`}>{s === "done" ? <CheckCircle2 size={12} /> : s === "wait" ? <Clock3 size={12} /> : <CircleDashed size={12} />}{s === "done" ? "Built" : s === "wait" ? "Waiting on Meta" : "Not started"}</span>
              </div>
            ))}</div>
          </div>
          <p className="s4-body" style={{ marginTop: 28, fontSize: 17 }}>Until then, field teams use phone field mode, and residents use the <Link href="/community/report" className="s4-blue">web report form</Link>, which works today.</p>
        </div>
      </section>
    ),
    close: { a: "Want field intake", b: "for your team?", primary: { href: "/demo?type=careos", label: "Join the pilot list" }, secondary: { href: "/for-ngos", label: "For operators" } },
  }} />;
}
