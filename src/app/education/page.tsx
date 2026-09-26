import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, GraduationCap, MapPinned, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { KIND_HOUR_MATERIALS } from "@/lib/platform/education";
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
        <section className="edu-hero" aria-labelledby="edu-title">
          <div className="edu-hero-in">
            <div className="edu-hero-copy">
              <p className="co-kicker">Education · classroom to street</p>
              <h1 id="edu-title">Teach coexistence. <em>Keep it grounded.</em></h1>
              <p className="co-lede">
                Original materials from people who do this work, facilitator guidance for the room,
                and a live local record learners can question for themselves.
              </p>
              <p className="co-acts">
                <Link href="/learn" className="sys-btn is-flame">Open the educator workspace <ArrowUpRight size={15} /></Link>
                <Link href="/contact?subject=Education%20session" className="co-link">Plan a session <ArrowUpRight size={14} /></Link>
              </p>
            </div>
            <div className="edu-system" aria-label="The education path">
              <div><BookOpenCheck size={20} /><span><b>Original material</b>Source PDFs stay intact and credited.</span></div>
              <i aria-hidden />
              <div><GraduationCap size={20} /><span><b>Careful facilitation</b>Audience, context and sensitive-content notes.</span></div>
              <i aria-hidden />
              <div><MapPinned size={20} /><span><b>A real place</b>Open the map and ask what is known nearby.</span></div>
            </div>
          </div>
        </section>

        <section className="co-sec edu-promise" aria-labelledby="edu-promise-title">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="edu-promise-title">Not a shelf of downloads. <em>A way to teach with care.</em></h2>
              <p>
                The public page explains the method. The educator workspace holds the original files,
                how to use them, and the local tools that make a session specific to its place.
              </p>
            </header>
            <ol className="edu-principles">
              <li><span>01</span><h3>Credit the source</h3><p>Partner material remains under the partner&rsquo;s name. StrayPaw&rsquo;s notes are clearly separate.</p></li>
              <li><span>02</span><h3>Prepare the room</h3><p>Choose for age and context. Review sensitive material before learners see it.</p></li>
              <li><span>03</span><h3>Question the record</h3><p>Compare ideas with local evidence, including gaps and things nobody can yet claim.</p></li>
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell edu-library" aria-labelledby="edu-library-title">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <p className="co-kicker">The Kind Hour Foundation · Lucknow</p>
              <h2 id="edu-library-title">Five original materials, <em>five different settings.</em></h2>
              <p>
                We do not flatten these into one generic course. Each has its own audience, purpose and
                facilitation needs. Open the app to view the original PDFs.
              </p>
            </header>
            <ol className="edu-material-preview">
              {KIND_HOUR_MATERIALS.map((material, index) => (
                <li key={material.id}>
                  <span className="edu-material-num">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{material.title}</h3>
                    <p>{material.purpose}</p>
                    <small>{material.audience} · {material.languages}</small>
                  </div>
                  {material.id === "hello" && <span className="edu-sensitive"><ShieldCheck size={13} /> Sensitive · facilitated</span>}
                </li>
              ))}
            </ol>
            <p className="edu-library-action">
              <Link href="/learn">Open lesson materials <ArrowUpRight size={15} /></Link>
              <span>Original Drive PDFs · facilitator notes · local map and evidence</span>
            </p>
          </div>
        </section>

        <section className="edu-close">
          <div>
            <p className="co-kicker">For a class, club or community room</p>
            <h2>Start with a source. <em>End with something local.</em></h2>
          </div>
          <p className="co-acts">
            <Link href="/learn" className="sys-btn is-flame">Enter as an educator <ArrowUpRight size={15} /></Link>
            <Link href="/contact?subject=Education%20session" className="co-link">Talk to us about a session <ArrowUpRight size={14} /></Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
