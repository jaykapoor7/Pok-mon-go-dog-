"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, GraduationCap, KeyRound, Landmark, Loader2, LogIn, Map as MapIcon, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { getMyNgo, getMyRole, isNgoMember } from "@/lib/actions";
import "@/sp3/sp3.css";
import "./entry.css";
import "@/sp4/sp4.css";
import "@/sp4/entry4.css";

/* ════════════════════════════════════════════════════════════════════
   Open App. The product gateway.

   Signed-in organisation members go straight to their workspace (or the
   page they were sent from). Everyone else sees the paths they can
   actually use: sign in, join with a code, apply, or the public tools.
   Membership is asked of the database (is_ngo_member / my_ngo); nothing
   here grants access, and every workspace checks again on every read.
   `?choose=1` shows the choices without redirecting.
   ════════════════════════════════════════════════════════════════════ */

type State = { phase: "checking" } | { phase: "routing"; to: string; org: string } | { phase: "choose"; signedIn: boolean } | { phase: "both"; org: string } | { phase: "error" };

export function Gateway() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const q = useSearchParams();
  const choose = q?.get("choose") === "1";
  const next = q?.get("next");
  const [s, setS] = useState<State>({ phase: "checking" });

  useEffect(() => {
    if (!ready) return;
    if (!user) { setS({ phase: "choose", signedIn: false }); return; }
    let live = true;
    /* Where to go is decided by server-checked memberships only: an NGO
       membership, a reviewing-office membership, both, or neither. A
       remembered workspace, an email domain or the URL never decides. */
    Promise.all([isNgoMember(), getMyNgo().catch(() => null), getMyRole()]).then(([member, org, role]) => {
      if (!live) return;
      const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      const reviewer = role.reviewer;
      const fits = (to: string) => (to.startsWith("/ngo") ? member : to.startsWith("/city/review") || to.startsWith("/city/contracts") ? reviewer : true);
      if (choose && (member || reviewer)) { setS(member && reviewer ? { phase: "both", org: org?.name ?? "your organisation" } : { phase: "choose", signedIn: true }); return; }
      if (safe && fits(safe)) { setS({ phase: "routing", to: safe, org: org?.name ?? "your workspace" }); router.replace(safe); return; }
      if (member && reviewer) { setS({ phase: "both", org: org?.name ?? "your organisation" }); return; }
      if (member) { setS({ phase: "routing", to: "/ngo", org: org?.name ?? "your organisation" }); router.replace("/ngo"); return; }
      if (reviewer) { setS({ phase: "routing", to: "/city/review", org: "your reviewing office" }); router.replace("/city/review"); return; }
      setS({ phase: "choose", signedIn: true });
    }).catch(() => { if (live) setS({ phase: "error" }); });
    return () => { live = false; };
  }, [ready, user, choose, next, router]);

  return (
    <div className="s3 s3g s4 s4e">
      <header className="s3g-top"><Link href="/" className="s3-brand"><StrayPawMark size={28} /><span>StrayPaw</span></Link>{user ? <span className="s3g-who">Signed in as <b>{user.name}</b></span> : <Link href="/sign-in?next=/app" className="s3-btn is-sm is-line">Sign in</Link>}</header>
      <main className="s3g-main">
        {s.phase === "error" ? (
          <div className="s3g-wait" role="alert"><p>Your access could not be checked just now. Nothing was opened. <Link href="/app">Try again</Link></p></div>
        ) : s.phase === "both" ? (
          <>
            <h1 className="s3-h2">Which work are you doing now?</h1>
            <p className="s3-lede">Your account belongs to {s.org} and to a reviewing office. Each workspace shows only what that role may see.</p>
            <div className="s3g-grid">
              <Choice href="/ngo" icon={<Building2 size={18} />} t={`${s.org} operations`} d="Intake, animals, care, release and monthly submissions." primary />
              <Choice href="/city/review" icon={<Landmark size={18} />} t="Government oversight" d="Packages, claims and decisions for your reviewing office." primary />
            </div>
          </>
        ) : s.phase !== "choose" ? (
          <div className="s3g-wait" role="status"><Loader2 size={22} className="animate-spin" /><p>{s.phase === "routing" ? <>Opening {s.org}&apos;s workspace</> : "Checking your access"}</p></div>
        ) : (
          <>
            <h1 className="s3-h2">{s.signedIn ? `Welcome, ${user?.name ?? ""}.` : "Open StrayPaw"}</h1>
            <p className="s3-lede">{s.signedIn ? "Your account is not part of an organisation yet. Join yours with the code your admin gave you, or use the public tools." : "Sign in to your organisation's workspace, or use the public tools. No account is needed to report an animal."}</p>
            <div className="s3g-grid">
              {!s.signedIn && <Choice href="/sign-in?next=/app" icon={<LogIn size={18} />} t="Sign in to your workspace" d="NGO and municipal teams, with your email and access code." primary />}
              <Choice href="/join" icon={<KeyRound size={18} />} t="Join with an invitation code" d="First time? Your organisation's admin sent you a code." primary={s.signedIn} />
              <Choice href="/partner-apply" icon={<Building2 size={18} />} t="Request organisation access" d="For ABC operators, NGOs and reviewing offices, after verification." />
            </div>
            <h2 className="s3g-h">Public tools</h2>
            <div className="s3g-grid is-3">
              <Choice href="/community/report" icon={<Radio size={18} />} t="Report an animal" d="Photo, place and what you saw." tone="flame" />
              <Choice href="/community" icon={<MapIcon size={18} />} t="Community map" d="Recorded animals and care near you." />
              <Choice href="/city" icon={<Landmark size={18} />} t="Municipal evidence" d="Programmes, coverage and city reports." />
              <Choice href="/learn" icon={<GraduationCap size={18} />} t="Academy" d="Courses, workshops and resources." />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Choice({ href, icon, t, d, primary, tone }: { href: string; icon: React.ReactNode; t: string; d: string; primary?: boolean; tone?: "flame" }) {
  return (
    <Link href={href} className={`s3g-choice${primary ? " is-primary" : ""}${tone ? ` is-${tone}` : ""}`}>
      <span className="s3g-ico" aria-hidden>{icon}</span>
      <span><b>{t}</b><small>{d}</small></span>
      <ArrowRight size={16} aria-hidden />
    </Link>
  );
}
