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
import { Download, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { orgAnimals, orgZones, type OrgAnimal } from "@/lib/programme";
import { downloadCsv } from "@/lib/csv";
import { animalTitle } from "@/lib/animal-name";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { State, day, n, PageBrief } from "../ui";
import { NgoGate } from "./Gate";
import { MobileDetails } from "../ui/MobileDetails";
import "./ngo.css";

const PAGE = 100;
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

  return (
    <NgoGate title="Animals" lede="Your organisation's register of animals, with what is recorded about each and what is not.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · register</p><h1 className="serif">Animals</h1></div>
          <p className="ngo-sum">{rows === null ? "Reading the register…" : failed ? "The register could not be read. Nothing is shown as zero." : <><b>{n(total)}</b> animal{total === 1 ? "" : "s"} match. Unknown is kept apart from no in every filter.</>}</p>
          <MobileDetails label="Import and export"><div className="row"><Link className="btn is-s" href="/ngo/import">Import a workbook</Link><button type="button" className="btn is-s" disabled={!csv.length} onClick={() => downloadCsv("straypaw-animals.csv", csv)}><Download size={14} aria-hidden /> This page as CSV</button></div></MobileDetails>
        </header>
        <PageBrief items={[["For", "Every animal your organisation keeps, as a register."], ["Watch", "Needs help, and status not recorded (hatched), which is not no."], ["Next", "Open an animal to record care or open a case; export as CSV."], ["After", "Changes show on its public record without private details."]]} />
        <div className="wk-tools">
          <label className="search wk-search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="StrayPaw ID, source code, name or place" aria-label="Search the register" /></label>
          <MobileDetails label="Filter animals" className="animal-filter-fold" active={!!(fl.ster || fl.vacc || fl.zone || fl.help)}>
          <select className="select ngo-sel" value={fl.ster ?? ""} onChange={(e) => { setFl({ ...fl, ster: (e.target.value || null) as Filter["ster"] }); setPage(0); }} aria-label="Sterilisation"><option value="">Sterilisation: any</option><option value="sterilised">Sterilised</option><option value="not_sterilised">Recorded not</option><option value="unknown">Not recorded</option></select>
          <select className="select ngo-sel" value={fl.vacc ?? ""} onChange={(e) => { setFl({ ...fl, vacc: (e.target.value || null) as Filter["vacc"] }); setPage(0); }} aria-label="Vaccination"><option value="">Vaccination: any</option><option value="vaccinated">Vaccinated</option><option value="not_vaccinated">Recorded not</option><option value="unknown">Not recorded</option></select>
          <select className="select ngo-sel" value={fl.zone} onChange={(e) => { setFl({ ...fl, zone: e.target.value }); setPage(0); }} aria-label="Locality"><option value="">Every locality</option>{zones.slice(0, 200).map((z) => <option key={z.zone} value={z.zone}>{z.zone} ({z.n})</option>)}</select>
          <button type="button" className="chip" aria-pressed={fl.help === true} onClick={() => { setFl({ ...fl, help: fl.help ? null : true }); setPage(0); }}>Needs help</button>
          </MobileDetails>
        </div>
        <div className="reg" role="table" aria-label="Animal register">
          <div className="reg-row is-head" role="row"><span role="columnheader">Animal</span><span role="columnheader">Locality</span><span role="columnheader">Sterilisation</span><span role="columnheader">Vaccination</span><span role="columnheader">Last seen</span><span role="columnheader">Recorded by</span></div>
          {rows === null && Array.from({ length: 8 }, (_, i) => <div key={i} className="reg-row" aria-hidden><span className="skel" style={{ height: 40 }} /></div>)}
          {rows !== null && !rows.length && <State art="ngo-empty" title={failed ? "Not read" : q || fl.ster || fl.vacc || fl.help || fl.zone ? "No animal matches" : "No animals in the register yet"} action={!failed && !q ? <Link className="btn is-ink" href="/ngo/import">Import your workbook</Link> : undefined}>{failed ? "Reload to try again." : "Change the search or filters. Animals your team records, and rows released from imports, appear here."}</State>}
          {rows?.map((a) => {
            const t = animalTitle({ name: a.name, straypaw_id: a.straypaw_id, id: a.id });
            return (
              <Link key={a.id} href={`/ngo/animals/${a.id}`} className={`reg-row${a.needs_help ? " is-help" : ""}`} role="row">
                <span className="reg-id" role="cell"><Portrait src={a.cover_photo} tag={t} sensitive={a.needs_help} size="s" /><span><b>{t}</b><small className="mono">{a.straypaw_id ?? "ID pending"}{a.code ? ` · ${a.code}` : ""}</small>{a.needs_help && <em className="pill is-urgent">Needs help</em>}</span></span>
                <span role="cell">{a.zone ?? <i className="small">not recorded</i>}</span>
                <span role="cell"><Status v={a.sterilisation_status} yes="Sterilised" /></span>
                <span role="cell"><Status v={a.vaccination_status} yes="Vaccinated" /></span>
                <span role="cell" className="mono small">{day(a.last_seen)}</span>
                <span role="cell" className="small">{a.recorded_by ?? a.assignee_name ?? "—"}</span>
              </Link>
            );
          })}
        </div>
        {total > PAGE && <div className="row ngo-pager"><button type="button" className="btn is-s" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button><span className="small">Page {page + 1} of {Math.ceil(total / PAGE)}</span><button type="button" className="btn is-s" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
        <p className="small ngo-foot">Possible duplicates are compared by a person: same animal, different animals, or not sure. Identity links can be undone and keep their source codes. A reviewed identity-merge tool needs new backend support and is not offered here yet.</p>
      </div>
    </NgoGate>
  );
}

function Status({ v, yes }: { v: string | null; yes: string }) {
  if (v === "sterilised" || v === "vaccinated") return <span className="pill is-care">{yes}</span>;
  if (v === "not_sterilised" || v === "not_vaccinated") return <span className="pill">Recorded not</span>;
  return <span className="pill is-unknown">Not recorded</span>;
}
