"use client";

/* The reviewing office's own work, above the city record: what waits on a
   decision, what waits on an operator, and what has been accepted. Read from
   the packages submitted to this office; nothing here is estimated. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { myContext, packages, type AbcContext, type Package } from "@/lib/abc";

const days = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));

export function OfficeStrip() {
  const { user } = useAuth();
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [list, setList] = useState<Package[] | null>(null);
  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([myContext(), packages()])
      .then(([c, p]) => { if (live) { setCtx(c); setList(p.filter((x) => c.offices.some((o) => o.id === x.office_id) && x.status !== "draft")); } })
      .catch(() => { /* not a reviewing office, or review not switched on: the strip stays away */ });
    return () => { live = false; };
  }, [user]);
  if (!ctx || !list || ctx.offices.length === 0) return null;

  const waiting = list.filter((p) => p.status === "submitted");
  const oldest = waiting.reduce<number | null>((m, p) => { const d = days(p.submitted_at ?? p.created_at); return m === null || d > m ? d : m; }, null);
  const onOperator = list.filter((p) => p.status === "queried" || p.status === "returned").length;
  const year = String(new Date().getFullYear());
  const accepted = list.filter((p) => (p.status === "accepted" || p.status === "partially_accepted") && (p.decided_at ?? "").startsWith(year));
  const records = accepted.reduce((n, p) => n + (p.summary.records ?? p.case_ids.length), 0);
  const operators = new Set(list.map((p) => p.ngo_id)).size;

  return (
    <section className="os" aria-label={`${ctx.offices[0].name}: decisions`}>
      <p className="os-k">{ctx.offices[0].name}</p>
      <ul className="os-tiles">
        <li className={waiting.length ? "is-due" : undefined}><Link href="/city/review"><span>Waiting for your decision</span><b>{waiting.length}</b><small>{oldest === null ? "Nothing waiting" : oldest === 0 ? "Submitted today" : `Oldest waiting ${oldest} ${oldest === 1 ? "day" : "days"}`}</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/review"><span>With the operator</span><b>{onOperator}</b><small>Queried or returned</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/review"><span>Accepted in {year}</span><b>{accepted.length}</b><small>{records} {records === 1 ? "record" : "records"} · accepted is not paid</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/contracts"><span>Operators submitting</span><b>{operators}</b><small>Contracts &amp; rates</small><ArrowRight size={14} aria-hidden /></Link></li>
      </ul>
    </section>
  );
}
