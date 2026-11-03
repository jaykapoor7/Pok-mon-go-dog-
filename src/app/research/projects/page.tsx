import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHead, S4Page, TwoTone } from "@/sp4/site/kit";
import { PROJECTS, STATUS_LABEL, type Status } from "@/sp4/research/catalogue";
import "@/sp4/home/home4.css";
import "@/sp4/research/research.css";

export const metadata = { title: "Projects · StrayPaw Research", description: "StrayPaw research by status: published, in progress and proposed." };

export default function ProjectsPage() {
  return (
    <S4Page close={undefined} className="rs-sub">
      <PageHead eyebrow={<Link href="/research">StrayPaw Research</Link>} title={<TwoTone a="Research" b="projects" />}
        lede="Status is stated plainly. Published means a public, citable output; in progress means work under way with no finding claimed; proposed means no data has been collected." />
      {(["published", "in_progress", "proposed"] as Status[]).map((s) => {
        const list = PROJECTS.filter((p) => p.status === s);
        return (
          <section key={s} id={s} className="s4-sec" aria-labelledby={`h-${s}`}><div className="s4-wrap">
            <h2 id={`h-${s}`} className="s4-h2"><span className={`rs-pill is-${s}`}>{STATUS_LABEL[s]}</span></h2>
            {list.length === 0 ? <p className="s4-body">{s === "published" ? "Nothing yet. StrayPaw has not published a research paper; this list will show citable outputs when they exist." : "None."}</p> : (
              <ul className="rs-proj">{list.map((p) => <li key={p.title}><h3>{p.title}</h3><p>{p.summary}</p><p className="rs-note">{p.evidence}</p>{p.href && <Link href={p.href.href} className="s4-link">{p.href.label} <ArrowRight size={16} aria-hidden /></Link>}</li>)}</ul>
            )}
          </div></section>
        );
      })}
    </S4Page>
  );
}
