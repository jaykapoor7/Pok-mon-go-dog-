"use client";

import { Holding, TabbedPage, useTab, useWho } from "./parts";
import { DrivesTab } from "./prog/Drives";
import { ZonesTab } from "./prog/Zones";
import { SurveysTab } from "./prog/Surveys";
import { FeedingTab, FundraisingTab } from "./prog/Outreach";

/* Programmes: the organisation's drives and the zones they are worked in, surveys and registers, feeding spots and
   fundraising. What is recorded, reviewed and verified are said apart; nothing here estimates a population. */

const TABS = [{ slug: "drives", label: "Drives" }, { slug: "zones", label: "Zones" }, { slug: "surveys", label: "Surveys" }, { slug: "feeding", label: "Feeding spots" }, { slug: "fundraising", label: "Fundraising" }] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Programmes"];

export function Programmes({ tab: initial, title, caseId }: { tab?: string | null; title?: string | null; caseId?: string | null }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Programmes" text="Your account is not part of an NGO. A government or coordinating office sees its programmes under Government & Programmes." />;
  return (
    <TabbedPage id="prog" crumb={CRUMB} title="Programmes" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample}
      sub="Drives and the zones they are worked in, surveys and registers, feeding spots and fundraising."
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "Drives" ? <DrivesTab who={who} />
        : tab === "Zones" ? <ZonesTab who={who} />
        : tab === "Surveys" ? <SurveysTab who={who} />
        : tab === "Feeding spots" ? <FeedingTab who={who} />
        : <FundraisingTab who={who} title={title} caseId={caseId} />}
    </TabbedPage>
  );
}
