"use client";

/* Every NGO page reads its records under the member's own session. Signed
   out, or not yet a member, the page explains itself instead of showing an
   empty shell; the database refuses the rows either way. */

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMembership } from "../shell/Shell";
import { ArtSlot } from "../ui";

export function NgoGate({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  const { user, ready } = useAuth();
  const mem = useMembership();
  if (!ready || (user && !mem.ready)) return <div className="ngo-page"><div className="ngo-head"><div className="skel" style={{ height: 52, width: 260 }} /></div></div>;
  if (user && mem.member) return <>{children}</>;
  return (
    <div className="ngo-page">
      <header className="ngo-head"><div><p className="k">NGO workspace</p><h1 className="serif">{title}</h1></div><p className="ngo-sum">{lede} It loads only for members of an organisation, and the database checks every read.</p></header>
      <div className="ngo-out">
        <div className="stack">
          <p className="body">{user ? "Your account is not a member of an organisation yet. Ask your organisation's admin for an invitation code, or apply to partner." : "Sign in with the code your organisation gave you."}</p>
          <div className="row">{!user && <Link className="btn is-flame" href="/join">Sign in with your code</Link>}<Link className="btn" href="/partner-apply">Apply to partner</Link></div>
        </div>
        <ArtSlot id="ngo-empty" />
      </div>
    </div>
  );
}
