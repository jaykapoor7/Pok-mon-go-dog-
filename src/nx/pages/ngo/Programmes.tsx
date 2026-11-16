"use client";

import { Holding, TabbedPage, useTab, useWho } from "./frame";
import { DrivesTab } from "./prog/Drives";
import { ZonesTab } from "./prog/Zones";
import { SurveysTab } from "./prog/Surveys";

/* Programmes: the organisation's drives and the zones they are worked in, and its surveys and registers. What is
   recorded, reviewed and verified are said apart; nothing here estimates a population. (Feeding spots and fundraising,
   features of the old public site, were taken out of the NGO workspace on 16 Nov 2026; their tables are untouched.) */

const TABS = [{ slug: "drives", label: "Drives" }, { slug: "zones", label: "Zones" }, { slug: "surveys", label: "Surveys" }] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Programmes"];

export function Programmes({ tab: initial }: { tab?: string | null; title?: string | null; caseId?: string | null }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Programmes" text="Your account is not part of an NGO. A government or coordinating office sees its programmes under Government & Programmes." />;
  return (
    <TabbedPage id="prog" crumb={CRUMB} title="Programmes" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample}
      sub="Drives and the zones they are worked in, and your surveys and registers."
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "Drives" ? <DrivesTab who={who} />
        : tab === "Zones" ? <ZonesTab who={who} />
        : <SurveysTab who={who} />}
    </TabbedPage>
  );
}
