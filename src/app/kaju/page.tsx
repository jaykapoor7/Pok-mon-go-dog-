import { redirect } from "next/navigation";

/* Meet Kaju. In the cinematic site this is Kaju's own page; in the earlier
   site, Kaju lives at /ai, so this address goes there. The page itself is
   bundled only in the cinematic build (next.config.mjs). */
const KajuPage: typeof import("@/cine/KajuPage").KajuPage | null = process.env.MARKETING_EXPERIENCE === "cinematic" ? require("@/cine/KajuPage").KajuPage : null;

export const metadata = {
  title: "Meet Kaju, StrayPaw",
  description: "Kaju is StrayPaw's built-in intelligence: it understands programme records, investigates evidence, prepares reports and tasks for a person to confirm, and coordinates the work between partners.",
};

export default function Kaju() {
  if (!KajuPage) redirect("/ai");
  return <KajuPage />;
}
