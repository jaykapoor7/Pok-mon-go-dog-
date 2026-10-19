import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import { getListedOrganisations, getOperationalPartners } from "@/lib/partners";

export const revalidate = 300;
export const metadata = {
  title: "For Organisations, StrayPaw",
  description: "StrayPaw for animal welfare NGOs, municipal teams, partners and funders: owned rescue cases, city briefs and evidence reports. Free for verified organisations.",
};

/* ════════════════════════════════════════════════════════════════════
   For Organisations: who StrayPaw is built for, what each of them does
   with it, how to start, and who is on it today. Listing is never
   described as a partnership; only a verified field partner is one.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");
const ask = (s: string) => `/contact?subject=${encodeURIComponent(s)}`;

const WHO = [
  { i: "Animal welfare organisations", t: "Run rescue on a system", d: "Every report from WhatsApp and the web lands in one inbox and becomes a case someone owns.", li: ["Owned cases with states and outcomes", "Treatment, ABC and follow-ups on one animal history", "Bring your existing register, keep its credit", "Exports for your partners"], href: "/for-ngos", cta: "StrayPaw for NGOs", talk: "NGO access" },
  { i: "Municipal teams", t: "See where help is needed", d: "A brief per city built from the record, area by area, with the limits of the evidence stated.", li: ["Requests and care by locality", "Recorded, not recorded and unknown kept apart", "Map of coverage and gaps", "Briefs you can publish"], href: "/for-governments", cta: "StrayPaw for cities", talk: "Municipal enquiry" },
  { i: "Partners and funders", t: "Fund work you can check", d: "Outcomes reported from the record, with every figure's source and scope named.", li: ["Live work separate from imported history", "Evidence reports as PDF", "Method published openly"], href: "/for-funders", cta: "StrayPaw for funders", talk: "Funding and partnerships" },
];

const START = [
  { t: "Apply", d: "Tell us who you are and where you work. It takes a few minutes." },
  { t: "Verification", d: "We check the organisation before any access is given. Free for verified organisations." },
  { t: "Join with a code", d: "Your team signs in with an invite code and gets its own workspace and roles." },
  { t: "Bring your records", d: "Import your existing register. It stays yours and is credited on every record." },
];

export default async function OrganisationsPage() {
  const [partners, listed] = await Promise.all([
    getOperationalPartners().catch(() => []),
    getListedOrganisations().catch(() => ({ members: [], sources: [] })),
  ]);

  return (
    <CoShell
      kicker="For Organisations"
      title={<>Every rescue needs a system. <em>Yours, free.</em></>}
      lede="For NGOs, municipal teams and the people who fund them: one record of requests, care and outcomes, shared on your terms."
      actions={<>
        <Link href="/partner-apply" className="co3-btn is-flame">Apply to join <ArrowUpRight size={17} aria-hidden /></Link>
        <Link href="/join" className="co3-btn is-line">I have an invite code</Link>
      </>}
    >
      <CoSec n="01" title={<>Who it is <em>for.</em></>}>
        <div className="co3-caps">
          {WHO.map((w, i) => (
            <article key={w.t} className={`co3-cap${i === 0 ? " is-wide" : ""}`}>
              <i>{w.i}</i>
              <h3>{w.t}</h3>
              <p>{w.d}</p>
              <ul>{w.li.map((x) => <li key={x}>{x}</li>)}</ul>
              <Link href={w.href}>{w.cta} <ArrowUpRight size={14} aria-hidden /></Link>
            </article>
          ))}
        </div>
      </CoSec>

      <CoSec n="02" title={<>How to <em>start.</em></>}>
        <ol className="co3-list">{START.map((s) => <li key={s.t}><b>{s.t}</b><span>{s.d}</span></li>)}</ol>
        <div className="co3-acts">
          <Link href="/partner-apply" className="co3-btn is-ink">Apply to join</Link>
          <Link href="/join" className="co3-btn is-out">Sign in with your code</Link>
        </div>
      </CoSec>

      <CoSec n="03" title={<>Who is on it <em>today.</em></>}>
        {partners.length > 0 && <>
          <p className="is-lead">Field partner</p>
          <ul className="co3-names">{partners.map((p) => <li key={p.id}><b>{p.name}</b><small>{[p.city, p.state].filter(Boolean).join(", ")}</small></li>)}</ul>
        </>}
        {listed.members.length > 0 && <>
          <p>{fmt(listed.members.length)} organisations are listed on StrayPaw. Listing is not a partnership.</p>
          <ul className="co3-names">{listed.members.map((o) => <li key={o.id}><b>{o.name}</b><small>{[o.city, o.state].filter(Boolean).join(", ") || "India"}</small></li>)}</ul>
        </>}
        {listed.sources.length > 0 && <p>Published records from {fmt(listed.sources.length)} organisations are imported under their licence and credited on every record. No relationship is implied. <Link href="/evidence">Sources</Link>.</p>}
        <p><Link href="/community/organisations">The full directory</Link></p>
      </CoSec>

      <CoSec n="04" title={<>Talk to <em>us.</em></>}>
        <ul className="co3-names">
          {WHO.map((w) => <li key={w.talk}><b><Link href={ask(w.talk)}>{w.talk}</Link></b><small>{w.i}</small></li>)}
          <li><b><Link href={ask("Data import")}>Bringing an existing register</Link></b><small>Spreadsheets and past records</small></li>
        </ul>
      </CoSec>
    </CoShell>
  );
}
