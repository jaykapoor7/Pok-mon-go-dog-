import { Suspense } from "react";
import { CalendarCheck, FileSearch, Users } from "lucide-react";
import { DemoForm } from "@/sp3/site/DemoForm";
import { S3Page } from "@/sp3/site/Sections";

export const metadata = { title: "Book a demo · StrayPaw", description: "See StrayPaw on an ABC/ARV programme like yours, or request a municipal pilot." };

export default function DemoPage() {
  return (
    <S3Page cta={false}>
      <section className="s3-wrap s3-sec" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 56, alignItems: "start" }} data-stack>
        <div style={{ display: "grid", gap: 20 }}>
          <span className="s3-eyebrow">Book a demo</span>
          <h1 className="s3-h1" style={{ fontSize: "clamp(38px,5vw,60px)" }}>See StrayPaw on a programme like yours.</h1>
          <p className="s3-lede">A 30-minute walkthrough with the team that builds it: the NGO workspace, the municipal view, evidence review, reports and StrayPaw AI.</p>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 16 }}>
            <li style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12 }}><span className="s3-ico" style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--s3-blue-soft)", color: "var(--s3-blue)" }}><FileSearch size={17} /></span><span><b>Bring a register</b><br /><span className="s3-body">We can show your own Excel sheet imported, if you share a sample.</span></span></li>
            <li style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12 }}><span className="s3-ico" style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--s3-blue-soft)", color: "var(--s3-blue)" }}><Users size={17} /></span><span><b>Invite your partners</b><br /><span className="s3-body">Municipal teams and their NGO partners see the same record.</span></span></li>
            <li style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12 }}><span className="s3-ico" style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--s3-blue-soft)", color: "var(--s3-blue)" }}><CalendarCheck size={17} /></span><span><b>Scope a pilot</b><br /><span className="s3-body">Areas, partners, duration and deliverables agreed in writing first.</span></span></li>
          </ul>
        </div>
        <Suspense fallback={<div className="s3-panel" style={{ minHeight: 520 }} />}><DemoForm /></Suspense>
      </section>
    </S3Page>
  );
}
