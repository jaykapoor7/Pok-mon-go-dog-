"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Animals (decisions 019, 022, 038).

   The organisation's animal register, read under the member's session
   (org_animals RPC, bounded pages). Searchable by StrayPaw ID, source
   code, name or place; filtered by what is recorded, with unknown kept
   apart from no. Each row opens the casefile: the same canonical animal
   as its public record, at the depth the organisation is allowed.
   Identity matches are people's decisions; nothing merges automatically.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Download, PawPrint, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { orgAnimals, orgRevaccinationDue, orgRevaccinationSetting, orgZones, type OrgAnimal, type RevaccinationDue, type RevaccinationSetting } from "@/lib/programme";
import { downloadCsv } from "@/lib/csv";
import { animalTitle } from "@/lib/animal-name";
import { Btn, Empty, Head, Lanes, Page, Panel, SearchBox, Table, Tag, Tools, type Col, type Lane } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { day, n } from "../ui";
import { Pager, SkelRows } from "../abc/Pager";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./animals.css";

const PAGE = 20;
type Filter = { ster: "sterilised" | "not_sterilised" | "unknown" | null; vacc: "vaccinated" | "not_vaccinated" | "unknown" | null; help: boolean | null; zone: string };

const shortId = (id: string | null) => (id ? id.replace(/^([A-Z]+-[A-Z]+)-([0-9A-F]{6})[0-9A-F]{6,}$/i, (_m, p: string, h: string) => `${p}-${h.toUpperCase()}`) : null);

/** One recorded fact: done, recorded as not done, or not recorded (which is not no). */
function Fact({ v, yes, no }: { v: string | null; yes: string; no: string }) {
  if (v === "sterilised" || v === "vaccinated") return <Tag tone="green">{yes}</Tag>;
  if (v === "not_sterilised" || v === "not_vaccinated") return <Tag tone="amber">{no}</Tag>;
  return <span className="kx-none">Not recorded</span>;
}
function Who({ a, sub, sensitive = false }: { a: { id: string; name: string | null; straypaw_id: string | null; cover_photo: string | null }; sub: string; sensitive?: boolean }) {
  const t = animalTitle({ name: a.name, straypaw_id: a.straypaw_id, id: a.id });
  return <span className="kx-cell an-who">{a.cover_photo ? <Portrait src={a.cover_photo} tag={t} sensitive={sensitive} size="s" /> : <i className="an-paw" aria-hidden><PawPrint size={14} /></i>}<span>{t}<small className="kx-sub">{sub}</small></span></span>;
}

export function Animals() {
  const { user } = useAuth();
  const mem = useMembership();
  const [q, setQ] = usePageState("q", "");
  const [fl, setFl] = usePageState<Filter>("filter", { ster: null, vacc: null, help: null, zone: "" });
  const [rows, setRows] = useState<OrgAnimal[] | null>(null);
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);
  const [page, setPage] = usePageState("page", 0);
  const [failed, setFailed] = useState(false);
  const member = !!user && mem.member;
  /* Revaccination: offered only when one of the organisation's programmes sets an interval. */
  const [revac, setRevac] = usePageState("revac", false);
  const [rv, setRv] = useState<RevaccinationSetting | null>(null);

  useEffect(() => { if (member) orgZones().then(setZones).catch(() => {}); }, [member]);
  useEffect(() => { if (member) orgRevaccinationSetting().then(setRv).catch(() => setRv(null)); }, [member]);
  const { ster, vacc, help, zone } = fl;
  useEffect(() => {
    if (!member) return;
    let live = true; setRows(null); setFailed(false);
    const t = window.setTimeout(() => {
      orgAnimals({ search: q, ster: ster as never, vacc: vacc as never, needsHelp: help, zone: zone || null, limit: PAGE, offset: page * PAGE })
        .then((r) => { if (live) setRows(r); }).catch(() => { if (live) { setRows([]); setFailed(true); } });
    }, 220);
    return () => { live = false; window.clearTimeout(t); };
  }, [member, q, ster, vacc, help, zone, page]);

  const total = rows?.[0]?.total_count ?? 0;
  const csv = useMemo(() => (rows ?? []).map((a) => ({ straypaw_id: a.straypaw_id, code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, last_seen: a.last_seen })), [rows]);

  /* The lenses the programme asks about first: who needs help, who is not yet sterilised, who is not yet vaccinated. */
  type Lens = "all" | "help" | "ster" | "vacc" | "revac";
  const revacOn = !!rv?.days;
  const lens: Lens = revac && revacOn ? "revac" : fl.help ? "help" : fl.ster === "not_sterilised" ? "ster" : fl.vacc === "not_vaccinated" ? "vacc" : "all";
  const setLens = (l: Lens) => { setRevac(l === "revac"); setFl({ ster: l === "ster" ? "not_sterilised" : null, vacc: l === "vacc" ? "not_vaccinated" : null, help: l === "help" ? true : null, zone: l === "revac" ? "" : fl.zone }); setPage(0); };
  const due = (rv?.overdue ?? 0) + (rv?.soon ?? 0);
  const lenses: Lane<Lens>[] = [{ id: "all", label: "All" }, { id: "help", label: "Needs help" }, { id: "ster", label: "Not sterilised" }, { id: "vacc", label: "Not vaccinated" }, ...(revacOn ? [{ id: "revac" as const, label: "Due for revaccination", count: due || null, tone: rv?.overdue ? "flame" as const : "amber" as const }] : [])];
  const filtered = !!(q || fl.ster || fl.vacc || fl.help || fl.zone);

  const cols: Col<OrgAnimal>[] = [
    { key: "who", label: "Animal", width: "minmax(0, 1.4fr)", render: (a) => <Who a={a} sensitive={a.needs_help} sub={[a.zone ?? "place not recorded", shortId(a.straypaw_id) ?? "ID pending"].join(" · ")} /> },
    { key: "zone", label: "Place", render: (a) => a.zone ?? <span className="kx-none">Not recorded</span> },
    { key: "ster", label: "Sterilisation", width: "112px", render: (a) => <Fact v={a.sterilisation_status} yes="Sterilised" no="Not sterilised" /> },
    { key: "vacc", label: "Vaccination", width: "112px", render: (a) => <Fact v={a.vaccination_status} yes="Vaccinated" no="Not vaccinated" /> },
    { key: "seen", label: "Last seen", width: "96px", render: (a) => <span className="kx-num">{day(a.last_seen)}</span> },
    { key: "state", label: "Status", width: "88px", keep: true, render: (a) => (a.needs_help ? <Tag tone="flame">Needs help</Tag> : null) },
  ];

  return (
    <NgoGate title="Animals" lede="Your organisation's register of animals, with what is recorded about each and what is not.">
      <Page>
        {lens === "revac" && rv?.days ? <RevaccinationList setting={rv} tools={<Lanes<Lens> label="Show" lanes={lenses} value={lens} onChange={setLens} />} /> : <>
          <Head title="Animals"
            sum={rows === null ? "Reading the register…" : failed ? "The register could not be read. Nothing is shown as zero." : <><b>{n(total)}</b> {filtered ? (total === 1 ? "match" : "matches") : (total === 1 ? "animal" : "animals")}</>}
            actions={<><Btn icon={<Download size={14} />} disabled={!csv.length} onClick={() => downloadCsv("straypaw-animals.csv", csv)}>Download</Btn><Btn href="/ngo/import" icon={<Upload size={14} />}>Import</Btn></>} />
          <Tools end={<>
            <SearchBox value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="Name, ID, your code or place" label="Search the register" />
            <select className="kx-in is-auto an-sel" value={fl.zone} onChange={(e) => { setFl({ ...fl, zone: e.target.value }); setPage(0); }} aria-label="Locality"><option value="">Every locality</option>{zones.slice(0, 200).map((z) => <option key={z.zone} value={z.zone}>{z.zone} ({z.n})</option>)}</select>
          </>}><Lanes<Lens> label="Show" lanes={lenses} value={lens} onChange={setLens} /></Tools>
          <Panel>
            {rows === null ? <SkelRows n={8} label="Reading the register" />
              : !rows.length ? <Empty title={failed ? "Not read" : filtered ? "No animal matches" : "No animals on the register yet"} action={!failed && !filtered ? <Btn variant="primary" href="/ngo/import">Import your register</Btn> : undefined}>{failed ? "Reload to try again." : filtered ? "Change the search or the lens." : "Animals your team records, and rows released from imports, appear here."}</Empty>
              : <Table cols={cols} rows={rows} rowKey={(a) => a.id} href={(a) => `/ngo/animals/${a.id}`} label="Animal register" />}
          </Panel>
          <Pager pg={page} pages={Math.ceil(total / PAGE)} total={total} size={PAGE} onPage={setPage} />
        </>}
      </Page>
    </NgoGate>
  );
}

/* The animals past, or within 14 days of, their revaccination date: the same
   rule as the programme's alert (last vaccination recorded on the animal's
   record, plus the programme's interval). Animals marked vaccinated with no
   dated vaccination cannot be placed and are counted, not guessed. */
function RevaccinationList({ setting, tools }: { setting: RevaccinationSetting; tools: React.ReactNode }) {
  const [rows, setRows] = useState<RevaccinationDue[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    let live = true; setRows(null); setFailed(false);
    orgRevaccinationDue(PAGE, page * PAGE).then((r) => { if (live) setRows(r); }).catch(() => { if (live) { setRows([]); setFailed(true); } });
    return () => { live = false; };
  }, [page]);
  const total = rows?.[0]?.total_count ?? 0;
  const csv = (rows ?? []).map((r) => ({ straypaw_id: r.straypaw_id, code: r.code, name: r.name, zone: r.zone, last_vaccinated: r.last_vaccinated, due_on: r.due_on, days_overdue: r.days_overdue }));
  const cols: Col<RevaccinationDue>[] = [
    { key: "who", label: "Animal", width: "minmax(0, 1.4fr)", render: (a) => <Who a={a} sub={[a.zone ?? "place not recorded", `last vaccinated ${day(a.last_vaccinated)}`].join(" · ")} /> },
    { key: "zone", label: "Place", render: (a) => a.zone ?? <span className="kx-none">Not recorded</span> },
    { key: "last", label: "Last vaccinated", width: "120px", render: (a) => <span className="kx-num">{day(a.last_vaccinated)}</span> },
    { key: "due", label: "Due on", width: "120px", render: (a) => <span className="kx-num">{day(a.due_on)}</span> },
    { key: "state", label: "Status", width: "128px", keep: true, render: (a) => { const late = a.days_overdue > 0; return <Tag tone={late ? "flame" : "amber"}>{late ? `${a.days_overdue} day${a.days_overdue === 1 ? "" : "s"} overdue` : a.days_overdue === 0 ? "Due today" : `Due in ${-a.days_overdue} day${a.days_overdue === -1 ? "" : "s"}`}</Tag>; } },
  ];
  return (
    <>
      <Head title="Animals"
        sum={<>{setting.overdue ? <span className="is-hot">{n(setting.overdue)} overdue</span> : "None overdue"}{setting.soon ? <>, <b>{n(setting.soon)}</b> due in the next 14 days</> : null}. Every {setting.days} days{setting.programme ? `, as ${setting.programme} sets` : ""}, from the last vaccination recorded on each animal.</>}
        actions={<Btn icon={<Download size={14} />} disabled={!csv.length} onClick={() => downloadCsv("straypaw-revaccination.csv", csv)}>Download</Btn>} />
      <Tools>{tools}</Tools>
      <Panel>
        {rows === null ? <SkelRows n={6} label="Reading the animals due" />
          : failed ? <Empty title="Not read">The list could not be read. Nothing is shown as zero; reload to try again.</Empty>
          : !rows.length ? <Empty title="No animal is due">Animals appear here 14 days before their revaccination date.</Empty>
          : <Table cols={cols} rows={rows} rowKey={(a) => a.id} href={(a) => `/ngo/animals/${a.id}`} label="Animals due for revaccination" />}
      </Panel>
      <Pager pg={page} pages={Math.ceil(total / PAGE)} total={total} size={PAGE} onPage={setPage} />
      {setting.undated ? <p className="kx-quiet is-top">{n(setting.undated)} {setting.undated === 1 ? "animal is" : "animals are"} marked vaccinated with no dated vaccination, so {setting.undated === 1 ? "it" : "they"} cannot be placed here. Add the date on {setting.undated === 1 ? "its" : "each"} record.</p> : null}
    </>
  );
}
