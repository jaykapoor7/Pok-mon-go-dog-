import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrgMark } from "@/components/orgs/OrgMark";
import { CampaignStrip } from "@/components/orgs/CampaignStrip";
import { getPartnerDirectory, type DirectoryOrg } from "@/lib/partners";
import { getPublicOrgImpact } from "@/lib/org-public";
import { getPublicProgrammes } from "@/lib/public-programmes";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partner NGOs, StrayPaw",
  description: "The organisations working on StrayPaw's shared record, the bodies whose published data it draws on, and their campaigns.",
};

/* ════════════════════════════════════════════════════════════════════
   Partner NGOs: every organisation on the record, one quiet row each, and
   their campaigns on one time axis. A row carries the organisation's mark,
   where it is, a small tag saying what it is, and what its record holds
   today when it holds anything. Each opens the organisation's profile.
   ════════════════════════════════════════════════════════════════════ */

const fmt = (n: number) => n.toLocaleString("en-IN");

async function withCount(o: DirectoryOrg) {
  const impact = await getPublicOrgImpact(o.id).catch(() => null);
  return { o, animals: impact?.animalsRecorded ?? 0, cases: impact?.caseRecords ?? 0 };
}

export default async function OrgsPage() {
  const [dir, campaigns] = await Promise.all([getPartnerDirectory(), getPublicProgrammes(60).catch(() => [])]);
  const rows = await Promise.all(dir.map(withCount));
  rows.sort((a, b) => Number(b.o.kind === "Field partner") - Number(a.o.kind === "Field partner") || b.animals + b.cases - (a.animals + a.cases) || a.o.name.localeCompare(b.o.name));
  const logos = Object.fromEntries(dir.map((o) => [o.slug, o.logoUrl]));

  return (
    <AppShell>
      <div className="pp">
        <header className="pp-head">
          <h1>Partner NGOs</h1>
          <p>The organisations working on the shared record, and the public bodies and projects whose published data it draws on. Every figure is their own record, live.</p>
        </header>

        <ol className="pp-dir" aria-label="Organisations">
          {rows.map(({ o, animals, cases }) => (
            <li key={o.id}>
              <Link href={`/org/${o.slug}`}>
                <OrgMark name={o.name} logoUrl={o.logoUrl} size={44} />
                <span className="pp-dir-who">
                  <b>{o.name}</b>
                  <small>{[o.city, o.state].filter(Boolean).join(", ") || "India"}</small>
                </span>
                <span className={`pp-tag ${o.kind === "Field partner" ? "is-partner" : ""}`}>{o.kind}</span>
                <span className="pp-dir-n sys-mono">
                  {animals ? `${fmt(animals)} animal${animals === 1 ? "" : "s"}` : cases ? `${fmt(cases)} request${cases === 1 ? "" : "s"}` : null}
                </span>
                <ArrowUpRight size={16} aria-hidden className="pp-dir-go" />
              </Link>
            </li>
          ))}
        </ol>

        {campaigns.length > 0 && (
          <section className="pp-camps" id="campaigns" aria-labelledby="pp-camps-h">
            <header>
              <h2 id="pp-camps-h">Campaigns</h2>
              <p>Drives and programmes the organisations have published, each on the same time axis.</p>
            </header>
            <CampaignStrip campaigns={campaigns} logos={logos} />
          </section>
        )}

        <section className="pp-join" aria-labelledby="pp-join-h">
          <div>
            <h2 id="pp-join-h">Bring your field records. <em>Keep them yours.</em></h2>
            <p>Animal-welfare organisations join free. Your cases, care and animals stay under your control; you decide what the public sees.</p>
          </div>
          <div className="pp-join-acts">
            <Link href="/partner-apply" className="sys-btn is-flame">Apply to partner <ArrowUpRight size={15} /></Link>
            <Link href="/for-ngos" className="pp-link">How it works for NGOs <ArrowUpRight size={14} /></Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
