import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PLATFORM, SOLUTIONS } from "@/sp3/site/nav-data";
import { CtaBand, PageHead, S3Page, SecHead } from "@/sp3/site/Sections";

export const metadata = { title: "Solutions · StrayPaw", description: "StrayPaw for municipalities, NGOs, ABC/ARV programmes, rescue and care, and funders." };

const MORE = [
  { href: "/for-community", label: "Community", hint: "Report an animal and follow what is recorded next. Free, no account." },
  { href: "/for-feeders", label: "Feeders", hint: "Know the animals on your route and keep their sightings together." },
  { href: "/education", label: "Education", hint: "Courses, workshops and credited teaching materials." },
];

export default function SolutionsPage() {
  return (
    <S3Page>
      <PageHead eyebrow="Solutions" title="One operating record, for everyone who runs a programme." lede="Municipal ABC/ARV programmes are where StrayPaw starts. Rescue, care and funder reporting run on the same records." />
      <section className="s3-wrap" style={{ paddingBottom: 72 }}>
        <div className="s3-grid-3">
          {SOLUTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="s3-card s3-feature"><span className="s3-ico" aria-hidden>{s.icon}</span><h3>{s.label}</h3><p>{s.hint}</p><span className="s3-link" style={{ fontSize: 14 }}>Explore <ArrowRight size={13} /></span></Link>
          ))}
        </div>
      </section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Also on StrayPaw" title="Public tools, free for everyone." />
        <div className="s3-rows">{MORE.map((m) => <Link key={m.href} href={m.href}><div><b>{m.label}</b><p>{m.hint}</p></div><ArrowRight size={18} /></Link>)}</div>
      </div></section>
      <section className="s3-sec is-line"><div className="s3-wrap">
        <SecHead eyebrow="Platform" title="What every solution is built on." />
        <div className="s3-rows">{PLATFORM.map((m) => <Link key={m.href} href={m.href}><div><b>{m.label}</b><p>{m.hint}</p></div><ArrowRight size={18} /></Link>)}</div>
      </div></section>
      <CtaBand title="Not sure where to start?" lede="Tell us about your programme and we will show you the relevant workflow." />
    </S3Page>
  );
}
