import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  ChartColumn,
  ExternalLink,
  FileText,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { PlatformShell } from "@/components/platform/PlatformNav";
import { KIND_HOUR_MATERIALS } from "@/lib/platform/education";
import "./learn.css";

export const dynamic = "force-static";
export const metadata = {
  title: "Lesson studio, StrayPaw",
  description: "Original Kind Hour classroom materials, facilitator notes and local StrayPaw records for educators.",
};

const QUICK_GUIDES = [
  {
    id: "coexist",
    title: "A calm street-dog encounter",
    body: "Stand still, turn slightly away and give the dog room. Do not corner, chase or hit an animal that is signalling discomfort.",
  },
  {
    id: "bite",
    title: "After a bite or scratch",
    body: "Wash the wound with soap and running water for fifteen minutes, then seek medical care and anti-rabies vaccination the same day.",
  },
  {
    id: "observe",
    title: "Observe without guessing",
    body: "Record only what you can see: place, time, photo and visible condition. Leave breed, history and outcome unknown when the evidence is not there.",
  },
];

export default function LearnPage() {
  return (
    <PlatformShell>
      <div className="studio">
        <header className="studio-hero">
          <div>
            <p className="studio-kicker">Educator workspace</p>
            <h1>Lesson materials, <em>with the source still attached.</em></h1>
            <p>
              Open The Kind Hour Foundation&rsquo;s original PDFs, see how each one is best facilitated,
              then bring the conversation back to a real place on StrayPaw.
            </p>
          </div>
          <div className="studio-route" aria-label="A three-part lesson route">
            <span><b>01</b> Choose a source</span>
            <span><b>02</b> Frame the room</span>
            <span><b>03</b> Open the local record</span>
          </div>
        </header>

        <section className="studio-materials" aria-labelledby="materials-title">
          <header className="studio-section-head">
            <div>
              <p className="studio-kicker">The Kind Hour Foundation · original PDFs</p>
              <h2 id="materials-title">Lesson materials</h2>
            </div>
            <p>
              These are partner materials, not StrayPaw-authored lessons. Audience and facilitator
              notes below are editorial guidance so the files are used with care.
            </p>
          </header>

          <ol className="material-list">
            {KIND_HOUR_MATERIALS.map((material, index) => (
              <li key={material.id} id={material.id}>
                <div className="material-index" aria-hidden>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <FileText size={20} />
                </div>
                <div className="material-main">
                  <div className="material-title">
                    <div>
                      <h3>{material.title}</h3>
                      <p>{material.purpose}</p>
                    </div>
                    <a href={material.driveUrl} target="_blank" rel="noopener noreferrer">
                      Open original PDF <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="material-meta">
                    <span>{material.audience}</span>
                    <span>{material.slides} slides</span>
                    <span>{material.languages}</span>
                  </div>
                  <ul className="material-themes" aria-label="Themes">
                    {material.themes.map((theme) => <li key={theme}>{theme}</li>)}
                  </ul>
                  <p className={material.id === "hello" ? "material-note is-sensitive" : "material-note"}>
                    <ShieldCheck size={16} aria-hidden />
                    <span><b>Facilitator note</b>{material.facilitatorNote}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="studio-bridge" aria-labelledby="bridge-title">
          <div className="studio-bridge-copy">
            <p className="studio-kicker">Turn material into a local lesson</p>
            <h2 id="bridge-title">The PDF opens the question. <em>The record makes it local.</em></h2>
            <p>
              Use the map and published evidence as a second source. Learners can compare a deck&rsquo;s
              ideas with what is actually known, unknown and being worked on near them.
            </p>
          </div>
          <nav className="studio-tools" aria-label="Educator tools">
            <Link href="/map"><MapPinned size={20} /><span><b>Open a locality</b>Map records and gaps</span><ArrowUpRight size={15} /></Link>
            <Link href="/insights"><ChartColumn size={20} /><span><b>Read the evidence</b>Patterns with provenance</span><ArrowUpRight size={15} /></Link>
            <Link href="/stories"><BookOpenCheck size={20} /><span><b>Follow a full story</b>From sighting to care</span><ArrowUpRight size={15} /></Link>
          </nav>
        </section>

        <section className="studio-guides" aria-labelledby="guides-title">
          <header className="studio-section-head">
            <div>
              <p className="studio-kicker">StrayPaw quick guides</p>
              <h2 id="guides-title">Three things worth leaving the room with</h2>
            </div>
            <p>Short operational guidance, kept separate from the partner PDFs.</p>
          </header>
          <ol>
            {QUICK_GUIDES.map((guide, index) => (
              <li key={guide.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{guide.title}</h3>
                <p>{guide.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PlatformShell>
  );
}
