"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Maximize2, Plus, Search, X } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample, TrustChip, initials } from "../ui";
import { ANIMALS, type Animal } from "../fixtures";
import { AnimalBody } from "./AnimalBody";
import { useDogs, useLive, type Dog } from "../live";

const COLS = "minmax(0, 1.7fr) 104px 116px 112px 96px 78px minmax(0, 1fr)";
const VIEWS = [
  { id: "all", label: "All", test: () => true },
  { id: "follow", label: "Needs follow-up", test: (a: Animal) => a.next !== "—" },
  { id: "identity", label: "Identity to review", test: (a: Animal) => a.identity === "Needs review" },
  { id: "unverified", label: "Not yet verified", test: (a: Animal) => a.trust !== "Verified" },
] as const;
const tone = (v: string) => (/^(Sterilised|Vaccinated)$/.test(v) ? "ok" : /Due/.test(v) ? "warn" : "plain") as "ok" | "warn" | "plain";

function SampleAnimals() {
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [ward, setWard] = useState<string | null>(null);
  const [asc, setAsc] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const wards = useMemo(() => [...new Set(ANIMALS.map((a) => a.ward))].sort(), []);
  const rows = useMemo(() => {
    const v = VIEWS.find((x) => x.id === view)!;
    const out = ANIMALS.filter((a) => v.test(a) && (!ward || a.ward === ward) && (!q || `${a.id} ${a.name} ${a.ward} ${a.mark}`.toLowerCase().includes(q.toLowerCase())));
    return asc ? [...out].reverse() : out;
  }, [view, q, ward, asc]);
  const open = ANIMALS.find((a) => a.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const nextWard = () => setWard((w) => (w === null ? wards[0] : wards[wards.indexOf(w) + 1] ?? null));

  return (
    <Shell crumb={["NGO", "Animals"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head">
          <div><h1 className="nx-h1">Animals<Sample /></h1><p className="nx-sub"><b className="num">{rows.length}</b> of {ANIMALS.length} on the register. Each row says how far its record has been checked.</p></div>
          <Link href="/try" className="nx-btn" title="Opens the live demo, where this works"><Plus size={14} />Add an animal</Link>
        </div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>
                {view === v.id ? <motion.span layoutId="nx-view" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}
                <span>{v.label}<span className="nx-count">{ANIMALS.filter(v.test).length}</span></span>
              </button>
            ))}
          </div>
          <button type="button" className={`nx-filter ${ward ? "is-on" : ""}`} onClick={nextWard} aria-label={ward ? `Place: ${ward}. Change` : "Filter by place"}>{ward ?? "Any place"}{ward ? <X size={12} onClick={(e) => { e.stopPropagation(); setWard(null); }} /> : null}</button>
          <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an animal" aria-label="Find an animal" /></label>
        </div>

        <div className="nx-table" role="table" aria-label="Animals">
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: COLS }}>
            <span>Animal</span><span>Place</span><span>Sterilisation</span><span>Vaccination</span><span>Record</span>
            <span><button type="button" onClick={() => setAsc((x) => !x)} aria-label={`Sort by last seen, ${asc ? "oldest" : "newest"} first`}>Last seen{asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />}</button></span><span>Next</span>
          </div>
          {rows.map((a) => (
            <button key={a.id} type="button" role="row" className={`nx-tr ${openId === a.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: COLS }} onClick={() => setOpenId(a.id)} aria-label={`Open ${a.id}, ${a.name}`}>
              <span className="nx-cell-main"><span className="nx-thumb">{initials(a.species)}</span><span><b>{a.name}</b><small><span className="num">{a.id}</span> · {a.sex} · {a.age}<span className="nx-only-s"> · {a.ward}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{a.ward}</span>
              <span className="nx-hide-s"><Chip tone={tone(a.abc)}>{a.abc}</Chip></span>
              <span className="nx-hide-s"><Chip tone={tone(a.arv)}>{a.arv}</Chip></span>
              <span><TrustChip trust={a.trust} /></span>
              <span className="nx-t3 nx-hide-s">{a.last}</span>
              <span className="nx-t2 nx-hide-s">{a.next}</span>
            </button>
          ))}
          {!rows.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>No animal matches</b><p style={{ marginTop: 4 }}>Change the view or clear the search.</p><p style={{ marginTop: 12 }}><button type="button" className="nx-btn is-quiet" onClick={() => { setView("all"); setQ(""); setWard(null); }}>Show all animals</button></p></div> : null}
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={`${open.id}, ${open.name}`}
            initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h">
              <span className="num">{open.id}</span>
              <span style={{ marginLeft: "auto" }} />
              <Link href={`/next/ngo/animals/${open.id}`} className="nx-ib" aria-label="Open full record"><Maximize2 size={15} /></Link>
              <button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><span className="nx-rec-av">{initials(open.species)}</span><div><h1>{open.name}</h1><p>{open.ward} · Last seen {open.last} <TrustChip trust={open.trust} /></p></div></div>
              <AnimalBody a={open} drawer />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

const word = (v: string | null) => (v ? v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Not recorded");
const dogTone = (v: string | null) => (v && /^(sterili[sz]ed|vaccinated|done|yes)$/i.test(v) ? "ok" : v && /due|pending/i.test(v) ? "warn" : "plain") as "ok" | "warn" | "plain";
const trustOf = (d: Dog) => (d.provenance && /import/i.test(d.provenance) ? "Imported" : "Recorded") as "Imported" | "Recorded";
const seen = (d: Dog) => (d.last_seen ? new Date(d.last_seen).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not recorded");
const LCOLS = "minmax(0, 1.7fr) minmax(0, 1fr) 128px 128px 96px 112px";
const LVIEWS = [
  { id: "all", label: "All", test: () => true },
  { id: "abc", label: "Sterilisation not recorded", test: (d: Dog) => dogTone(d.sterilisation_status) !== "ok" },
  { id: "arv", label: "Vaccination not recorded", test: (d: Dog) => dogTone(d.vaccination_status) !== "ok" },
  { id: "imp", label: "Imported", test: (d: Dog) => trustOf(d) === "Imported" },
] as const;

/** The organisation's own register, read from the same table the current app writes. Nothing is shown that the row does not hold. */
function LiveAnimals() {
  const live = useLive();
  const org = live.orgFor("ngo") ?? live.org;
  const isNgo = org!.workspace === "ngo";
  const dogs = useDogs(isNgo ? org!.org_id : null);
  const [view, setView] = useState<(typeof LVIEWS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const calm = useReducedMotion();
  const all = useMemo(() => dogs.rows ?? [], [dogs.rows]);
  const rows = useMemo(() => { const v = LVIEWS.find((x) => x.id === view)!; const n = q.trim().toLowerCase(); return all.filter((d) => v.test(d) && (!n || `${d.name ?? ""} ${d.code ?? ""} ${d.straypaw_id ?? ""} ${d.zone ?? ""} ${d.identifiers ?? ""}`.toLowerCase().includes(n))); }, [all, view, q]);
  const open = all.find((d) => d.id === openId) ?? null;
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  if (!isNgo) return <Shell crumb={["NGO", "Animals"]}><div className="nx-page"><h1 className="nx-h1">Animals</h1><p className="nx-sub">{org!.name} is not an NGO workspace, so it has no animal register of its own.</p></div></Shell>;
  /* The organisation's own code where it has one; otherwise the tail of the StrayPaw ID, which is long. */
  const id = (d: Dog) => d.code ?? (d.straypaw_id ? `SP-${d.straypaw_id.slice(-8)}` : d.id.slice(0, 8).toUpperCase());
  return (
    <Shell crumb={["NGO", "Animals"]}>
      <div className="nx-page" style={{ maxWidth: "none" }}>
        <div className="nx-head"><div><h1 className="nx-h1">Animals</h1><p className="nx-sub">{dogs.rows === null ? "Reading the register…" : <><b className="num">{rows.length}</b> of {all.length}{all.length === 300 ? " most recently seen" : ""} on {org!.name}&apos;s register.</>}</p></div><Link href="/ngo/add" className="nx-btn"><Plus size={14} />Add an animal</Link></div>
        <div className="nx-bar">
          <div className="nx-views" role="tablist" aria-label="Views">
            {LVIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`nx-view ${view === v.id ? "is-on" : ""}`} onClick={() => setView(v.id)}>{view === v.id ? <motion.span layoutId="nx-lview" className="nx-view-bg" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 44 }} /> : null}<span>{v.label}<span className="nx-count">{all.filter(v.test).length}</span></span></button>)}
          </div>
          <label className="nx-find"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an animal" aria-label="Find an animal" /></label>
        </div>
        {dogs.error ? <p className="nx-foot" role="alert">The register could not be read: {dogs.error}</p> : null}
        <div className="nx-table" role="table" aria-label="Animals">
          <div className="nx-tr nx-th" role="row" style={{ gridTemplateColumns: LCOLS }}><span>Animal</span><span>Place</span><span>Sterilisation</span><span>Vaccination</span><span>Record</span><span>Last seen</span></div>
          {rows.map((d) => (
            <button key={d.id} type="button" role="row" className={`nx-tr ${openId === d.id ? "is-sel" : ""}`} style={{ gridTemplateColumns: LCOLS }} onClick={() => setOpenId(d.id)} aria-label={`Open ${id(d)}`}>
              <span className="nx-cell-main"><span className="nx-thumb">{initials(d.species ?? "Dog")}</span><span><b>{d.name || "Unnamed"}</b><small><span className="num">{id(d)}</span>{d.sex ? ` · ${word(d.sex)}` : ""}<span className="nx-only-s">{d.zone ? ` · ${d.zone}` : ""}</span></small></span></span>
              <span className="nx-t2 nx-hide-s">{d.zone ?? d.city ?? "Not recorded"}</span>
              <span className="nx-hide-s"><Chip tone={dogTone(d.sterilisation_status)}>{word(d.sterilisation_status)}</Chip></span>
              <span className="nx-hide-s"><Chip tone={dogTone(d.vaccination_status)}>{word(d.vaccination_status)}</Chip></span>
              <span><TrustChip trust={trustOf(d)} /></span>
              <span className="nx-t3 nx-hide-s">{seen(d)}</span>
            </button>
          ))}
          {dogs.rows && !rows.length ? <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-2)" }}><b style={{ color: "var(--ink)" }}>{all.length ? "No animal matches" : "No animals on the register yet"}</b><p style={{ marginTop: 4 }}>{all.length ? "Change the view or clear the search." : "Add the first one, or import a register."}</p></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.aside key="d" className="nx-drawer" role="dialog" aria-label={`${id(open)}`} initial={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={calm ? { opacity: 0 } : { x: 28, opacity: 0 }} transition={calm ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 40, mass: .8 }}>
            <div className="nx-drawer-h"><span className="num">{id(open)}</span><span style={{ marginLeft: "auto" }} /><Link href={`/next/ngo/animals/${open.id}`} className="nx-ib" aria-label="Open full record"><Maximize2 size={15} /></Link><button type="button" className="nx-ib" onClick={() => setOpenId(null)} aria-label="Close"><X size={16} /></button></div>
            <div className="nx-drawer-b">
              <div className="nx-rec-t" style={{ marginBottom: 16 }}><span className="nx-rec-av">{initials(open.species ?? "Dog")}</span><div><h1>{open.name || "Unnamed"}</h1><p>{open.zone ?? open.city ?? "Place not recorded"} · Last seen {seen(open)} <TrustChip trust={trustOf(open)} /></p></div></div>
              <h3 className="nx-h3">Details</h3>
              <dl className="nx-props">
                <div><dt>Animal ID</dt><dd className="num">{id(open)}</dd></div>
                <div><dt>Species</dt><dd>{word(open.species)}</dd></div>
                <div><dt>Sex</dt><dd>{word(open.sex)}</dd></div>
                <div><dt>Colour</dt><dd style={{ fontWeight: 400 }}>{open.color ?? "Not recorded"}</dd></div>
                <div><dt>Marks</dt><dd style={{ fontWeight: 400 }}>{open.identifiers ?? "Not recorded"}</dd></div>
                <div><dt>Sterilisation</dt><dd><Chip tone={dogTone(open.sterilisation_status)}>{word(open.sterilisation_status)}</Chip></dd></div>
                <div><dt>Vaccination</dt><dd><Chip tone={dogTone(open.vaccination_status)}>{word(open.vaccination_status)}</Chip></dd></div>
                <div><dt>Identity</dt><dd>{word(open.identity_state)}</dd></div>
              </dl>
              <p style={{ marginTop: 18 }}><Link href={`/next/ngo/animals/${open.id}`} className="nx-btn is-quiet">Open full record</Link></p>

            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </Shell>
  );
}

export function Animals() {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["NGO", "Animals"]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveAnimals /> : <SampleAnimals />;
}
