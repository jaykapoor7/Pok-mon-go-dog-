"use client";

/* Today: every place a person works, and what needs them at each, in sentences. */
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { OhShell, Glyph, placeHome, useOh } from "../Shell";
import { Empty, Head } from "../ui";
import { KIND_LABEL, ROLE_LABEL, type Place } from "../data";

export function Today() { return <OhShell><TodayBody /></OhShell>; }

function lines(p: Place): { n: number; text: string; tone?: string }[] {
  const out: { n: number; text: string; tone?: string }[] = [];
  if (p.doses_due) out.push({ n: p.doses_due, text: p.doses_due === 1 ? "dose due today or overdue" : "doses due today or overdue", tone: "flame" });
  if (p.notices_new) out.push({ n: p.notices_new, text: p.notices_new === 1 ? "bite notice from the public" : "bite notices from the public", tone: "amber" });
  if (p.samples_waiting) out.push({ n: p.samples_waiting, text: p.samples_waiting === 1 ? "sample waiting at the laboratory" : "samples waiting at the laboratory", tone: "blue" });
  if (p.handoffs_overdue) out.push({ n: p.handoffs_overdue, text: p.handoffs_overdue === 1 ? "follow-up overdue" : "follow-ups overdue", tone: "flame" });
  const fresh = p.handoffs_open - p.handoffs_overdue;
  if (fresh > 0) out.push({ n: fresh, text: fresh === 1 ? "open follow-up" : "open follow-ups", tone: "blue" });
  if (p.services_stale) out.push({ n: p.services_stale, text: p.services_stale === 1 ? "service confirmation has expired" : "service confirmations have expired", tone: "amber" });
  return out;
}

function TodayBody() {
  const { places, userName } = useOh();
  const router = useRouter();
  const first = userName.split(" ").filter((w) => !/^(dr|sister|mr|ms|mrs)\.?$/i.test(w))[0] ?? "";
  const hour = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  /* One place and nothing to choose: go straight there. */
  useEffect(() => { if (places.length === 1 && !new URLSearchParams(window.location.search).has("all")) router.replace(placeHome(places[0])); }, [places, router]);
  const total = places.reduce((s, p) => s + lines(p).reduce((a, l) => a + l.n, 0), 0);
  return (
    <main className="oh-page" id="main-content">
      <Head title={`${hello}${first ? `, ${first}` : ""}.`} lede={places.length ? (total ? `${total} thing${total === 1 ? "" : "s"} across your places need attention.` : "Nothing is waiting for you right now.") : undefined} />
      {!places.length ? (
        <Empty title="You are not part of a One Health programme yet">Your programme coordinator adds you to your hospital, laboratory or team. If you work with an NGO, open <Link href="/ngo" className="oh-btn quiet small">your organisation</Link>.</Empty>
      ) : (
        <div className="oh-places">
          {places.map((p) => {
            const ls = lines(p);
            return (
              <Link key={p.institution_id} href={placeHome(p)} className="oh-placecard">
                <header><Glyph kind={p.kind} /><div><b>{p.name}</b><span>{ROLE_LABEL[p.role]} · {KIND_LABEL[p.kind]}</span></div></header>
                {ls.length ? <ul>{ls.map((l) => <li key={l.text}><span className="oh-row-mark" data-tone={l.tone} aria-hidden /><span><b>{l.n}</b> {l.text}</span></li>)}</ul> : <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nothing waiting.</p>}
                <footer><span>{p.programme.name}</span><ArrowRight size={16} aria-hidden /></footer>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
