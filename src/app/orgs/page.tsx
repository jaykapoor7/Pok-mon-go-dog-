import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DeskHeader } from "@/components/app/DeskHeader";
import { AppShell } from "@/components/app/AppShell";
import { OrgMark } from "@/components/orgs/OrgMark";
import { CampaignStrip } from "@/components/orgs/CampaignStrip";
import { getPartnerDirectory, type DirectoryOrg } from "@/lib/partners";
import { getPublicProgrammes } from "@/lib/public-programmes";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organisations on the record, StrayPaw",
  description: "StrayPaw's partner NGOs and record contributors, and their campaigns.",
};

/* ════════════════════════════════════════════════════════════════════
   Organisations on the record: every organisation is a field partner and
   has one quiet row: its mark, where it is, and a link to its profile.
   What each has done is told once, in the campaigns below, where the
   animals and the work sit against a drive and its dates.
   ════════════════════════════════════════════════════════════════════ */

export default async function OrgsPage() {
  const [dir, campaigns] = await Promise.all([
    getPartnerDirectory(),
    getPublicProgrammes(60).catch(() => []),
  ]);
  const rows = [...dir].sort((a, b) => a.name.localeCompare(b.name));
  const logos = Object.fromEntries(dir.map((o) => [o.slug, o.logoUrl]));

  return (
    <AppShell>
      <div className="pp">
        <DeskHeader
          kicker="The shared network"
          title="Organisations on the record"
          lede="The field partners keeping the shared record. What each has done is in its campaigns below."
          figures={[
            { label: rows.length === 1 ? "field partner" : "field partners", value: rows.length },
            { label: campaigns.length === 1 ? "campaign published" : "campaigns published", value: campaigns.length, tone: "quiet" },
          ]}
        />

        <ol className="pp-dir" aria-label="Organisations">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/org/${o.slug}`}>
                <OrgMark name={o.name} logoUrl={o.logoUrl} size={44} />
                <span className="pp-dir-who">
                  <b>{o.name}</b>
                  <small>{[o.city, o.state].filter(Boolean).join(", ") || "India"}</small>
                </span>
                <span className="pp-tag is-partner">Field partner</span>
                <ArrowUpRight size={16} aria-hidden className="pp-dir-go" />
              </Link>
            </li>
          ))}
        </ol>

        {campaigns.length > 0 && (
          <section className="pp-camps" id="campaigns" aria-labelledby="pp-camps-h">
            <header>
              <h2 id="pp-camps-h">Campaigns</h2>
              <p>What each partner has done: the animals, the care and the drive they belong to, on one time axis.</p>
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
