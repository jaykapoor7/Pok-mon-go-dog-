"use client";

/* The One Health frame. One idea: a person works in one or more PLACES
   (their hospital, laboratory, field team or the programme office). The
   sidebar names the place they are in and its few pages; their other places
   are one tap away. Nothing in the frame decides access: every page reads
   through functions that check the person's role at that place. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowRightLeft, Building2, ClipboardList, FlaskConical, Gauge, HeartPulse, Home, LogOut, MapPinned, Microscope, PawPrint, PlusCircle, Printer, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { call, KIND_LABEL, ROLE_LABEL, useRead, type Kind, type Place } from "./data";
import { Failed, Loading, ToastHost } from "./ui";
import "./oh.css";

type Ctx = { places: Place[]; place: Place | null; reload: () => void; userName: string };
const OhCtx = createContext<Ctx>({ places: [], place: null, reload: () => {}, userName: "" });
export const useOh = () => useContext(OhCtx);

export const KIND_ICON: Record<Kind, typeof Home> = { coordinator: Gauge, municipal: Building2, hospital: Stethoscope, clinic: HeartPulse, laboratory: Microscope, ngo: PawPrint, research: Activity, training: Users };
export function Glyph({ kind, size = 16 }: { kind: Kind; size?: number }) { const I = KIND_ICON[kind] ?? Home; return <span className="oh-glyph" data-kind={kind}><I size={size} aria-hidden /></span>; }

export const isFacility = (k?: Kind) => k === "hospital" || k === "clinic";
export const oversees = (k?: Kind) => k === "coordinator" || k === "municipal" || k === "research";

type Item = { href: string; label: string; icon: typeof Home; count?: number | null; tone?: string; exact?: boolean };
function navFor(p: Place): Item[] {
  const w = `/workspace/${p.institution_id}`, pr = `/programme/${p.programme.slug}`;
  if (isFacility(p.kind)) return [
    { href: w, label: "Today", icon: Home, exact: true, count: (p.doses_due ?? 0) + (p.notices_new ?? 0) || null, tone: "flame" },
    { href: `${w}/register`, label: "Bite register", icon: ClipboardList },
    { href: `${w}/new`, label: "Record a bite", icon: PlusCircle },
    { href: `${w}/services`, label: "Services", icon: ShieldCheck, count: p.services_stale || null, tone: "flame" },
  ];
  if (p.kind === "laboratory") return [
    { href: w, label: "Sample queue", icon: FlaskConical, exact: true, count: p.samples_waiting || null },
    { href: `${w}/services`, label: "Services", icon: ShieldCheck },
  ];
  if (p.kind === "ngo") return [
    { href: w, label: "Follow-ups", icon: ArrowRightLeft, exact: true, count: p.handoffs_open || null, tone: p.handoffs_overdue ? "flame" : undefined },
    { href: `${w}/sample`, label: "Send a sample", icon: FlaskConical },
  ];
  return [
    { href: pr, label: "Overview", icon: Gauge, exact: true },
    { href: `${pr}/follow-ups`, label: "Follow-ups", icon: ArrowRightLeft, count: p.handoffs_open || null, tone: p.handoffs_overdue ? "flame" : undefined },
    { href: `${pr}/services`, label: "Services", icon: MapPinned },
    { href: `${pr}/report`, label: "Report", icon: Printer },
  ];
}

const placeHome = (p: Place) => (oversees(p.kind) ? `/programme/${p.programme.slug}` : `/workspace/${p.institution_id}`);
export { placeHome };

function current(path: string, places: Place[]): Place | null {
  const w = path.match(/^\/workspace\/([0-9a-f-]{36})/);
  if (w) return places.find((p) => p.institution_id === w[1]) ?? null;
  const pr = path.match(/^\/programme\/([a-z0-9-]+)/);
  if (pr) return places.find((p) => p.programme.slug === pr[1] && oversees(p.kind)) ?? places.find((p) => p.programme.slug === pr[1]) ?? null;
  return null;
}

export function OhShell({ children, crumb }: { children: ReactNode; crumb?: ReactNode }) {
  const { user, ready } = useAuth();
  const res = useRead<Place[]>(() => call<Place[]>("oh_my_today"), user?.id ?? "anon", ready && !!user);
  if (!ready || (user && res.loading && !res.data)) return <div className="oh"><div className="oh-page"><Loading rows={4} /></div></div>;
  if (!user) return <div className="oh"><SignedOut /></div>;
  if (res.error) return <div className="oh"><div className="oh-page"><Failed error={res.error} retry={res.reload} /></div></div>;
  return <Frame places={res.data ?? []} reload={res.reload} crumb={crumb}>{children}</Frame>;
}

function Frame({ places, reload, children, crumb }: { places: Place[]; reload: () => void; children: ReactNode; crumb?: ReactNode }) {
  const path = usePathname() ?? "/";
  const { user, signOut } = useAuth();
  const router = useRouter();
  const place = current(path, places);
  const userName = user?.name || user?.email || "";
  const nav = place ? navFor(place) : [];
  const others = places.filter((p) => p !== place);
  const illustrative = place?.programme.illustrative ?? places.some((p) => p.programme.illustrative);
  const ctx = useMemo(() => ({ places, place, reload, userName }), [places, place, reload, userName]);
  const on = (i: Item) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));
  const leave = async () => { await signOut?.(); router.push("/today"); };
  return (
    <OhCtx.Provider value={ctx}>
      <ToastHost>
        <div className="oh">
          <div className="oh-frame">
            <aside className="oh-side" aria-label="Places and pages">
              <Link href="/today" className="oh-brand"><Mark /><span>StrayPaw<small>One Health</small></span></Link>
              {place ? (
                <Link href={placeHome(place)} className="oh-place" aria-label={`${place.name}, ${ROLE_LABEL[place.role]}`}>
                  <Glyph kind={place.kind} />
                  <div><b>{place.short_name ?? place.name}</b><span>{ROLE_LABEL[place.role]} · {KIND_LABEL[place.kind]}</span></div>
                </Link>
              ) : null}
              <nav className="oh-nav" aria-label="Pages">
                {!place ? <Link href="/today" aria-current={path === "/today" ? "page" : undefined}><Home size={16} aria-hidden />Today</Link> : null}
                {nav.map((i) => <Link key={i.href} href={i.href} aria-current={on(i) ? "page" : undefined}><i.icon size={16} aria-hidden />{i.label}{i.count ? <span className="count" data-tone={i.tone}>{i.count}</span> : null}</Link>)}
                {place && !oversees(place.kind) ? <Link href={`/programme/${place.programme.slug}`}><Gauge size={16} aria-hidden />Programme</Link> : null}
                {place?.kind === "ngo" ? <Link href="/ngo"><PawPrint size={16} aria-hidden />Organisation workspace</Link> : null}
              </nav>
              {others.length ? (
                <nav className="oh-nav" aria-label="Your other places">
                  <p className="oh-nav-label">Your places</p>
                  {place ? <Link href="/today"><Home size={16} aria-hidden />Today, everywhere</Link> : null}
                  {others.map((p) => { const I = KIND_ICON[p.kind]; const n = (p.doses_due ?? 0) + (p.notices_new ?? 0) + (p.samples_waiting ?? 0) + p.handoffs_open; return <Link key={p.institution_id} href={placeHome(p)}><I size={16} aria-hidden />{p.short_name ?? p.name}{n ? <span className="count">{n}</span> : null}</Link>; })}
                </nav>
              ) : null}
              <div className="oh-side-foot">
                <div className="oh-me"><span className="oh-avatar" aria-hidden>{(userName || "?").slice(0, 1).toUpperCase()}</span><div><b>{userName}</b>{place ? ROLE_LABEL[place.role] : `${places.length} place${places.length === 1 ? "" : "s"}`}</div></div>
                <nav className="oh-nav" style={{ marginTop: 0 }}><button type="button" onClick={leave} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 36, padding: "7px 10px", borderRadius: 8, color: "var(--body)", fontWeight: 500 }}><LogOut size={16} aria-hidden />Sign out</button></nav>
              </div>
            </aside>
            <div className="oh-main">
              {illustrative ? <p className="oh-demo" role="note"><b>Illustrative demonstration.</b> <span className="oh-demo-long">Every record here is invented for the demo; no figure is a real programme figure.</span><span className="oh-demo-short">Invented records, not real figures.</span></p> : null}
              <header className="oh-top">
                <Link href="/today" className="oh-phone-top" aria-label="Your places">
                  {place ? <Glyph kind={place.kind} size={15} /> : <Mark />}
                  <div><b>{place ? place.short_name ?? place.name : "Today"}</b><span>{place ? place.programme.name : "StrayPaw One Health"}</span></div>
                </Link>
                <nav className="oh-crumb" aria-label="Breadcrumb">{crumb ?? (place ? <><Link href="/today">Today</Link><span aria-hidden>/</span><span aria-current="page">{place.short_name ?? place.name}</span></> : <span aria-current="page">Today</span>)}</nav>
              </header>
              {children}
            </div>
          </div>
          {place && nav.length ? (
            <nav className="oh-tabbar" aria-label="Pages">
              {nav.slice(0, 4).map((i) => <Link key={i.href} href={i.href} aria-current={on(i) ? "page" : undefined}><i.icon size={20} aria-hidden />{i.label.replace("Record a bite", "Record").replace("Bite register", "Register")}{i.count ? <span className="dot">{i.count}</span> : null}</Link>)}
              <Link href="/today" aria-current={path === "/today" ? "page" : undefined}><Home size={20} aria-hidden />Places</Link>
            </nav>
          ) : null}
        </div>
      </ToastHost>
    </OhCtx.Provider>
  );
}

export function Mark() {
  return <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><rect width="26" height="26" rx="7" fill="#2457ce" /><path d="M8 15.5c0-2.2 2.2-3.8 5-3.8s5 1.6 5 3.8-2 3.5-5 3.5-5-1.3-5-3.5Z" fill="#fff" /><circle cx="8.6" cy="10" r="1.7" fill="#fff" /><circle cx="12" cy="7.6" r="1.7" fill="#fff" /><circle cx="15.6" cy="7.9" r="1.7" fill="#fff" /><circle cx="18.4" cy="10.6" r="1.7" fill="#fff" /></svg>;
}

/* ── Signed out: sign in, or (on demonstration builds) enter as a sample person ── */
const LOCAL = process.env.NEXT_PUBLIC_OH_LOCAL === "1";
const DEMO = LOCAL || process.env.NEXT_PUBLIC_OH_DEMO === "1";
export const DEMO_PEOPLE: { role: string; who: string; does: string; kind: Kind }[] = [
  { role: "programme", who: "Programme lead", does: "Sees the whole programme and decides the response", kind: "coordinator" },
  { role: "clinician", who: "Hospital clinician", does: "Assesses bites and prescribes post-exposure care", kind: "hospital" },
  { role: "nurse", who: "Hospital nurse", does: "Gives doses and calls patients who are due", kind: "hospital" },
  { role: "phc", who: "Health-centre doctor", does: "Runs bite care at an urban health centre", kind: "clinic" },
  { role: "field", who: "NGO field worker", does: "Finds bite animals, vaccinates, sends samples", kind: "ngo" },
  { role: "lab", who: "Laboratory scientist", does: "Receives, tests and reports samples", kind: "laboratory" },
  { role: "municipal", who: "Municipal officer", does: "Oversees vaccination and field operations", kind: "municipal" },
  { role: "analyst", who: "Epidemiologist", does: "Works with aggregate programme data only", kind: "research" },
];

export async function enterDemo(role: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) return "StrayPaw is not configured on this site.";
  if (LOCAL) { const { error } = await db.auth.signInWithPassword({ email: `demo-oh-${role}@straypaw.invalid`, password: "one-health-local" }); return error ? error.message : null; }
  const r = await fetch("/api/demo/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: `oh-${role}` }) }).catch(() => null);
  if (!r?.ok) return "The sample account could not be signed in just now.";
  const t = (await r.json()) as { access_token: string; refresh_token: string };
  const { error } = await db.auth.setSession(t);
  return error ? error.message : null;
}

function SignedOut() {
  const { openSignIn } = useAuth();
  const [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  useEffect(() => { document.title = "Sign in · StrayPaw One Health"; }, []);
  const go = async (role: string) => { setBusy(role); setErr(null); const e = await enterDemo(role); if (e) { setErr(e); setBusy(null); } };
  return (
    <div className="oh-page" style={{ maxWidth: 880, margin: "0 auto", paddingTop: 64 }}>
      <Link href="/" className="oh-brand" style={{ padding: 0, marginBottom: 28 }}><Mark /><span>StrayPaw<small>One Health</small></span></Link>
      <h1 className="oh-title">One record for every bite, dose, sample and follow-up.</h1>
      <p className="oh-lede" style={{ marginBottom: 28 }}>Hospitals, laboratories, municipal teams and NGOs work on one programme. Each sees what they are responsible for; patient records never leave the facility that treats them.</p>
      <div className="oh-actions" style={{ marginBottom: 40 }}><button type="button" className="oh-btn primary" onClick={openSignIn}>Sign in</button><Link className="oh-btn" href="/bite-help">Bitten or scratched?</Link></div>
      {DEMO ? (
        <section aria-labelledby="demo-h">
          <div className="oh-sec-head"><h2 id="demo-h">Explore the Bengaluru demonstration</h2><p>Illustrative data. Choose who to be.</p></div>
          {err ? <div style={{ marginBottom: 12 }}><Failed error={err} /></div> : null}
          <div className="oh-roles">
            {DEMO_PEOPLE.map((p) => (
              <button type="button" key={p.role} className="oh-role" disabled={!!busy} onClick={() => go(p.role)} aria-busy={busy === p.role}>
                <Glyph kind={p.kind} /><div><b>{p.who}</b><span>{busy === p.role ? "Signing in…" : p.does}</span></div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
