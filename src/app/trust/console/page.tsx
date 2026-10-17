import Link from "next/link";
import { AdminClient } from "@/components/admin/AdminClient";
import { ModerationEnrichment } from "@/components/admin/ModerationEnrichment";
import "@/sp/trust/trust.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trust console, StrayPaw", robots: { index: false, follow: false } };

/* The operational admin console (helpers, cases, animals, feeding spots,
   fundraisers, partners, emails, imports), carried over from 1.0 unchanged
   so no administrative capability is lost while it awaits its redesign. */
export default function TrustConsolePage() {
  return (
    <div className="tr">
      <p className="tr-console-note">Carried over from StrayPaw 1.0 and not yet redesigned. It uses the same moderation password and server checks. <Link className="link" href="/trust">Back to the review queue</Link></p>
      <div className="tr-console admin-inapp"><AdminClient /><ModerationEnrichment /></div>
    </div>
  );
}
