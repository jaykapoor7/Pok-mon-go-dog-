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
        <><Empty title="You are not part of an organisation yet">Enter the invite code your coordinator gave you, or start a programme. An NGO can also <Link className="oh-btn quiet small" href="/partner-apply">register itself</Link>.</Empty><InviteCode open /><StartProgramme /></>
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
          <InviteCode />
          <StartProgramme />
        </Section>
      )}
    </Page>
  );
}

/** An invitation from a hospital, laboratory or programme: the code their
    coordinator created in Programme setup. Accepting adds this person to
    that organisation with the role the code carries. */
function InviteCode({ open: startOpen = false }: { open?: boolean }) {
  const { reload } = usePlaces();
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const accept = async () => {
    setBusy(true); setMsg(null);
    const r = await call<{ organisation_id: string; role: string }>("oh_accept_invite", { p_code: code.trim().toUpperCase() });
    setBusy(false);
    if (r.error || !r.data) setMsg({ ok: false, text: r.error ?? "That code did not work." });
    else { setMsg({ ok: true, text: `You are in, as ${ROLE_LABEL[r.data.role as keyof typeof ROLE_LABEL] ?? r.data.role}.` }); setCode(""); reload(); }
  };
  return (
    <details className="oh-invite" open={startOpen || undefined}>
      <summary>Have an invite code?</summary>
      <div className="oh-invite-body">
        <input className="oh-input" value={code} maxLength={12} onChange={(e) => setCode(e.target.value)} placeholder="8-character code" aria-label="Invite code" autoCapitalize="characters" />
        <button type="button" className="oh-btn primary" disabled={busy || code.trim().length < 6} onClick={() => void accept()}>{busy ? "Checking…" : "Join"}</button>
        {msg ? <p role="status" style={{ color: msg.ok ? "var(--green)" : "var(--flame)" }}>{msg.text}</p> : null}
      </div>
    </details>
  );
}

/** A new deployment without engineering: name the programme, its city and
    areas; the person becomes its lead and continues in Programme setup to add
    partners, modules and people. */
function StartProgramme() {
  const router = useRouter();
  const { reload } = usePlaces();
  const [f, setF] = useState({ name: "", city: "", areas: "", me: "" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const slug = f.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const go = async () => {
    setBusy(true); setErr(null);
    const areas = f.areas.split(/[,\n]/).map((a) => a.trim()).filter((a) => a.length >= 2).slice(0, 200);
    const r = await call<{ id: string; slug: string }>("oh_create_programme", { p_name: f.name.trim(), p_slug: slug, p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", p_area_names: areas, p_parent: null, p_city: f.city.trim() || null, p_display_name: f.me.trim() || null });
    setBusy(false);
    if (r.error || !r.data) { setErr(r.error ?? "Could not create the programme."); return; }
    reload(); router.push(`/programme/${r.data.slug}/setup`);
  };
  return (
    <details className="oh-invite">
      <summary>Start a programme</summary>
      <div className="oh-card pad" style={{ marginTop: 10, display: "grid", gap: 14, maxWidth: 620 }}>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>For a municipality, a hospital network or a state. You become its lead; next you add partners, areas and people. Nothing is shared until you invite someone.</p>
        <div className="oh-fields">
          <label className="oh-field"><span>Programme name</span><input value={f.name} maxLength={140} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="For example: Pune rabies elimination" /></label>
          <label className="oh-field"><span>City or state</span><input value={f.city} maxLength={80} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <label className="oh-field full"><span>Wards or localities</span><textarea value={f.areas} onChange={(e) => setF({ ...f, areas: e.target.value })} placeholder="One per line, or separated by commas. You can add more later." /></label>
          <label className="oh-field"><span>Your name, as partners will see it</span><input value={f.me} maxLength={80} onChange={(e) => setF({ ...f, me: e.target.value })} /></label>
        </div>
        {err ? <Failed error={err} /> : null}
        <div className="oh-submit"><button type="button" className="oh-btn primary" disabled={busy || f.name.trim().length < 3 || slug.length < 3} onClick={() => void go()}>{busy ? "Creating…" : "Create programme"}</button>{slug.length >= 3 ? <p>Address: /programme/{slug}</p> : null}</div>
      </div>
    </details>
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
