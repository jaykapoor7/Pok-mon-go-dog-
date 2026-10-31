"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, GraduationCap, KeyRound, Landmark, Loader2, LogIn, Map as MapIcon, Radio } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { getMyNgo, isNgoMember } from "@/lib/actions";
import "@/sp3/sp3.css";
import "./entry.css";

/* ════════════════════════════════════════════════════════════════════
   Open App. The product gateway.

   Signed-in organisation members go straight to their workspace (or the
   page they were sent from). Everyone else sees the paths they can
   actually use: sign in, join with a code, apply, or the public tools.
   Membership is asked of the database (is_ngo_member / my_ngo); nothing
   here grants access, and every workspace checks again on every read.
   `?choose=1` shows the choices without redirecting.
   ════════════════════════════════════════════════════════════════════ */

type State = { phase: "checking" } | { phase: "routing"; to: string; org: string } | { phase: "choose"; signedIn: boolean };

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
    Promise.all([isNgoMember().catch(() => false), getMyNgo().catch(() => null)]).then(([member, org]) => {
      if (!live) return;
      if (member && !choose) {
        const to = next && next.startsWith("/") && !next.startsWith("//") ? next : "/ngo";
        setS({ phase: "routing", to, org: org?.name ?? "your organisation" });
        router.replace(to);
      } else setS({ phase: "choose", signedIn: true });
    });
    return () => { live = false; };
  }, [ready, user, choose, next, router]);

  return (
    <div className="s3 s3g">
      <header className="s3g-top"><Link href="/" className="s3-brand"><StrayPawMark size={28} /><span>StrayPaw</span></Link>{user ? <span className="s3g-who">Signed in as <b>{user.name}</b></span> : <Link href="/sign-in?next=/app" className="s3-btn is-sm is-line">Sign in</Link>}</header>
      <main className="s3g-main">
        {s.phase !== "choose" ? (
          <div className="s3g-wait" role="status"><Loader2 size={22} className="animate-spin" /><p>{s.phase === "routing" ? <>Opening {s.org}&apos;s workspace</> : "Checking your access"}</p></div>
        ) : (
          <>
            <h1 className="s3-h2">{s.signedIn ? `Welcome, ${user?.name ?? ""}.` : "Open StrayPaw"}</h1>
            <p className="s3-lede">{s.signedIn ? "Your account is not part of an organisation yet. Join yours with the code your admin gave you, or use the public tools." : "Sign in to your organisation's workspace, or use the public tools. No account is needed to report an animal."}</p>
            <div className="s3g-grid">
              {!s.signedIn && <Choice href="/sign-in?next=/app" icon={<LogIn size={18} />} t="Sign in to your workspace" d="NGO and municipal teams, with your email and access code." primary />}
              <Choice href="/join" icon={<KeyRound size={18} />} t="Join with an invitation code" d="First time? Your organisation's admin sent you a code." primary={s.signedIn} />
              <Choice href="/partner-apply" icon={<Building2 size={18} />} t="Request organisation access" d="Verified NGOs get the operational workspace free. Municipal teams start with a pilot." />
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
