"use client";

/* NGO · Report packages: approved records for a period, prepared for the
   office that funds the programme. Figures are computed by the database
   from the records inside and frozen with the package. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { NotEnabled, PACKAGE_LABEL, createPackage, myContext, offices, packages, type AbcContext, type Office, type Package } from "@/lib/abc";
import { NgoGate } from "../ngo/Gate";
import { Reading } from "../ui/Reading";
import "../ngo/ngo.css";
import "./abc.css";

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const period = (p: Package) => `${new Date(p.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to ${new Date(p.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

export function Packages() {
  const router = useRouter();
  const [list, setList] = useState<Package[] | null>(null);
  const [offs, setOffs] = useState<Office[]>([]);
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [off, setOff] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const [f, setF] = useState({ title: "", start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now), office: "" });

  useEffect(() => {
    let live = true;
    Promise.all([packages(), offices(), myContext()])
      .then(([p, o, c]) => { if (!live) return; setList(p.filter((x) => x.ngo_id === c.ngo_id)); setOffs(o); setCtx(c); setF((v) => ({ ...v, office: v.office || o[0]?.id || "" })); })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, []);

  const canPrepare = ctx?.role === "admin" || ctx?.role === "coordinator";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const id = await createPackage(f.title, f.start, f.end, f.office); router.push(`/ngo/packages/${id}`); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  return (
    <NgoGate title="Report packages" lede="Approved ABC records for a period, prepared for the reviewing office.">
      <div className="ngo-page abc">
        <header className="ngo-head">
          <div><h1>Report packages</h1></div>
          <p className="ngo-sum">{off ? "Not switched on for this workspace yet." : list === null && !err ? <Reading>Reading your packages</Reading> : <>Approved records, sent to the office that funds the work</>}</p>
        </header>
        {off ? <div className="abc-empty"><b>Report packages are not switched on here yet.</b></div> : (
          <>
            {canPrepare && offs.length > 0 && (
              <form className="abc-new" onSubmit={submit} aria-label="Prepare a package">
                <label>Title<input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Ward 14 ABC drive · October" /></label>
                <label>From<input className="input" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
                <label>To<input className="input" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
                <label>Reviewing office<select className="select" value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                <button type="submit" className="btn is-ink is-s" disabled={busy || !f.office}>Prepare package</button>
              </form>
            )}
            {canPrepare && offs.length === 0 && list && <p className="abc-hint">No reviewing office yet. StrayPaw adds it when your pilot starts.</p>}
            {!canPrepare && ctx && <p className="abc-hint">Coordinators and admins prepare packages.</p>}
            {err && <p className="abc-err" role="alert">{err}</p>}
            {list && (list.length ? (
              <ul className="abc-list">{list.map((p) => (
                <li key={p.id}><Link href={`/ngo/packages/${p.id}`}>
                  <span className="abc-t"><b>{p.title}</b><small>{period(p)} · {offs.find((o) => o.id === p.office_id)?.name ?? "Reviewing office"}</small></span>
                  <span className="abc-dots"><span>{(() => { const n = p.summary.records ?? p.case_ids.length; return `${n} ${n === 1 ? "record" : "records"}`; })()}</span></span>
                  <span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span>
                  <ArrowRight size={14} aria-hidden className="abc-go" />
                </Link></li>
              ))}</ul>
            ) : <div className="abc-empty"><b>No packages yet.</b>Approve records in Verification first.</div>)}
          </>
        )}
      </div>
    </NgoGate>
  );
}
