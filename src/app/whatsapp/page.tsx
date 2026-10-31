import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { PhoneThread, DemoWindow } from "@/sp3/home/Demos";
import { CtaBand, PageHead, S3Page, SecHead } from "@/sp3/site/Sections";

export const metadata = { title: "CareOS for WhatsApp · StrayPaw", description: "Field intake from a phone into the StrayPaw record. Status: built, not yet connected to WhatsApp in production." };

const STATUS: [string, "done" | "wait" | "todo", string][] = [
  ["Intake contract (text, photo, location, procedure updates)", "done", "Defined in the app and the database contract."],
  ["Database functions for intake, inbox and reporter notices", "done", "Deployed in the staging project and tested there. Not yet in production."],
  ["Webhook endpoint with Meta signature check", "done", "In the app at /api/careos/webhook. Verifies X-Hub-Signature-256 and queues each message once into the CareOS job queue (format verified against the staging database). Refuses everything until Meta credentials are set."],
  ["AI-assisted structuring of a field message", "done", "Works today: paste a message into StrayPaw AI in the NGO workspace."],
  ["Verified WhatsApp Business number", "wait", "Needs the organisation's Meta Business verification."],
  ["Meta app review and message templates", "wait", "Submitted by StrayPaw once the number is verified."],
  ["Production database functions", "todo", "Applied after review, never silently."],
  ["WhatsApp group workflows", "todo", "Platform eligibility for groups is not verified. Not offered until it is."],
];

export default function WhatsAppPage() {
  return (
    <S3Page>
      <PageHead eyebrow="CareOS for WhatsApp" title="Field updates from a phone, straight into the record." lede="A field worker sends a photo, a location and what was done. CareOS structures it, asks for what is missing and prepares the record for a coordinator to review. Same records, same dashboard, no re-typing.">
        <div className="s3-actions"><span className="s3-chip is-off" style={{ height: 32, fontSize: 13.5 }}><i />Not connected in production yet</span><Link href="/demo?type=careos" className="s3-btn is-primary">Join the pilot list <ArrowRight size={16} /></Link></div>
      </PageHead>
      <section className="s3-wrap" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 48, alignItems: "center", paddingBottom: 72 }} data-stack>
        <div style={{ justifySelf: "center" }}><PhoneThread /></div>
        <DemoWindow view="prepared" title="NGO workspace · prepared from WhatsApp" />
      </section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="How it works" title="One channel into one record." />
        <ol className="s3-steps">
          <li><i>1</i><b>Authorised sender</b><p>Only phone numbers linked to a member of a verified organisation can file records.</p></li>
          <li><i>2</i><b>Structured</b><p>Text, photo and location become a draft: intervention, animal, place, date.</p></li>
          <li><i>3</i><b>Missing details</b><p>CareOS asks only for what the record still needs.</p></li>
          <li><i>4</i><b>Human review</b><p>The draft waits in the NGO inbox. A coordinator accepts it into the programme.</p></li>
        </ol>
      </div></section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Status" title="Exactly where CareOS is today." lede="We will not call it live until a real message has gone end to end in production." />
        <div className="s3-rows">{STATUS.map(([t, s, d]) => <div key={t}><div><b style={{ fontSize: 16 }}>{t}</b><p>{d}</p></div><span className={`s3-chip ${s === "done" ? "is-live" : s === "wait" ? "is-off" : ""}`}>{s === "done" ? <CheckCircle2 size={13} /> : s === "wait" ? <Clock3 size={13} /> : <CircleDashed size={13} />}{s === "done" ? "Built" : s === "wait" ? "Waiting on Meta" : "Not started"}</span></div>)}</div>
        <p className="s3-body" style={{ marginTop: 20 }}>Until then, teams use <Link className="s3-link" href="/ngo/field">field mode</Link> on a phone, and StrayPaw AI can structure a forwarded message you paste in.</p>
      </div></section>
      <CtaBand title="Want CareOS for your field team?" lede="Tell us your team size and programme. We onboard organisations as the WhatsApp number is approved." primary={{ href: "/demo?type=careos", label: "Join the pilot list" }} secondary={{ href: "/for-ngos", label: "For NGOs" }} />
    </S3Page>
  );
}
