"use client";

/* NGO · one drive: its partition, its animals, and the honest share
   statements (share of known, share of all) side by side. The animals are
   the table; the two partitions sit beside it (under it in a peek). */

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { campaignAnimals, campaignStats, KIND_LABEL, type CampaignAnimal, type CampaignStats } from "@/lib/campaigns";
import { downloadCsv } from "@/lib/csv";
import { Btn, Empty, Head, Lanes, More, Page, Panel, Section, Split, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { Portrait } from "../ui/Portrait";
import { Ack, day, n } from "../ui";
import { archiveDrive, type Receipt } from "../data/work";
import { Partition } from "./Ledger";
import { NgoGate } from "./Gate";
import "./org.k.css";

const pct = (v: number | null) => (v === null || v === undefined ? "not computable" : `${Math.round(v)}%`);
type Ster = "" | "sterilised" | "not_sterilised" | "unknown";

export function Programme({ id }: { id: string }) {
  const [s, setS] = useState<CampaignStats | null | "missing">(null);
  const [animals, setAnimals] = useState<CampaignAnimal[] | null>(null);
  const [ster, setSter] = usePageState<Ster>("ster", "");
  const [r, setR] = useState<Receipt | null>(null);
  const load = useCallback(async () => { const x = await campaignStats(id).catch(() => null); setS(x ?? "missing"); }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setAnimals(null); campaignAnimals(id, ster || null).then(setAnimals).catch(() => setAnimals([])); }, [id, ster]);

  const cols: Col<CampaignAnimal>[] = [
    { key: "animal", label: "Animal", width: "minmax(0, 1.4fr)", render: (a) => <span className="og-cell dr-animal"><Portrait src={a.cover_photo} tag={a.code ?? a.name ?? "Animal"} sensitive={a.needs_help} size="s" /><span>{a.name ?? a.code ?? "Unnamed"}<span className="og-tail og-mono">{a.code ?? "no code"}</span></span></span> },
    { key: "zone", label: "Locality", render: (a) => a.zone ?? <span className="og-nr">not recorded</span> },
    { key: "ster", label: "Sterilisation", width: "128px", keep: true, render: (a) => <Tag tone={a.sterilisation_status === "sterilised" ? "green" : "plain"}>{a.sterilisation_status === "sterilised" ? "Sterilised" : a.sterilisation_status === "unknown" ? "Not recorded" : "Recorded not"}</Tag> },
    { key: "vacc", label: "Vaccination", width: "128px", render: (a) => <Tag tone={a.vaccination_status === "vaccinated" ? "green" : "plain"}>{a.vaccination_status === "vaccinated" ? "Vaccinated" : a.vaccination_status === "unknown" ? "Not recorded" : "Recorded not"}</Tag> },
    { key: "help", label: "", width: "88px", render: (a) => (a.needs_help ? <Tag tone="flame">Needs help</Tag> : null) },
  ];

  return (
    <NgoGate title="Drive" lede="One drive and the animals filed into it.">
      <Page>
        {s === null ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : s === "missing" ? <Panel><Empty title="Not available" action={<Btn href="/ngo/programmes">All drives</Btn>}>This drive is not readable with your organisation&rsquo;s access, or it does not exist.</Empty></Panel> : (
          <>
            <Head title={s.name}
              sum={<>{KIND_LABEL[s.kind]} drive{s.archived ? ", archived" : ""} · {[s.zone, s.starts_on && `from ${day(s.starts_on)}`, s.ends_on && `to ${day(s.ends_on)}`].filter(Boolean).join(" · ") || "No dates recorded"}. <b>{n(s.total)}</b> animals from <b>{n(s.observations)}</b> observations by <b>{n(s.people)}</b> people{s.needs_help > 0 ? <>, <span className="is-hot">{n(s.needs_help)} need help</span></> : null}.</>}
              actions={<>
                <Btn icon={<Download size={14} />} disabled={!animals?.length} onClick={() => downloadCsv(`straypaw-drive-${s.name.replace(/\W+/g, "-").toLowerCase()}.csv`, (animals ?? []).map((a) => ({ code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, filed: a.created_at })))}>Animals as CSV</Btn>
                <Btn variant="quiet" onClick={async () => { setR(null); const x = await archiveDrive(s.id, !s.archived); setR(x); if (x.ok) void load(); }}>{s.archived ? "Restore" : "Archive"}</Btn>
              </>} />
            <div aria-live="polite" className="og-receipt">{r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not changed: {r.error}</Ack>)}</div>
            <Split side={<>
              <Section title="Sterilisation">
                <Panel pad>
                  <Partition yes={s.sterilised} no={s.not_sterilised} unknown={s.ster_unknown} yesLabel="sterilised" />
                  <dl className="og-facts dr-share"><div><dt>Of those recorded</dt><dd>{pct(s.ster_pct_of_known)} sterilised</dd></div><div><dt>Of all animals filed</dt><dd>{pct(s.ster_pct_of_all)} recorded sterilised</dd></div></dl>
                </Panel>
              </Section>
              <Section title="Vaccination">
                <Panel pad>
                  <Partition yes={s.vaccinated} no={s.not_vaccinated} unknown={s.vacc_unknown} yesLabel="vaccinated" />
                  <dl className="og-facts dr-share"><div><dt>Of those recorded</dt><dd>{pct(s.vacc_pct_of_known)} vaccinated</dd></div><div><dt>Of all animals filed</dt><dd>{pct(s.vacc_pct_of_all)} recorded vaccinated</dd></div></dl>
                </Panel>
              </Section>
            </>}>
              <Tools>
                <Lanes<Ster> label="Sterilisation" value={ster} onChange={setSter} lanes={[{ id: "", label: "Every animal" }, { id: "sterilised", label: "Sterilised" }, { id: "not_sterilised", label: "Recorded not" }, { id: "unknown", label: "Not recorded" }]} />
              </Tools>
              <Panel>
                {animals === null ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : (
                  <More items={animals} cap={12} noun="animals">{(shown) => (
                    <Table label="Animals in this drive" cols={cols} rows={shown} rowKey={(a) => a.id} href={(a) => `/ngo/animals/${a.id}`}
                      empty={<Empty title={`No animal filed into this drive${ster ? " with that status" : ""} yet`} action={<Btn href="/ngo/inbox">Open the Inbox</Btn>}>File reports from the Inbox to add animals to this drive.</Empty>} />
                  )}</More>
                )}
              </Panel>
            </Split>
          </>
        )}
      </Page>
    </NgoGate>
  );
}
