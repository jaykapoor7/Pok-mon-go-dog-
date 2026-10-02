import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KIND_HOUR_MATERIALS } from "@/lib/platform/education";
import { PlaceGround } from "@/components/system/PlaceGround";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./education.css";

export const dynamic = "force-static";
export const metadata = {
  title: "Education, StrayPaw",
  description: "Original humane-education materials, careful facilitation and local animal records for classrooms and communities.",
};

export default function EducationPage() {
  return (
    <div className="co edu">
      <SiteHeader tone="night" />
      <main>
        <section className="co-hero has-ground edu-hero2" aria-labelledby="edu-title">
          <PlaceGround className="co-hero-ground" />
          <div className="co-hero-in">
            <div className="co-hero-copy">
              <p className="co-kicker">Education · classroom to street</p>
              <h1 id="edu-title">Teach coexistence. <em>Keep it grounded.</em></h1>
              <p className="co-lede">Original materials from people who do this work, guidance for the room, and a live local record learners can question for themselves.</p>
              <p className="co-acts">
                <Link href="/learn" className="sys-btn is-flame">Open the lesson studio <ArrowUpRight size={15} /></Link>
                <Link href="/contact?subject=Education%20session" className="co-link is-night">Plan a session <ArrowUpRight size={14} /></Link>
              </p>
            </div>
            <ol className="edu-route" aria-label="How a session runs">
              <li><i aria-hidden /><span><b>Credit the source</b>The partner’s material stays intact, under their name.</span></li>
              <li><i aria-hidden /><span><b>Prepare the room</b>Choose for age and context; review sensitive pages first.</span></li>
              <li><i aria-hidden /><span><b>Question the record</b>Open the map and ask what is known nearby, gaps included.</span></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell edu-library" aria-labelledby="edu-library-title">
          <div className="co-sec-in is-stack">
            <header className="co-sec-head">
              <p className="co-kicker">The Kind Hour Foundation · Lucknow</p>
              <h2 id="edu-library-title">Five original materials, <em>five different rooms.</em></h2>
              <p>Not one generic course: each has its own audience, purpose and facilitation. The originals open in the lesson studio.</p>
            </header>
            <ol className="edu-cards">
              {KIND_HOUR_MATERIALS.map((material, index) => (
                <li key={material.id}>
                  <span className="edu-card-n">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{material.title}</h3>
                  <p>{material.purpose}</p>
                  <p className="edu-card-meta"><span>{material.audience}</span><span>{material.languages}</span></p>
                  {material.id === "hello" && <span className="edu-sensitive"><ShieldCheck size={13} /> Sensitive · facilitated</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="co-close has-ground">
          <PlaceGround className="co-hero-ground" caption={null} />
          <div className="co-close-in">
            <div>
              <h2>Start with a source. <em>End with something local.</em></h2>
              <p>For a class, a club or a community room.</p>
            </div>
            <p className="co-acts">
              <Link href="/learn" className="sys-btn is-flame">Enter as an educator <ArrowUpRight size={15} /></Link>
              <Link href="/contact?subject=Education%20session" className="co-link">Talk to us about a session <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
