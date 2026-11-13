"use client";

/* NGO · Report packages: approved records for a period, prepared for the
   office that funds the programme. Figures are computed by the database
   from the records inside and frozen with the package. */

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { NotEnabled, PACKAGE_LABEL, createPackage, myContext, offices, packages, type AbcContext, type Office, type Package } from "@/lib/abc";
import { Btn, Empty, Head, Page, Panel, Row, Rows, Section, Split, Tag, Tools } from "@/ws/kit";
import { NgoGate, useOrgOpen } from "../ngo/Gate";
import { MonthlySubmission, contractOffice, type MonthParts } from "./MonthlySubmission";
import { Pager, SkelRows, pageOf } from "./Pager";
import "../ngo/ngo.css";

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

  const toneOf = (st: string): "flame" | "amber" | "blue" | "green" | "plain" => (st === "accepted" ? "green" : st === "returned" ? "flame" : st === "queried" || st === "partially_accepted" ? "amber" : st === "submitted" ? "blue" : "plain");

  /* Every package and how far it has got; beside the month in hand. */
  const sent = (
    <Section title="Packages" count={list?.length ? list.length : null}>
      {list === null ? (err ? null : <Panel><SkelRows n={3} label="Reading your packages" /></Panel>) : list.length ? (
        <><Panel><Rows label="Report packages">{pageOf(list, page, PAGE).slice.map((p) => { const n = p.summary.records ?? p.case_ids.length; return (
          <Row key={p.id} href={`/ngo/packages/${p.id}`} title={p.title} meta={`${period(p)} · ${offs.find((o) => o.id === p.office_id)?.name ?? "Reviewing office"} · ${n} ${n === 1 ? "record" : "records"}`} end={<Tag tone={toneOf(p.status)}>{PACKAGE_LABEL[p.status]}</Tag>} />
        ); })}</Rows></Panel><Pager {...pageOf(list, page, PAGE)} total={list.length} size={PAGE} onPage={setPage} />
        <p className="kx-quiet is-top">Accepted means approved for payment. It is not a payment.</p></>
      ) : <p className="kx-quiet">No packages yet. Approve records in Sign-off first.</p>}
    </Section>
  );
  /* Any other period: the same form as before, folded. */
  const custom = canPrepare && offs.length > 0 ? (
    <Section title="A package for another period" fold="custom" open={false}>
      <form className="kx-form" onSubmit={submit} aria-label="Prepare a package">
        <label className="kx-f"><span>Title</span><input className="kx-in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Ward 14 ABC drive · October" /></label>
        <div className="kx-two"><label className="kx-f"><span>From</span><input className="kx-in" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
        <label className="kx-f"><span>To</span><input className="kx-in" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label></div>
        <label className="kx-f"><span>Reviewing office</span><select aria-label="Reviewing office" className="kx-in" value={f.office} onChange={(e) => setF({ ...f, office: e.target.value })}><option value="">Choose the office that funds this work</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <div className="kx-acts"><Btn type="submit" disabled={busy || !f.office}>Prepare package</Btn>{f.title && <Btn variant="quiet" disabled={busy} onClick={() => setF((v) => ({ ...v, title: "" }))}>Clear</Btn>}</div>
      </form>
    </Section>
  ) : null;
  const lay = (p: MonthParts) => (
    <>
      <Head title="Reports" sum={p.sum} actions={p.action ?? undefined} />
      {p.month || p.office ? <Tools end={p.office ?? undefined}>{p.month}</Tools> : null}
      {err && <p className="kx-said" data-tone="err" role="alert">{err}</p>}
      <Split side={sent}>
        {p.body}
        {custom}
        {canPrepare && offs.length === 0 && list && <p className="kx-quiet is-top">No reviewing office yet. StrayPaw adds it when your pilot starts.</p>}
      </Split>
    </>
  );

  return (
    <NgoGate title="Report packages" lede="Approved ABC records for a period, prepared for the reviewing office.">
      <Page>
        {off ? <><Head title="Reports" sum="Not switched on for this workspace yet." /><Panel><Empty title="Report packages are not switched on here yet." /></Panel></>
          : ctx ? <MonthlySubmission canPrepare={canPrepare} frame={lay} />
          : lay({ sum: err ? "Your packages could not be read." : "Reading your packages…", month: null, office: null, action: null, body: null })}
      </Page>
    </NgoGate>
  );
}
