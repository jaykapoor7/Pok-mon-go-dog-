import Link from "next/link";
import { ArrowRight, BookOpen, Database, FlaskConical, Scale } from "lucide-react";
import { PageHead, S4Page, SecHead, Tiles, TwoTone } from "@/sp4/site/kit";
import { Rise } from "@/sp4/site/Rise";
import "@/sp4/home/home4.css";

export const metadata = { title: "Research · StrayPaw", description: "Methods, sources and the research archive: how StrayPaw separates published research datasets from operational programme records." };

const ARCHIVE: [string, string, string][] = [
  ["HSI Jamshedpur CNVR clinical records, 2013–2016", "Humane World for Animals / HSI", "Research dataset"],
  ["Mission Rabies Ranchi, 2014–2015", "Mission Rabies", "Public dataset"],
  ["IISER Kolkata free-ranging dog studies", "IISER Kolkata (9 published datasets)", "Public datasets"],
  ["iNaturalist observations", "iNaturalist contributors, CC licences", "Public observations"],
];

export default function ResearchPage() {
  return (
    <S4Page close={undefined}>
      <PageHead title={<TwoTone a="Research, kept apart" b="from operations" />} lede="Published research datasets help programmes plan. They are not programme work, so StrayPaw keeps them in a research archive with their sources and licences, and never counts them in operational figures." actions={<><Link href="/evidence" className="s4-btn is-primary">Read the evidence</Link><Link href="/research-standards" className="s4-btn is-line">Research standards</Link></>} />

      <section className="s4-sec" aria-labelledby="rs-archive">
        <div className="s4-wrap">
          <SecHead id="rs-archive" title={<TwoTone a="The research" b="archive" />} lede="These datasets were imported for reference. They are attributed to their authors, stay labelled as research, and are being moved out of public operational counts." />
          <div style={{ borderTop: "1px solid var(--s4-line)" }}>
            {ARCHIVE.map(([t, o, k]) => (
              <Rise key={t} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 24, alignItems: "center", padding: "22px 0", borderBottom: "1px solid var(--s4-line)" }}>
                <div><b style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.02em" }}>{t}</b><p className="s4-body" style={{ marginTop: 4 }}>{o}</p></div>
                <span className="s4-tag">{k}</span>
              </Rise>
            ))}
          </div>
        </div>
      </section>

      <section className="s4-sec" aria-labelledby="rs-method">
        <div className="s4-wrap">
          <SecHead id="rs-method" title={<TwoTone a="How we treat" b="every number" />} />
          <Tiles items={[
            { icon: <Database size={20} />, title: "Recorded, not estimated", body: "A count is a count of records. It is never presented as a population estimate." },
            { icon: <Scale size={20} />, title: "Source on every row", body: "Each imported row keeps its file, batch and organisation, so any figure can be traced back." },
            { icon: <FlaskConical size={20} />, title: "Research stays research", body: "Research and public datasets are not counted as operational work on StrayPaw." },
            { icon: <BookOpen size={20} />, title: "Cited and licensed", body: "Datasets are credited to their authors with their licence, and removed on request." },
          ]} />
          <p style={{ marginTop: 32 }}><Link href="/evidence" className="s4-link">Published evidence on ABC and rabies control <ArrowRight size={18} aria-hidden /></Link></p>
        </div>
      </section>
    </S4Page>
  );
}
