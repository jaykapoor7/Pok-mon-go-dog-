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

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Scissors, Search, Syringe, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { orgAnimals, orgZones, type OrgAnimal } from "@/lib/programme";
import { downloadCsv } from "@/lib/csv";
import { animalTitle } from "@/lib/animal-name";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { day, n } from "../ui";
import { Empty, PageHead, Seg } from "../ui/Page";
import { Reading } from "../ui/Reading";
import { NgoGate } from "./Gate";
import "./ngo.css";
import "./animals.css";

const PAGE = 20;
type Filter = { ster: "sterilised" | "not_sterilised" | "unknown" | null; vacc: "vaccinated" | "not_vaccinated" | "unknown" | null; help: boolean | null; zone: string };

export function Animals() {
  const { user } = useAuth();
  const mem = useMembership();
  const [q, setQ] = useState("");
  const [fl, setFl] = useState<Filter>({ ster: null, vacc: null, help: null, zone: "" });
  const [rows, setRows] = useState<OrgAnimal[] | null>(null);
  const [zones, setZones] = useState<{ zone: string; n: number }[]>([]);
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState(false);
  const member = !!user && mem.member;

  useEffect(() => { if (member) orgZones().then(setZones).catch(() => {}); }, [member]);
  useEffect(() => {
    if (!member) return;
    let live = true; setRows(null); setFailed(false);
    const t = window.setTimeout(() => {
      orgAnimals({ search: q, ster: fl.ster as never, vacc: fl.vacc as never, needsHelp: fl.help, zone: fl.zone || null, limit: PAGE, offset: page * PAGE })
        .then((r) => { if (live) setRows(r); }).catch(() => { if (live) { setRows([]); setFailed(true); } });
    }, 220);
    return () => { live = false; window.clearTimeout(t); };
  }, [member, q, fl, page]);

  const total = rows?.[0]?.total_count ?? 0;
  const csv = useMemo(() => (rows ?? []).map((a) => ({ straypaw_id: a.straypaw_id, code: a.code, name: a.name, zone: a.zone, sterilisation: a.sterilisation_status, vaccination: a.vaccination_status, needs_help: a.needs_help, last_seen: a.last_seen })), [rows]);

  /* The lenses the programme asks about first: who needs help, who is not yet sterilised, who is not yet vaccinated. */
  type Lens = "all" | "help" | "ster" | "vacc";
  const lens: Lens = fl.help ? "help" : fl.ster === "not_sterilised" ? "ster" : fl.vacc === "not_vaccinated" ? "vacc" : "all";
  const setLens = (l: Lens) => { setFl({ ster: l === "ster" ? "not_sterilised" : null, vacc: l === "vacc" ? "not_vaccinated" : null, help: l === "help" ? true : null, zone: fl.zone }); setPage(0); };
  /* The animal under the pointer or the keyboard is shown beside the list, so a person can look before they open. */
  const [peekId, setPeekId] = useState<string | null>(null);
  const peek = rows?.find((r) => r.id === peekId) ?? rows?.[0] ?? null;
  const filtered = !!(q || fl.ster || fl.vacc || fl.help || fl.zone);

  return (
    <NgoGate title="Animals" lede="Your organisation's register of animals, with what is recorded about each and what is not.">
      <div className="vw an">
        <PageHead title="Animals"
          sum={rows === null ? <Reading>Reading the register</Reading> : failed ? "The register could not be read. Nothing is shown as zero." : <><b>{n(total)}</b> {filtered ? (total === 1 ? "animal matches" : "animals match") : (total === 1 ? "animal on your register" : "animals on your register")}</>}
          actions={<><button type="button" className="btn is-s" disabled={!csv.length} onClick={() => downloadCsv("straypaw-animals.csv", csv)}><Download size={14} aria-hidden /> This page as CSV</button><Link className="btn is-s" href="/ngo/import"><Upload size={14} aria-hidden /> Import register</Link></>} />

        <div className="vw-bar an-bar">
          <Seg<Lens> label="Show" value={lens} onChange={setLens} options={[{ id: "all", label: "All" }, { id: "help", label: "Needs help" }, { id: "ster", label: "Not sterilised" }, { id: "vacc", label: "Not vaccinated" }]} />
          <div className="an-find">
            <label className="an-search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name, StrayPaw ID, your code or place" aria-label="Search the register" /></label>
            <select className="an-sel" value={fl.zone} onChange={(e) => { setFl({ ...fl, zone: e.target.value }); setPage(0); }} aria-label="Locality"><option value="">Every locality</option>{zones.slice(0, 200).map((z) => <option key={z.zone} value={z.zone}>{z.zone} ({z.n})</option>)}</select>
            <details className="an-more"><summary>Recorded status</summary><div>
              <label>Sterilisation<select value={fl.ster ?? ""} onChange={(e) => { setFl({ ...fl, ster: (e.target.value || null) as Filter["ster"] }); setPage(0); }}><option value="">Any</option><option value="sterilised">Sterilised</option><option value="not_sterilised">Recorded not</option><option value="unknown">Not recorded</option></select></label>
              <label>Vaccination<select value={fl.vacc ?? ""} onChange={(e) => { setFl({ ...fl, vacc: (e.target.value || null) as Filter["vacc"] }); setPage(0); }}><option value="">Any</option><option value="vaccinated">Vaccinated</option><option value="not_vaccinated">Recorded not</option><option value="unknown">Not recorded</option></select></label>
            </div></details>
          </div>
        </div>

        <div className="an-split">
          <div>
            {rows === null ? <ul className="vw-list" aria-hidden>{Array.from({ length: 8 }, (_, i) => <li key={i}><span className="skel" style={{ display: "block", height: 44, margin: "10px 0" }} /></li>)}</ul>
              : !rows.length ? <Empty title={failed ? "Not read" : filtered ? "No animal matches" : "No animals on the register yet"} action={!failed && !filtered ? <Link className="btn is-ink is-s" href="/ngo/import">Import your register</Link> : undefined}>{failed ? "Reload to try again." : filtered ? "Change the search or the lens." : "Animals your team records, and rows released from imports, appear here."}</Empty>
              : (
              <ul className="vw-list an-list" aria-label="Animal register">{rows.map((a, j) => {
                const t = animalTitle({ name: a.name, straypaw_id: a.straypaw_id, id: a.id });
                return (
                  <li key={a.id} style={{ ["--j" as string]: j }}>
                    <Link href={`/ngo/animals/${a.id}`} className={`vw-row an-row${peek?.id === a.id ? " is-peek" : ""}`} onPointerEnter={() => setPeekId(a.id)} onFocus={() => setPeekId(a.id)}>
                      <Portrait src={a.cover_photo} tag={t} sensitive={a.needs_help} size="s" />
                      <span className="vw-row-t"><b>{t}</b><small>{[a.zone ?? "place not recorded", a.name ? (a.straypaw_id ?? "ID pending") : null, a.code].filter(Boolean).join(" · ")}</small></span>
                      <span className="an-marks">{a.needs_help ? <span className="vw-tag" data-tone="flame">Needs help</span> : null}<Mark v={a.sterilisation_status} kind="ster" /><Mark v={a.vaccination_status} kind="vacc" /></span>
                      <time className="an-seen">{day(a.last_seen)}</time>
                      <ArrowRight size={14} aria-hidden className="vw-go" />
                    </Link>
                  </li>
                );
              })}</ul>
            )}
            {total > PAGE && <div className="row ngo-pager"><button type="button" className="btn is-s" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button><span className="small">Page {page + 1} of {Math.ceil(total / PAGE)}</span><button type="button" className="btn is-s" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
          </div>

          {peek ? (
            <aside className="an-peek" aria-label="The animal under the pointer" key={peek.id}>
              <Portrait src={peek.cover_photo} tag={animalTitle({ name: peek.name, straypaw_id: peek.straypaw_id, id: peek.id })} sensitive={peek.needs_help} size="m" />
              <h2>{animalTitle({ name: peek.name, straypaw_id: peek.straypaw_id, id: peek.id })}</h2>
              <p className="an-peek-id">{[peek.straypaw_id ?? "ID pending", peek.code ? `your code ${peek.code}` : null].filter(Boolean).join(" · ")}</p>
              <dl>
                <div><dt>Place</dt><dd>{peek.zone ?? "Not recorded"}</dd></div>
                <div><dt>Sterilisation</dt><dd>{said(peek.sterilisation_status, "Sterilised", "Not sterilised")}</dd></div>
                <div><dt>Vaccination</dt><dd>{said(peek.vaccination_status, "Vaccinated", "Not vaccinated")}</dd></div>
                <div><dt>Last seen</dt><dd>{day(peek.last_seen)}</dd></div>
                {peek.recorded_by ?? peek.assignee_name ? <div><dt>Recorded by</dt><dd>{peek.recorded_by ?? peek.assignee_name}</dd></div> : null}
              </dl>
              <Link className="an-peek-go" href={`/ngo/animals/${peek.id}`}>Open the record <ArrowRight size={14} aria-hidden /></Link>
              <p className="an-peek-note">Not recorded is not the same as no. Open the record to add what is known.</p>
            </aside>
          ) : null}
        </div>
      </div>
    </NgoGate>
  );
}

const said = (v: string | null, yes: string, no: string) => (v === "sterilised" || v === "vaccinated" ? yes : v === "not_sterilised" || v === "not_vaccinated" ? no : "Not recorded");

/** One recorded fact as a mark: done, recorded as not done, or not recorded (which is not no). */
function Mark({ v, kind }: { v: string | null; kind: "ster" | "vacc" }) {
  const yes = v === "sterilised" || v === "vaccinated", no = v === "not_sterilised" || v === "not_vaccinated";
  const Icon = kind === "ster" ? Scissors : Syringe;
  const text = kind === "ster" ? (yes ? "Sterilised" : no ? "Not sterilised" : "Sterilisation not recorded") : (yes ? "Vaccinated" : no ? "Not vaccinated" : "Vaccination not recorded");
  return <span className="an-mark" data-state={yes ? "yes" : no ? "no" : "unknown"} role="img" aria-label={text} title={text}><Icon size={13} aria-hidden /></span>;
}
