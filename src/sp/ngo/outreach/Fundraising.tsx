"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Fundraising (1.0 /partner/fundraising).

   Real needs turned into campaigns. StrayPaw links out to the
   organisation's own donation page and never holds the money, so any
   amount raised is what the organisation reported, never a verified
   total, and the page never sums reported amounts into one figure.
   Cover photos are blurred: a fundraiser often shows an injured animal.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { formatINR } from "@/lib/fundraisers";
import { fundraiserCategory, type Fundraiser } from "@/lib/types";
import { Btn, Empty, Head, More, Note, Page, Panel, Section, Table, Tag, type Col } from "@/ws/kit";
import { useMembership } from "../../shell/Shell";
import { day, n } from "../../ui";
import { Reading } from "../../ui/Reading";
import { readOrgFundraisers } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../org.k.css";

/* Common needs prefill a new campaign's title. */
export const NEEDS = ["Emergency treatment", "Rescue operation", "Veterinary medicines", "Mobile veterinary ambulance", "Vaccination drive", "Rehabilitation"];

export function Fundraising() {
  const mem = useMembership();
  const [rows, setRows] = useState<Fundraiser[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const load = useCallback(async () => {
    setFailed(null); setRows(null);
    try { setRows(await readOrgFundraisers()); } catch (e) { setFailed(e instanceof Error ? e.message : "The campaigns could not be read."); }
  }, []);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const active = rows?.filter((r) => r.status === "active").length ?? 0;

  const cols: Col<Fundraiser>[] = [
    { key: "title", label: "Campaign", width: "minmax(0, 1.6fr)", render: (c) => <span className="og-cell">{c.cover_photo ? <span className="fr-thumb"><SensitiveVeil sensitive id={c.cover_photo} compact>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.cover_photo} alt="" loading="lazy" onError={e => (e.currentTarget.style.display = "none")} /></SensitiveVeil></span> : null}<span>{c.title}<span className="og-tail">{fundraiserCategory(c.category).label}{c.case_id ? " · linked to a case" : ""}</span></span></span> },
    { key: "status", label: "Status", width: "88px", keep: true, render: (c) => <Tag tone={c.status === "active" ? "green" : "plain"}>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</Tag> },
    { key: "goal", label: "Goal", width: "96px", align: "end", render: (c) => (c.goal_amount ? formatINR(c.goal_amount) : <span className="og-nr">no goal</span>) },
    { key: "raised", label: "Raised (reported, not verified)", width: "200px", align: "end", render: (c) => { const pct = c.goal_amount && c.raised_reported ? Math.min(100, Math.round((c.raised_reported / c.goal_amount) * 100)) : null; return c.raised_reported != null ? <>{formatINR(c.raised_reported)}{pct != null ? ` · ${pct}%` : ""}</> : <span className="og-nr">not reported</span>; } },
    { key: "by", label: "Needed by", width: "104px", render: (c) => (c.deadline ? day(c.deadline) : <span className="og-nr">no date</span>) },
    { key: "started", label: "Started", width: "minmax(0, 1fr)", render: (c) => <>{day(c.created_at)}{c.created_by_name ? <span className="og-tail">{c.created_by_name}</span> : null}</> },
    { key: "acts", label: "", width: "auto", align: "end", render: (c) => <span className="og-acts"><Btn small href={`/fundraisers/${c.id}`}>Open</Btn>{c.case_id && <Btn small variant="quiet" href={`/ngo/cases/${c.case_id}`}>Case</Btn>}</span> },
  ];

  return (
    <NgoGate title="Fundraising" lede="Turn real needs into campaigns that link to your own donation page.">
      <Page>
        <Head title="Fundraising"
          sum={<>{rows ? <><b>{n(rows.length)}</b> campaign{rows.length === 1 ? "" : "s"}, <b>{n(active)}</b> active. </> : failed ? "Your campaigns could not be read. Nothing is shown as none. " : <><Reading>Reading your campaigns</Reading>{" "}</>}Donors pay you directly through your own link; StrayPaw never holds the money.</>}
          actions={<Btn variant="primary" href="/ngo/fundraising/new" icon={<Plus size={14} />}>New campaign</Btn>} />

        {failed ? (
          <Note tone="flame" action={<Btn small onClick={() => void load()}>Try again</Btn>}>Didn&rsquo;t load. {failed}</Note>
        ) : rows === null ? (
          <div className="og-skel" aria-busy="true"><i /><i /><i /></div>
        ) : (
          <Panel>
            <More items={rows} cap={12} noun="campaigns">{(shown) => (
              <Table label="Your campaigns" cols={cols} rows={shown} rowKey={(c) => c.id}
                empty={<Empty title="No campaigns yet">Pick a need below or start your own. You&apos;ll need a donation link.</Empty>} />
            )}</More>
          </Panel>
        )}

        <Section title="Start from a need">
          <div className="og-go">{NEEDS.map((x) => <Btn key={x} small href={`/ngo/fundraising/new?title=${encodeURIComponent(x)}`}>{x}</Btn>)}</div>
        </Section>
      </Page>
    </NgoGate>
  );
}
