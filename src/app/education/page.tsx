import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EDUCATION_PARTNERS, KIND_HOUR_DECKS, KIND_HOUR_LESSONS, KIND_HOUR_MYTHS } from "@/lib/platform/education";
import { getKindHour } from "@/lib/kind-hour";
import "@/components/site/site.css";
import "@/components/company/company.css";
import "./education.css";

export const revalidate = 900;
export const metadata = {
  title: "Education, StrayPaw",
  description: "Understand the street, then act on it: lessons from The Kind Hour Foundation's teaching material, your own locality on the map, and a report from your phone. Sessions for schools and communities.",
};

/* ════════════════════════════════════════════════════════════════════
   Education.

   Reporting, mapping and case work all deal with an animal after
   something has happened to it. This is the part that runs before that,
   and StrayPaw does not write it: the lessons here are The Kind Hour
   Foundation's, taken from the five session decks it shared, credited on
   every block. The page is a route, not a library: understand the
   street, look at your own locality on the record, then do something
   there. Kind Hour's rescue register is on the map too; it is shown as
   what it is, beside the lessons, and never as their result.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

export default async function EducationPage() {
  const kh = await getKindHour().catch(() => null);
  const src = kh?.source ?? null;
  /* The partner whose material this page carries comes first. */
  const partners = [...EDUCATION_PARTNERS].sort((a, b) => Number(b.id === "the-kind-hour-foundation") - Number(a.id === "the-kind-hour-foundation"));

  return (
    <div className="co edu">
      <SiteHeader tone="night" />
      <main>
        <section className="edu-hero" aria-labelledby="edu-title">
          <div className="edu-hero-in">
            <div className="edu-hero-copy">
              <p className="co-kicker">Education · with The Kind Hour Foundation</p>
              <h1 id="edu-title">Understand the street. <em>Then act on&nbsp;it.</em></h1>
              <p className="co-lede">Lessons from people who teach this in Indian classrooms, then the animals recorded on your own streets, then one thing you can do there today.</p>
              <p className="co-acts">
                <Link href="/contact?subject=Education%20session" className="sys-btn is-flame">Bring a session to your school <ArrowUpRight size={15} /></Link>
                <a href="#lessons" className="co-link">Read the lessons <ArrowUpRight size={14} /></a>
              </p>
            </div>
            <figure className="edu-myths" aria-labelledby="edu-myths-cap">
              <ol>
                {KIND_HOUR_MYTHS.map((m, i) => (
                  <li key={m.en} style={{ ["--i" as string]: i }}>
                    <s>{m.en}</s>
                    <span lang="hi">{m.hi}</span>
                  </li>
                ))}
              </ol>
              <figcaption id="edu-myths-cap"><span className="sys-mono">Busting stigma · सच्चाई का सामना</span>Ten things people believe about street dogs, from Kind Hour&apos;s <i>Rethinking Indies</i>. The session takes each one apart.</figcaption>
            </figure>
          </div>
        </section>

        <section className="co-sec" id="lessons" aria-labelledby="edu-lessons">
          <div className="edu-lessons-in">
            <header className="edu-lessons-head">
              <h2 id="edu-lessons">Six lessons, <em>from Kind Hour&apos;s own decks.</em></h2>
              <p>Each lesson is the deck&apos;s own points, in its own words, credited to the deck it comes from.</p>
            </header>
            <ol className="edu-lessons">
              {KIND_HOUR_LESSONS.map((l) => (
                <li key={l.n}>
                  <span className="edu-n" aria-hidden>{l.n}</span>
                  <div className="edu-l-head">
                    <h3>{l.title}</h3>
                    {l.hi && <p lang="hi">{l.hi}</p>}
                    <small className="sys-mono">From {l.from}</small>
                  </div>
                  <ul>{l.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </li>
              ))}
            </ol>
            <p className="edu-bite"><b>After a bite or a scratch:</b> wash the wound with soap and running water for fifteen minutes, then go to a hospital for anti-rabies vaccination the same day. <Link href="/learn">StrayPaw&apos;s own short lessons</Link></p>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="edu-route">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="edu-route">From the lesson <em>to your street.</em></h2>
              <p>Reading without a local picture stays abstract. The same animals the lessons describe are on the record, street by street.</p>
            </header>
            <div>
              <ol className="edu-route">
                <li><b>Learn</b><p>One of the lessons above, or a session with Kind Hour or STRAW India at your school.</p><a href="#lessons">The lessons</a></li>
                <li><b>Look at your locality</b><p>The animals recorded near you, their care, and the places nobody has recorded yet, drawn as unknown rather than empty.</p><Link href="/map">Open the live map</Link></li>
                <li><b>Report an animal</b><p>A photo and a place from your phone, no account needed. It reaches the organisations working there.</p><Link href="/report">Report a sighting</Link></li>
              </ol>
              {src && src.profiles > 0 && (
                <p className="edu-kh-map">
                  <span className="sys-mono">Kind Hour on the record</span>
                  Separately from its teaching, The Kind Hour Foundation keeps a rescue register in Lucknow. {fmt(src.profiles)} animals from it are on the map as imported history, from {fmt(src.lines)} register lines.{" "}
                  <Link href="/map?city=Lucknow">See them in Lucknow <ArrowUpRight size={13} /></Link>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="co-sec" aria-labelledby="edu-res">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="edu-res">The session decks, <em>as Kind Hour teaches them.</em></h2>
              <p>Five decks, for five audiences. The decks stay with Kind Hour: a school or community group asks them for a session.</p>
            </header>
            <ol className="edu-decks">
              {KIND_HOUR_DECKS.map((d) => (
                <li key={d.id}>
                  <div className="edu-d-head">
                    <b>{d.title}</b>
                    <span className="sys-mono">{d.slides} slides · {d.languages}</span>
                    <small>Suited to: {d.audience}</small>
                  </div>
                  <ul>{d.covers.map((c) => <li key={c}>{c}</li>)}</ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="co-sec is-shell" aria-labelledby="edu-partners">
          <div className="co-sec-in">
            <header className="co-sec-head">
              <h2 id="edu-partners">Education partners, <em>credited by name.</em></h2>
              <p>StrayPaw holds the records and builds the software. Teaching is a different craft; the material on this page is theirs, under their name, and comes down if they ask.</p>
            </header>
            <ul className="edu-partners">
              {partners.map((p) => (
                <li key={p.id}>
                  <div className="edu-p-head">
                    <b>{p.name}</b>
                    <span className="sys-mono">{p.city}</span>
                  </div>
                  <p>{p.summary}</p>
                  <ul>{p.programmes.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="edu-p-links">
                    <a href={p.url} target="_blank" rel="noopener noreferrer">{p.source} <ExternalLink size={12} /></a>
                    {p.id === "the-kind-hour-foundation" && <Link href={`/org/${kh?.orgSlug ?? "the-kind-hour-foundation"}`}>On StrayPaw <ArrowUpRight size={12} /></Link>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="co-close">
          <div className="co-close-in">
            <div>
              <h2>Schools, colleges, <em>communities.</em></h2>
              <p>Ask for a session and we will put you in touch with the education partner nearest you. Organisations that teach can bring their material here, under their own name.</p>
            </div>
            <p className="co-acts">
              <Link href="/contact?subject=Education%20session" className="sys-btn is-flame">Ask for a session <ArrowUpRight size={15} /></Link>
              <Link href="/contact?subject=Education%20partnership" className="co-link">Become an education partner <ArrowUpRight size={14} /></Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
