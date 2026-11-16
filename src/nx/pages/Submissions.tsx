"use client";

import { Holding, TabbedPage, useTab, useWho } from "./ngo/frame";
import { PackagesTab } from "./ngo/subs/Packages";
import { EvidenceTab } from "./ngo/subs/Evidence";
import { ContractsTab } from "./ngo/subs/Contracts";
import { DocumentsTab } from "./ngo/subs/Documents";
import { ExportsTab } from "./ngo/subs/Exports";
import { QualityTab } from "./ngo/subs/Quality";

/* Submissions & Reports: what the organisation sends, or prepares to send, to a reviewing office, and the records
   and documents behind it. The office decides; accepted means approved for payment, not paid. */

const TABS = [
  { slug: "packages", label: "Packages" }, { slug: "evidence", label: "Evidence readiness" }, { slug: "contracts", label: "Contracts" },
  { slug: "documents", label: "Documents" }, { slug: "exports", label: "Exports" }, { slug: "quality", label: "Record quality" },
] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Submissions & Reports"];

export function Submissions({ tab: initial, stage }: { tab?: string | null; stage?: string | null }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Submissions & Reports" text="Your organisation is not an NGO workspace. Packages sent to a reviewing office appear under Verification there." />;
  return (
    <TabbedPage id="subs" crumb={CRUMB} title="Submissions & Reports" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample}
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "Packages" ? <PackagesTab who={who} />
        : tab === "Evidence readiness" ? <EvidenceTab who={who} stage={stage} />
        : tab === "Contracts" ? <ContractsTab who={who} />
        : tab === "Documents" ? <DocumentsTab who={who} />
        : tab === "Exports" ? <ExportsTab who={who} />
        : <QualityTab who={who} />}
    </TabbedPage>
  );
}
