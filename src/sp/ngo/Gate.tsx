"use client";

/* Every NGO page reads its records under the member's own session. Signed
   out, or not yet a member, every page shows the same single-panel door so
   phones and tablets never see two mismatched bands or text clipped by the
   fixed thumb bar; the database refuses the rows either way. */

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMembership } from "../shell/Shell";

export function NgoGate({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const { user, ready } = useAuth();
  const mem = useMembership();
  if (!ready || (user && !mem.ready)) return <div className="ngo-page"><div className="ngo-head"><div className="skel" style={{ height: 52, width: 260 }} /></div></div>;
  if (user && mem.member) return <>{children}</>;
  const signedIn = !!user;
  return (
    <div className="ngo-door">
      <header className="ngo-door-head">
        <p className="k">NGO workspace · {title}</p>
        <h1>{title === "Inbox" ? "Reports waiting for a person on your team." : `${title}, for your organisation.`}</h1>
        <p className="ngo-door-sum">{lede} It loads only for members of an organisation, and the database checks every read. {signedIn
          ? "Your account is not part of an organisation yet. Join with the invitation code your organisation's admin gave you, or apply to partner."
          : "Sign in with the code your organisation gave you to open its private workspace."}</p>
        <div className="ngo-door-act">
          <Link className="btn is-flame" href="/join">{signedIn ? "Join with a code" : "Sign in with your code"}</Link>
          <Link className="btn" href="/partner-apply">Apply to partner</Link>
        </div>
      </header>
    </div>
  );
}
