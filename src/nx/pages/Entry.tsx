"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, FlaskConical, HeartPulse, KeyRound, Landmark, Loader2, PawPrint, Search, Stethoscope, Users } from "lucide-react";
import { call } from "@/oh/data";
import { homeOf } from "../nav";
import { Shell } from "../Shell";
import { useLive } from "../live";

/* Entry to the new app. `/next` sends a signed-in person to the workspace they belong to, and someone with no
   workspace yet to Start. Nothing here grants access: every path is an existing, server-checked one (registering
   an NGO, a staff code, a programme invitation, starting one's own programme). Institutional roles such as a
   reviewing office are set up with StrayPaw and are never self-selected. */

export function NextHome() {
  const live = useLive();
  const router = useRouter();
  useEffect(() => {
    if (!live.ready) return;
    if (!live.signedIn) { router.replace("/next/ngo/today"); return; }
    const o = live.org ?? live.orgs[0];
    router.replace(o ? homeOf(o.workspace, o.org_id) : "/next/start");
  }, [live.ready, live.signedIn, live.org, live.orgs, router]);
  return <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "#667085", font: "14px system-ui" }} role="status"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Loader2 size={16} className="nx-spin" />Opening your workspace…</span></div>;
}

type Card = { icon: typeof Building2; title: string; body: string; act: React.ReactNode };

export function Start() {
  const live = useLive();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [prog, setProg] = useState({ name: "", city: "", areas: "", me: "" });
  const [progOpen, setProgOpen] = useState(false);
  const [vetOpen, setVetOpen] = useState(false);
  const [vet, setVet] = useState({ name: "", city: "", me: "" });
  const [find, setFind] = useState("");
  const [found, setFound] = useState<{ id: string; name: string; kind: string; place: string | null }[] | null>(null);
  const [asking, setAsking] = useState<{ id: string; name: string } | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { const q = find.trim(); if (q.length < 3 || !live.signedIn) { setFound(null); return; } const t = window.setTimeout(async () => { const r = await call<{ id: string; name: string; kind: string; place: string | null }[]>("nx_find_orgs", { p_q: q }); setFound(r.data ?? []); }, 250); return () => window.clearTimeout(t); }, [find, live.signedIn]);
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("invite"); if (c && /^[A-Za-z0-9]{6,12}$/.test(c)) setCode(c.toUpperCase()); }, []);

  const accept = async () => {
    setBusy(true); setMsg(null);
    const r = await call<{ organisation_id: string; role: string }>("oh_accept_invite", { p_code: code.trim().toUpperCase() });
    setBusy(false);
    if (r.error || !r.data) { setMsg({ ok: false, text: r.error ?? "That code did not work. Check it with the person who gave it to you." }); return; }
    setMsg({ ok: true, text: "You are in. Opening your workspace…" });
    window.location.assign("/next");
  };
  const startProgramme = async () => {
    const slug = prog.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const areas = prog.areas.split(/[,\n]/).map((a) => a.trim()).filter((a) => a.length >= 2).slice(0, 200);
    setBusy(true); setMsg(null);
    const r = await call<{ id: string; slug: string }>("oh_create_programme", { p_name: prog.name.trim(), p_slug: slug, p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata", p_area_names: areas, p_parent: null, p_city: prog.city.trim() || null, p_display_name: prog.me.trim() || null });
    setBusy(false);
    if (r.error || !r.data) { setMsg({ ok: false, text: r.error ?? "The programme could not be created." }); return; }
    window.location.assign("/next/gov/overview");
  };

  const registerVet = async () => {
    setBusy(true); setMsg(null);
    const r = await call<string>("nx_register_vet_clinic", { p_name: vet.name.trim(), p_city: vet.city.trim() || null, p_display_name: vet.me.trim() || null });
    setBusy(false);
    if (r.error || !r.data) { setMsg({ ok: false, text: r.error ?? "The clinic could not be registered." }); return; }
    window.location.assign("/next/health/today");
  };
  const askToJoin = async () => {
    if (!asking) return;
    setBusy(true); setMsg(null);
    const r = await call<string>("nx_request_join", { p_org: asking.id, p_note: note.trim() || null, p_name: live.userName });
    setBusy(false);
    if (r.error) { setMsg({ ok: false, text: r.error }); return; }
    setAsking(null); setNote(""); setMsg({ ok: true, text: `Asked. ${asking.name}'s leads decide, and you will be told here and by notification.` });
  };
  const signedIn = live.signedIn;
  const signIn = (as?: string) => `/sign-in?${as ? `as=${as}&` : ""}switch=1&next=${encodeURIComponent("/next")}`;
  const cards: Card[] = [
    { icon: PawPrint, title: "An NGO or animal welfare group", body: "Register your organisation. You become its lead and can invite your team, field staff and veterinarians.",
      act: <Link href={signIn("org")} className="nx-btn">Register an NGO<ArrowRight size={14} /></Link> },
    { icon: HeartPulse, title: "Veterinary clinic", body: "Register your clinic. Your patients, appointments and signed clinical records stay with the clinic; partner NGOs see only what you share.",
      act: <button type="button" className="nx-btn is-quiet" onClick={() => setVetOpen(true)}>Register a clinic<ArrowRight size={14} /></button> },
    { icon: Users, title: "Staff or volunteer of an NGO", body: "Your NGO's lead gives you a six-character code. It signs you in with the role they chose for you, including veterinarian.",
      act: <Link href="/join" className="nx-btn is-quiet">Use a staff code<ArrowRight size={14} /></Link> },
    { icon: Stethoscope, title: "Hospital, clinic or health centre", body: "Your programme's coordinator invites your facility and gives you a code. Patient records stay with your facility.",
      act: <a href="#invite" className="nx-btn is-quiet">Enter an invitation code<ArrowRight size={14} /></a> },
    { icon: FlaskConical, title: "Laboratory or research group", body: "Joined by invitation from the programme whose samples or data you work with. Research sees only suppressed, aggregated data.",
      act: <a href="#invite" className="nx-btn is-quiet">Enter an invitation code<ArrowRight size={14} /></a> },
    { icon: Landmark, title: "Programme coordinator", body: "Start a programme for a city, district or state. You lead what you create; nobody else joins until you invite them.",
      act: <button type="button" className="nx-btn is-quiet" onClick={() => setProgOpen(true)}>Start a programme<ArrowRight size={14} /></button> },
    { icon: Building2, title: "Municipal reviewing office", body: "A reviewing office decides on public money, so StrayPaw sets it up with the office directly. It is never self-registered.",
      act: <Link href="/contact" className="nx-btn is-quiet">Ask us to set it up<ArrowRight size={14} /></Link> },
  ];

  return (
    <Shell crumb={["Start"]}>
      <div className="nx-page" style={{ maxWidth: 980 }}>
        <div className="nx-head"><div>
          <p className="nx-eyebrow">{signedIn ? (live.orgs.length ? `You are in ${live.orgs.length} ${live.orgs.length === 1 ? "workspace" : "workspaces"}` : "You are signed in, but not part of an organisation yet") : "Welcome to StrayPaw"}</p>
          <h1 className="nx-h1">{live.orgs.length ? "Join another organisation" : "How will you use StrayPaw?"}</h1>
          <p className="nx-sub">Choose what fits. Every route below is checked by the database; none of them gives access by itself.</p>
        </div>{live.orgs.length ? <Link href="/next" className="nx-btn is-keep">Open my workspace<ArrowRight size={14} /></Link> : null}</div>

        {!signedIn && live.ready ? <p className="nx-note" style={{ marginTop: 18 }}><KeyRound size={13} /><span>Already have an account? <Link href={signIn()} style={{ color: "var(--accent)" }}>Sign in</Link> with your email and a six-character code. No password.</span></p> : null}

        <div className="nx-start">
          {cards.map((c) => (
            <article key={c.title} className="nx-chk">
              <div className="nx-chk-h"><c.icon size={16} style={{ color: "var(--accent)" }} /><span>{c.title}</span></div>
              <p className="nx-chk-m">{c.body}</p>
              <div className="nx-chk-a">{c.act}</div>
            </article>
          ))}
        </div>

        <section className="nx-sec" aria-labelledby="st-f" style={{ marginTop: 28, maxWidth: 560 }}>
          <div className="nx-sec-h"><h2 id="st-f">Find your organisation</h2></div>
          {signedIn ? <>
            <label className="nx-find" style={{ width: "100%", marginTop: 6 }}><Search size={13} /><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Type at least three letters of its name" aria-label="Find your organisation" /></label>
            {found ? (found.length ? <ul className="nx-feed" style={{ marginTop: 8 }}>{found.map((o) => <li key={o.id} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><div><b>{o.name}</b><small>{o.kind === "ngo" ? "NGO" : o.kind}{o.place ? ` · ${o.place}` : ""}</small></div><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setAsking({ id: o.id, name: o.name })}>Ask to join</button></li>)}</ul>
              : <p className="nx-foot">No organisation by that name takes requests. Ask its lead for a staff code or an invitation code instead.</p>) : <p className="nx-foot">Its leads decide whether to let you in, and with which role.</p>}
          </> : <p className="nx-sub"><Link href={signIn()} style={{ color: "var(--accent)" }}>Sign in first</Link>, then search for it here.</p>}
        </section>

        <section className="nx-sec" id="invite" aria-labelledby="st-i" style={{ marginTop: 28, maxWidth: 560 }}>
          <div className="nx-sec-h"><h2 id="st-i">Have an invitation code?</h2></div>
          {signedIn ? <form className="nx-form" onSubmit={(e) => { e.preventDefault(); void accept(); }}>
            <label>Code from your programme coordinator<input value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} autoCapitalize="characters" placeholder="8-character code" /></label>
            <button type="submit" className="nx-btn" disabled={busy || code.trim().length < 6}>{busy ? "Checking…" : "Join"}</button>
          </form> : <p className="nx-sub"><Link href={signIn()} style={{ color: "var(--accent)" }}>Sign in first</Link>, then enter the code here. The code adds you to that organisation with the role it carries.</p>}
          {msg ? <p className="nx-foot" role="status" style={{ color: msg.ok ? undefined : "var(--bad)" }}>{msg.text}</p> : null}
        </section>
      </div>

      {vetOpen ? <div className="nx-modal" role="dialog" aria-label="Register a veterinary clinic" onKeyDown={(e) => { if (e.key === "Escape") setVetOpen(false); }}>
        <form className="nx-modal-b nx-form" onSubmit={(e) => { e.preventDefault(); if (!signedIn) { router.push(signIn()); return; } void registerVet(); }}>
          <h2 className="nx-h3" style={{ marginTop: 0, fontSize: 15 }}>Register a veterinary clinic</h2>
          <p className="nx-foot" style={{ marginTop: 0 }}>You become its lead. Add your veterinarians and staff afterwards; only a veterinarian signs clinical records.</p>
          <label>Clinic name<input required minLength={3} maxLength={160} value={vet.name} onChange={(e) => setVet({ ...vet, name: e.target.value })} autoFocus /></label>
          <label>City or address<input maxLength={300} value={vet.city} onChange={(e) => setVet({ ...vet, city: e.target.value })} /></label>
          <label>Your name as others will see it<input maxLength={80} value={vet.me} onChange={(e) => setVet({ ...vet, me: e.target.value })} /></label>
          <div style={{ display: "flex", gap: 8 }}><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Registering…" : signedIn ? "Register the clinic" : "Sign in to register"}</button><button type="button" className="nx-btn is-quiet" onClick={() => setVetOpen(false)}>Cancel</button></div>
          {msg && !msg.ok ? <p className="nx-foot" role="alert" style={{ color: "var(--bad)" }}>{msg.text}</p> : null}
        </form>
      </div> : null}
      {asking ? <div className="nx-modal" role="dialog" aria-label={`Ask to join ${asking.name}`} onKeyDown={(e) => { if (e.key === "Escape") setAsking(null); }}>
        <form className="nx-modal-b nx-form" onSubmit={(e) => { e.preventDefault(); void askToJoin(); }}>
          <h2 className="nx-h3" style={{ marginTop: 0, fontSize: 15 }}>Ask to join {asking.name}</h2>
          <p className="nx-foot" style={{ marginTop: 0 }}>Its leads see your name and this note, and choose your role. Nothing is shared with you until they accept.</p>
          <label>A note for them (optional)<textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Who you are and how you work with them" autoFocus /></label>
          <div style={{ display: "flex", gap: 8 }}><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Sending…" : "Send request"}</button><button type="button" className="nx-btn is-quiet" onClick={() => setAsking(null)}>Cancel</button></div>
          {msg && !msg.ok ? <p className="nx-foot" role="alert" style={{ color: "var(--bad)" }}>{msg.text}</p> : null}
        </form>
      </div> : null}
      {progOpen ? <div className="nx-modal" role="dialog" aria-label="Start a programme" onKeyDown={(e) => { if (e.key === "Escape") setProgOpen(false); }}>
        <form className="nx-modal-b nx-form" onSubmit={(e) => { e.preventDefault(); if (!signedIn) { router.push(signIn()); return; } void startProgramme(); }}>
          <h2 className="nx-h3" style={{ marginTop: 0, fontSize: 15 }}>Start a programme</h2>
          <p className="nx-foot" style={{ marginTop: 0 }}>You become its lead. Next you add partners, areas and people from the programme&apos;s setup. Nothing is shared until you invite someone.</p>
          <label>Programme name<input required minLength={3} maxLength={140} value={prog.name} onChange={(e) => setProg({ ...prog, name: e.target.value })} placeholder="For example: Pune rabies elimination" autoFocus /></label>
          <label>City<input maxLength={80} value={prog.city} onChange={(e) => setProg({ ...prog, city: e.target.value })} /></label>
          <label>Areas, separated by commas<textarea rows={2} value={prog.areas} onChange={(e) => setProg({ ...prog, areas: e.target.value })} placeholder="Ward 1, Ward 2, Ward 3" /></label>
          <label>Your name as others will see it<input maxLength={80} value={prog.me} onChange={(e) => setProg({ ...prog, me: e.target.value })} /></label>
          <div style={{ display: "flex", gap: 8 }}><button type="submit" className="nx-btn" disabled={busy}>{busy ? "Starting…" : signedIn ? "Start the programme" : "Sign in to start"}</button><button type="button" className="nx-btn is-quiet" onClick={() => setProgOpen(false)}>Cancel</button></div>
          {msg && !msg.ok ? <p className="nx-foot" role="alert" style={{ color: "var(--bad)" }}>{msg.text}</p> : null}
        </form>
      </div> : null}
    </Shell>
  );
}
