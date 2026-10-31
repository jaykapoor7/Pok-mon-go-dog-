import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageView } from "@/components/analytics/PageView";
import { AiShowcase, HeroDemo, PlatformScreens, ProductTour, UseCases } from "@/sp3/home/Demos";
import { Integrations, S3Page, SecHead, Security, StoryCard, TrustStrip } from "@/sp3/site/Sections";

export const metadata = {
  title: "StrayPaw · Every intervention. Accounted for.",
  description: "Operations software for municipal ABC/ARV programmes and the NGOs that deliver them: one record for every animal, intervention, evidence review and report, with StrayPaw AI built in.",
};

const FAQ: [string, string][] = [
  ["Who is StrayPaw for?", "Municipal corporations, urban local bodies and other public authorities that run or fund animal birth control (ABC) and anti-rabies vaccination (ARV) programmes, and the NGOs, veterinary teams and contractors that deliver them. Rescue, care centres, research and community reporting run on the same record."],
  ["How does a department buy it?", "As a scoped deployment: a paid pilot or a licence with implementation, training and support, agreed in writing before work begins. Tell us how your department procures and we will work within it. We do not claim compliance with any tender until we have its specification."],
  ["What does it cost?", "Verified NGOs get the core operational workspace free. Municipal and institutional deployments are scoped and priced per programme before any work begins. We do not publish a price list yet."],
  ["Is WhatsApp intake live?", "Not yet. CareOS is built against the Meta WhatsApp Cloud API, but the number is not verified and Meta approval is pending, so nothing is sent or received over WhatsApp today. Field teams record work on the web and phone field mode in the meantime."],
  ["Does the AI make decisions?", "No. StrayPaw AI searches, summarises and prepares records with citations. Anything that changes a record is shown to you first and saved only when you confirm. It cannot approve medical procedures, certify fieldwork or authorise payments."],
  ["Can we bring our existing registers?", "Yes. Excel and CSV registers import as they are. Uncertain matches go to review, and imported rows stay labelled as imported."],
  ["Is it free for residents?", "Yes. Reporting an animal and using the public map need no account and no fee."],
];

export default function HomePage() {
  return (
    <S3Page>
      <PageView name="landing_view" />
      {/* 1 + 2 · Hero and product demo */}
      <section className="s3-hero" aria-labelledby="hero-title">
        <div className="s3-wrap">
          <div className="s3-hero-copy">
            <Link href="/ai" className="s3-hero-pill"><b>New</b>StrayPaw AI, built into every workspace <ArrowRight size={13} /></Link>
            <h1 id="hero-title" className="s3-h1">Every intervention.<br />Accounted for.</h1>
            <p className="s3-lede">StrayPaw is the software municipalities use to run and verify animal birth control, anti-rabies vaccination and animal-welfare programmes. Implementing NGOs record each intervention once; the authority reviews the evidence and gets reports it can stand behind. StrayPaw AI does the paperwork in between.</p>
            <div className="s3-actions"><Link href="/demo?type=pilot" className="s3-btn is-primary">Request a government demo <ArrowRight size={16} /></Link><Link href="#tour" className="s3-btn is-line">Take a tour</Link></div>
          </div>
          <div className="s3-hero-stage"><HeroDemo /></div>
        </div>
      </section>

      {/* 3 · Trusted by */}
      <TrustStrip />

      {/* 4 · Product tour */}
      <section className="s3-sec" id="tour" aria-labelledby="tour-title">
        <div className="s3-wrap">
          <SecHead eyebrow="How it works" title={<span id="tour-title">From a field message to a report a municipality can sign.</span>} lede="The four steps every ABC/ARV programme repeats, every day. StrayPaw keeps them on one record so nobody re-types a register at the end of the month." />
          <ProductTour />
        </div>
      </section>

      {/* 5 · Use cases */}
      <section className="s3-sec is-line" aria-labelledby="uc-title">
        <div className="s3-wrap">
          <SecHead eyebrow="Use cases" title={<span id="uc-title">One record for the work programmes actually do.</span>} />
          <UseCases />
        </div>
      </section>

      {/* 6 · StrayPaw AI */}
      <section className="s3-sec is-line" aria-labelledby="ai-title">
        <div className="s3-wrap">
          <SecHead eyebrow="StrayPaw AI" title={<span id="ai-title">An assistant that reads the record and does the admin.</span>} lede="Ask a question, find what is missing, or have a follow-up prepared. Every answer cites the records it used, and every change waits for your confirmation." />
          <AiShowcase />
          <p className="s3-small" style={{ marginTop: 18 }}>In the app, StrayPaw AI reads only what your account is allowed to read. <Link className="s3-link" href="/ai" style={{ fontSize: 13 }}>How it works <ArrowRight size={12} /></Link></p>
        </div>
      </section>

      {/* 7 · Integrations */}
      <section className="s3-sec is-line" id="integrations" aria-labelledby="int-title">
        <div className="s3-wrap">
          <SecHead eyebrow="Integrations" title={<span id="int-title">Works with how field teams already work.</span>} lede="Status labels are current. If a channel is not connected, it says so." />
          <Integrations />
        </div>
      </section>

      {/* 8 · Platform */}
      <section className="s3-sec is-line" aria-labelledby="pf-title">
        <div className="s3-wrap">
          <SecHead eyebrow="Platform" title={<span id="pf-title">Programmes, records, fieldwork and reports. Maps when they help.</span>} />
          <PlatformScreens />
        </div>
      </section>

      {/* 9 · Customers */}
      <section className="s3-sec is-line" aria-labelledby="cs-title">
        <div className="s3-wrap">
          <SecHead eyebrow="Customers" title={<span id="cs-title">Real registers, honestly labelled.</span>} lede="Our first partners brought years of rescue, sterilisation and vaccination records onto StrayPaw. We show what was imported, what is used live, and what we have not measured yet." />
          <div style={{ display: "grid", gap: 20 }}>
            <StoryCard slug="the-pawsome-people-project" />
            <StoryCard slug="the-kind-hour-foundation" />
          </div>
          <p style={{ marginTop: 22 }}><Link className="s3-link" href="/customers">All customer stories <ArrowRight size={14} /></Link></p>
        </div>
      </section>

      {/* 10 · Security / trust */}
      <section className="s3-sec is-line" id="security" aria-labelledby="sec-title">
        <div className="s3-wrap">
          <SecHead eyebrow="Trust" title={<span id="sec-title">Built for records someone has to defend.</span>} lede="Municipal programmes are audited. StrayPaw is designed so every figure can be traced, every decision has an owner, and every limitation is visible." />
          <Security />
        </div>
      </section>

      <section className="s3-sec is-line" aria-labelledby="faq-title">
        <div className="s3-wrap s3h-faq">
          <div><h2 id="faq-title" className="s3-h2">Questions</h2><p className="s3-body" style={{ marginTop: 12 }}>Something else? <Link className="s3-link" href="/contact">Ask us</Link></p></div>
          <div>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>
      {/* 11 · Final CTA lives in the footer */}
    </S3Page>
  );
}
