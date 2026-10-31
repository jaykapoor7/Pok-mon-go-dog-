import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { getOperationalPartners } from "@/lib/partners";
import { RELATIONSHIP_LABEL, STORIES, fieldPartnerStrip } from "@/sp3/customers";
import { CtaBand, PageHead, S3Page, SecHead, StoryCard } from "@/sp3/site/Sections";

export const revalidate = 300;
export const metadata = { title: "Customers · StrayPaw", description: "The organisations whose records are on StrayPaw, what they use it for, and what we have and have not measured." };

export default async function CustomersPage() {
  const operational = await getOperationalPartners().catch(() => []);
  const all = fieldPartnerStrip();
  const totalImported = STORIES.reduce((s, x) => s + x.results.reduce((a, r) => a + r.n, 0), 0);
  return (
    <S3Page>
      <PageHead eyebrow="Customers" title="Built with the teams doing the work." lede="Our first partners brought years of field records onto StrayPaw. Every story below says what was imported, what is used day to day, and what has not been measured yet." />
      <section className="s3-wrap" style={{ paddingBottom: 56 }}>
        <div className="s3-stats">
          <div><b className="s3-num">{operational.length || 1}</b><span>Operational partner</span><small>Workspace in use</small></div>
          <div><b className="s3-num">{all.length}</b><span>Field partners</span><small>Confirmed by the product owner, 20 Oct 2026</small></div>
          <div><b className="s3-num">{totalImported.toLocaleString("en-IN")}</b><span>Records in the case studies</span><small>Historical registers, imported</small></div>
          <div><b>Pilot</b><span>Municipal deployments</span><small>The first is being scoped; none is live yet</small></div>
        </div>
      </section>
      <section className="s3-sec is-tight"><div className="s3-wrap" style={{ display: "grid", gap: 20 }}>
        {STORIES.map((s) => <StoryCard key={s.slug} slug={s.slug} />)}
      </div></section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Partners" title="Every organisation on the record, labelled honestly." lede="A listing is not a deployment. Operational partners use a workspace; field partners' published or shared records are on StrayPaw with credit." />
        <div className="s3-grid-3">
          {all.map((p) => (
            <div key={p.name} className="s3-card s3-feature">
              <span className={`s3-chip ${p.relationship === "operational" ? "is-live" : p.relationship === "imported" ? "is-blue" : ""}`}>{p.relationship === "operational" && <ShieldCheck size={12} />}{RELATIONSHIP_LABEL[p.relationship]}</span>
              <h3>{p.name}</h3>
              <p><MapPin size={13} style={{ verticalAlign: -2 }} /> {p.city}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20 }}><Link className="s3-link" href="/community/organisations">Organisation directory <ArrowRight size={14} /></Link></p>
      </div></section>
      <CtaBand title="Become the first municipal case study." lede="We are looking for one city to run an ABC/ARV programme end to end on StrayPaw and measure the time it saves, with us." primary={{ href: "/demo?type=pilot", label: "Request a municipal pilot" }} secondary={{ href: "/partner-apply", label: "Apply as an NGO" }} />
    </S3Page>
  );
}
