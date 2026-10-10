import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DeskHeader } from "@/components/app/DeskHeader";
import { PhoneFold, PhoneTabs } from "@/components/shell/PhoneTabs";
import { AppShell } from "@/components/app/AppShell";
import { OrgMark } from "@/components/orgs/OrgMark";
import { CampaignStrip } from "@/components/orgs/CampaignStrip";
import { getPartnerDirectory, type DirectoryOrg } from "@/lib/partners";
import { getPublicProgrammes } from "@/lib/public-programmes";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partners, NGOs and data sources, StrayPaw",
  description: "Who StrayPaw works with, which NGOs are listed, and which organisations' published data the record draws on. Using published data is not a partnership.",
  alternates: { canonical: "/orgs" },
};

/* ════════════════════════════════════════════════════════════════════
   Three different relationships, kept apart:
     Field partners     a verified working relationship
     NGOs on StrayPaw   listed in the directory or invited to use it
     Data sources       organisations and platforms whose published data
                        the record draws on, under their licence
   Only the first is a partnership. A source is listed because its data is
   used, never because it has agreed to anything.
   ════════════════════════════════════════════════════════════════════ */

function Rows({ list, tag, tone }: { list: DirectoryOrg[]; tag: string; tone?: "partner" }) {
  return (
    <ol className="pp-dir" aria-label={tag}>
      {list.map((o) => (
        <li key={o.id}>
          <Link href={`/org/${o.slug}`}>
            <OrgMark name={o.name} logoUrl={o.logoUrl} size={44} />
            <span className="pp-dir-who">
              <b>{o.name}</b>
              <small>{[o.city, o.state].filter(Boolean).join(", ") || "India"}</small>
            </span>
            <span className={`pp-tag${tone === "partner" ? " is-partner" : ""}`}>{tag}</span>
            <ArrowUpRight size={16} aria-hidden className="pp-dir-go" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function OrgsPage() {
  const [dir, campaigns] = await Promise.all([
    getPartnerDirectory(),
    getPublicProgrammes(60).catch(() => []),
  ]);
  const byName = (a: DirectoryOrg, b: DirectoryOrg) => a.name.localeCompare(b.name);
  const partners = dir.filter((o) => o.kind === "Field partner").sort(byName);
  const listed = dir.filter((o) => o.kind === "Listed NGO").sort(byName);
  const sources = dir.filter((o) => o.kind === "Data source").sort(byName);
  const logos = Object.fromEntries(dir.map((o) => [o.slug, o.logoUrl]));

  return (
    <AppShell>
      <div className="pp">
        <DeskHeader
          kicker="Who is on the record"
          title="Partners, NGOs and data sources"
          lede="Field partners work with StrayPaw directly. Listed NGOs are in the directory. Data sources are organisations whose published records the map draws on; they are not partners."
          figures={[
            { label: partners.length === 1 ? "field partner" : "field partners", value: partners.length },
            { label: listed.length === 1 ? "listed NGO" : "listed NGOs", value: listed.length, tone: "quiet" },
            { label: sources.length === 1 ? "data source" : "data sources", value: sources.length, tone: "quiet" },
          ]}
        />

        <PhoneTabs label="Sections" tabs={[
          { id: "partners", label: `Partners · ${partners.length + listed.length}`, node: (
            <div className="pp-groups">
              <section aria-labelledby="pp-fp-h">
                <h2 id="pp-fp-h" className="pp-gh">Field partners</h2>
                <p className="pp-gp">Verified working relationships. Their cases and care appear in the campaigns below.</p>
                {partners.length > 0 ? <Rows list={partners} tag="Field partner" tone="partner" /> : <p className="pp-gp">No field partner is listed yet.</p>}
              </section>
              {listed.length > 0 && (
                <section aria-labelledby="pp-ln-h">
                  <h2 id="pp-ln-h" className="pp-gh">NGOs on StrayPaw</h2>
                  <p className="pp-gp">Listed in the directory or invited to use StrayPaw. Listing is not a partnership.</p>
                  <PhoneFold count={5} total={listed.length} noun="NGOs"><Rows list={listed} tag="Listed NGO" /></PhoneFold>
                </section>
              )}
            </div>
          ) },
          { id: "sources", label: `Data sources · ${sources.length}`, node: sources.length > 0 ? (
            <section aria-labelledby="pp-ds-h">
              <h2 id="pp-ds-h" className="pp-gh">Where published records come from</h2>
              <p className="pp-gp">Governments, researchers and public platforms whose published data StrayPaw imports under the licence shown on each <Link href="/evidence">evidence page</Link>. They have not necessarily endorsed or reviewed StrayPaw, and are not partners.</p>
              <PhoneFold count={6} total={sources.length} noun="sources"><Rows list={sources} tag="Data source" /></PhoneFold>
            </section>
          ) : null },
          { id: "campaigns", label: "Campaigns", node: campaigns.length > 0 ? (
          <section className="pp-camps" id="campaigns" aria-labelledby="pp-camps-h">
            <header>
              <h2 id="pp-camps-h">Campaigns</h2>
              <p>What each partner has done: the animals, the care and the drive they belong to, on one time axis.</p>
            </header>
            <CampaignStrip campaigns={campaigns} logos={logos} />
          </section>
          ) : null },
          { id: "join", label: "Join", node: (
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
          ) },
        ]} />
      </div>
    </AppShell>
  );
}
