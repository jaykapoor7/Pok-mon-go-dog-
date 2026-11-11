"use client";

/* Today: the one home for anyone who works in StrayPaw. Every place the
   person works (an NGO, a review office, a hospital, a laboratory, a
   programme) and what needs them at each, in sentences; above them, the
   urgent alerts from their programmes. One place and nothing else: go
   straight there. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, PawPrint } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { useMembership } from "@/sp/shell/Shell";
import { usePlaces, placeHome, placeLines, oversees } from "../places";
import { call, KIND_LABEL, ROLE_LABEL, type Alert, type Kind } from "../data";
import { AlertList, Empty, Failed, Glyph, Head, Loading, Page, Section } from "../ui";

const DEMO = process.env.NEXT_PUBLIC_OH_DEMO === "1";
export const DEMO_PEOPLE: { role: string; who: string; does: string; kind: Kind }[] = [
  { role: "programme", who: "Programme lead", does: "Coordination cell: alerts, partners, coverage and the report", kind: "coordinator" },
  { role: "clinician", who: "Hospital clinician", does: "Works at a teaching hospital and a health centre: assesses, prescribes", kind: "hospital" },
  { role: "nurse", who: "Hospital nurse", does: "Doses due, reminder calls and completion calls", kind: "hospital" },
  { role: "lab", who: "Laboratory scientist", does: "Receives, tests and reports samples", kind: "laboratory" },
  { role: "field", who: "NGO field worker", does: "Requests from hospitals; finds, observes and samples animals", kind: "ngo" },
  { role: "ngo", who: "NGO coordinator", does: "The NGO's ABC work and its programme requests, in one place", kind: "ngo" },
  { role: "municipal", who: "Municipal officer", does: "Vaccination drives and coverage across areas", kind: "municipal" },
  { role: "analyst", who: "Epidemiologist", does: "Suppressed, aggregate data and the research extract", kind: "research" },
  { role: "state", who: "State coordinator", does: "Oversees city programmes in the state", kind: "state" },
  { role: "coimbatore", who: "Another city's lead", does: "A separate programme that cannot see Bengaluru", kind: "municipal" },
];

async function enterDemo(role: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) return "StrayPaw is not configured on this site.";
  const r = await fetch("/api/demo/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: `oh-${role}` }) }).catch(() => null);
  if (!r?.ok) return "The sample account could not be signed in just now.";
  const t = (await r.json()) as { access_token: string; refresh_token: string };
  const { error } = await db.auth.setSession(t);
  return error ? error.message : null;
}

export function Today() {
  const { user, ready } = useAuth();
  if (!ready) return <Page><Loading rows={4} /></Page>;
  if (!user) return <SignedOut />;
  return <TodayBody name={user.name} />;
}

function TodayBody({ name }: { name: string }) {
  const { places, ready, error, reload } = usePlaces();
  const mem = useMembership();
  const router = useRouter();
  const first = name.split(" ").filter((w) => !/^(dr|sister|mr|ms|mrs)\.?$/i.test(w))[0] ?? "";
  const hour = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  /* Programmes this person oversees: their urgent alerts lead the page. */
  const progs = useMemo(() => [...new Map(places.filter((p) => oversees(p.kind)).flatMap((p) => p.programmes).map((x) => [x.id, x])).values()], [places]);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  useEffect(() => {
    if (!progs.length) { setAlerts([]); return; }
    let live = true;
    void Promise.all(progs.map((x) => call<Alert[]>("oh_alerts", { p_programme: x.id }).then((r) => (r.data ?? []).map((a) => ({ ...a, programme: x }))))).then((all) => { if (live) setAlerts(all.flat().filter((a) => a.severity === "urgent" && !a.ack)); });
    return () => { live = false; };
  }, [progs]);
  const ngoPlace = mem.org ? places.find((p) => p.kind === "ngo" && p.ngo_id === mem.org!.id) : undefined;
  const cards = places.filter((p) => p !== ngoPlace);
  const count = cards.length + (mem.member ? 1 : 0) + (mem.reviewer ? 1 : 0);
  useEffect(() => {
    if (!ready || !mem.ready || new URLSearchParams(window.location.search).has("all")) return;
    if (count === 1 && cards.length === 1) router.replace(placeHome(cards[0]));
    else if (count === 1 && mem.member) router.replace("/ngo");
    else if (count === 1 && mem.reviewer) router.replace("/city/insights");
  }, [ready, mem.ready, mem.member, mem.reviewer, count, cards, router]);
  if (!ready || !mem.ready) return <Page><Loading rows={4} /></Page>;
  const illustrative = places.some((p) => p.illustrative);
  const waiting = cards.reduce((s, p) => s + placeLines(p).reduce((a, l) => a + l.n, 0), 0) + (ngoPlace ? placeLines(ngoPlace).reduce((a, l) => a + l.n, 0) : 0);
  return (
    <Page illustrative={illustrative}>
      <Head title={`${hello}${first ? `, ${first}` : ""}.`} lede={count ? (waiting ? `${waiting} thing${waiting === 1 ? "" : "s"} across your places need you.` : "Nothing is waiting for you in your places right now.") : undefined} />
      {error ? <Failed error={error} retry={reload} /> : null}
      {alerts?.length ? (
        <Section title="Urgent" note="From the programmes you oversee">
          <AlertList alerts={alerts} programmeId={progs[0].id} onChange={() => setAlerts(null)} canAck={false} hrefFor={(a) => `/programme/${(a as Alert & { programme: { slug: string } }).programme.slug}`} />
        </Section>
      ) : null}
      {!count ? (
        <Empty title="You are not part of an organisation yet">If someone gave you an invite code, <Link className="oh-btn quiet small" href="/join">enter it here</Link>. An NGO can also <Link className="oh-btn quiet small" href="/partner-apply">register itself</Link>.</Empty>
      ) : (
        <Section title="Your places">
          <div className="oh-places">
            {mem.member && mem.org ? (
              <Link href="/ngo" className="oh-placecard">
                <header><span className="oh-glyph" data-kind="ngo"><PawPrint size={16} aria-hidden /></span><div><b>{mem.org.name}</b><span>{mem.role ? ROLE_LABEL[{ admin: "lead", coordinator: "coordinator", veterinarian: "clinician", member: "field" }[mem.role] as keyof typeof ROLE_LABEL] : "Member"} · NGO</span></div></header>
                <ul>
                  <li><span className="oh-row-mark" data-tone="blue" aria-hidden /><span>Animal register, cases, treatment and release</span></li>
                  {ngoPlace ? placeLines(ngoPlace).map((l) => <li key={l.text}><span className="oh-row-mark" data-tone={l.tone} aria-hidden /><span><b>{l.n}</b> {l.text}</span></li>) : null}
                </ul>
                <footer><span>{ngoPlace?.programmes.map((x) => x.name).join(", ") || "NGO workspace"}</span><ArrowRight size={16} aria-hidden /></footer>
              </Link>
            ) : null}
            {mem.reviewer ? (
              <Link href="/city/insights" className="oh-placecard">
                <header><span className="oh-glyph" data-kind="municipal"><Building2 size={16} aria-hidden /></span><div><b>Municipal review office</b><span>Reviewer</span></div></header>
                <ul><li><span className="oh-row-mark" data-tone="blue" aria-hidden /><span>NGO submissions, contracts and wards</span></li></ul>
                <footer><span>Review submissions</span><ArrowRight size={16} aria-hidden /></footer>
              </Link>
            ) : null}
            {cards.map((p) => {
              const ls = placeLines(p);
              return (
                <Link key={p.organisation_id} href={placeHome(p)} className="oh-placecard">
                  <header><Glyph kind={p.kind} /><div><b>{p.name}</b><span>{ROLE_LABEL[p.role]} · {KIND_LABEL[p.kind]}</span></div></header>
                  {ls.length ? <ul>{ls.map((l) => <li key={l.text}><span className="oh-row-mark" data-tone={l.tone} aria-hidden /><span><b>{l.n}</b> {l.text}</span></li>)}</ul> : <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nothing waiting.</p>}
                  <footer><span>{p.programmes.map((x) => x.name).join(", ")}</span><ArrowRight size={16} aria-hidden /></footer>
                </Link>
              );
            })}
          </div>
        </Section>
      )}
    </Page>
  );
}

function SignedOut() {
  const { openSignIn } = useAuth();
  const [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const go = async (role: string) => { setBusy(role); setErr(null); const e = await enterDemo(role); if (e) { setErr(e); setBusy(null); } };
  return (
    <Page>
      <Head title="One record for every animal, bite, dose, sample and follow-up." lede="NGOs, municipal teams, hospitals and laboratories work in one product. Each person sees what they are responsible for; patient records never leave the facility that treats them." actions={<><button type="button" className="oh-btn primary" onClick={openSignIn}>Sign in</button><Link className="oh-btn" href="/bite-help">Bitten or scratched?</Link></>} />
      {DEMO ? (
        <Section title="Explore the demonstration" note="Illustrative data. Choose who to be.">
          {err ? <div style={{ marginBottom: 12 }}><Failed error={err} /></div> : null}
          <div className="oh-roles">
            {DEMO_PEOPLE.map((p) => (
              <button type="button" key={p.role} className="oh-role" disabled={!!busy} onClick={() => void go(p.role)} aria-busy={busy === p.role}>
                <Glyph kind={p.kind} /><div><b>{p.who}</b><span>{busy === p.role ? "Signing in…" : p.does}</span></div>
              </button>
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  );
}
