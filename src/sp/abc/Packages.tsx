"use client";

/* NGO · Report packages: approved records for a period, prepared for the
   office that funds the programme. Figures are computed by the database
   from the records inside and frozen with the package. */

import { CancelButton } from "@/sp/ui/CancelButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Plus, Package as PackageIcon } from "lucide-react";
import { NotEnabled, PACKAGE_LABEL, createPackage, myContext, offices, packages, type AbcContext, type Office, type Package } from "@/lib/abc";
import { NgoGate, useOrgOpen } from "../ngo/Gate";
import { KajuEmptyState } from "@/kaju/Presence";
import { Reading } from "../ui/Reading";
import { MonthlySubmission, contractOffice } from "./MonthlySubmission";
import { Pager, pageOf } from "./Pager";
import "../ngo/ngo.css";
import "./abc.css";
import { Empty, PageHead } from "../ui/Page";

const PAGE = 10;

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
  const [page, setPage] = useState(0);
  const now = new Date();
  const [f, setF] = useState({ title: "", start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now), office: "" });

  const open = useOrgOpen();
  useEffect(() => {
    if (!open) return;
    let live = true;
    /* The office is only filled in for you when one contract in force names it; otherwise you choose. */
    Promise.all([packages(), offices(), myContext(), contractOffice()])
      .then(([p, o, c, k]) => { if (!live) return; setList(p.filter((x) => x.ngo_id === c.ngo_id)); setOffs(o); setCtx(c); setF((v) => ({ ...v, office: v.office || k || "" })); })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, [open]);

  const canPrepare = ctx?.role === "admin" || ctx?.role === "coordinator";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const id = await createPackage(f.title, f.start, f.end, f.office); router.push(`/ngo/packages/${id}`); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  /* Where a package is on its way: prepared, with the reviewing office, accepted. */
  const stepOf = (st: string) => (st === "accepted" ? 3 : st === "submitted" || st === "queried" ? 2 : 1);
  const toneOf = (st: string): "flame" | "amber" | "blue" | "green" | undefined => (st === "accepted" ? "green" : st === "returned" ? "flame" : st === "queried" ? "amber" : st === "submitted" ? "blue" : undefined);

  return (
    <NgoGate title="Report packages" lede="Approved ABC records for a period, prepared for the reviewing office.">
      <div className="vw abc rpt">
        <PageHead title="Reports" sum={off ? "Not switched on for this workspace yet." : list === null && !err ? <Reading>Reading your packages</Reading> : <>Approved records, sent to the office that funds the work.</>} />
        {off ? <Empty title="Report packages are not switched on here yet." /> : (
          <div className="rpt-split">
            {/* Left: the month in hand. What can be claimed, what blocks the rest, and the one button that prepares it. */}
            <div className="rpt-now">
              <p className="rpt-k">The month in hand</p>
              {ctx && <MonthlySubmission canPrepare={canPrepare} />}
              {canPrepare && offs.length > 0 && (
                <details className="rpt-custom"><summary><Plus size={14} aria-hidden /> A package for another period</summary>
                <form className="abc-new" onSubmit={submit} aria-label="Prepare a package">
                  <label>Title<input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Ward 14 ABC drive · October" /></label>
                  <label>From<input className="input" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
                  <label>To<input className="input" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
                  <label>Reviewing office<select aria-label="Reviewing office" className="select" value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}><option value="">Choose the office that funds this work</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
                  <button type="submit" className="btn is-ink is-s" disabled={busy || !f.office}>Prepare package</button>{f.title && <CancelButton label="Clear" disabled={busy} onCancel={() => setF((v) => ({ ...v, title: "" }))} />}
                </form></details>
              )}
              {canPrepare && offs.length === 0 && list && <p className="abc-hint">No reviewing office yet. StrayPaw adds it when your pilot starts.</p>}
              {!canPrepare && ctx && <p className="abc-hint">Coordinators and admins prepare packages.</p>}
              {err && <p className="vw-err" role="alert">{err}</p>}
            </div>

            {/* Right: every package and how far it has got. */}
            <div className="rpt-sent" id="ms-packages">
              <p className="rpt-k">Packages{list?.length ? <b>{list.length}</b> : null}</p>
              {list && (list.length ? (
                <><ul className="vw-list">{pageOf(list, page, PAGE).slice.map((p, j) => { const n = p.summary.records ?? p.case_ids.length, at = stepOf(p.status); return (
                  <li key={p.id} style={{ ["--j" as string]: j }}><Link className="vw-row rpt-row" href={`/ngo/packages/${p.id}`}>
                    <span className="vw-glyph" data-tone={toneOf(p.status)} aria-hidden><PackageIcon size={15} /></span>
                    <span className="vw-row-t"><b>{p.title}</b><small>{period(p)} · {offs.find((o) => o.id === p.office_id)?.name ?? "Reviewing office"} · {n} {n === 1 ? "record" : "records"}</small></span>
                    <span className="rpt-steps" role="img" aria-label={`Step ${at} of 3: ${PACKAGE_LABEL[p.status]}`}><i className={at >= 1 ? "is-on" : undefined} /><i className={at >= 2 ? "is-on" : undefined} /><i className={at >= 3 ? "is-on" : undefined} /></span>
                    <span className="vw-tag" data-tone={toneOf(p.status)}>{PACKAGE_LABEL[p.status]}</span>
                    <ArrowRight size={14} aria-hidden className="vw-go" />
                  </Link></li>
                ); })}</ul><Pager {...pageOf(list, page, PAGE)} total={list.length} size={PAGE} onPage={setPage} /></>
              ) : <KajuEmptyState title="No packages yet.">Approve records in Sign-off &amp; evidence first.</KajuEmptyState>)}
            </div>
          </div>
        )}
      </div>
    </NgoGate>
  );
}
