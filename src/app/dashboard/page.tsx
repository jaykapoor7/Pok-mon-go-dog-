import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getAllDogs, getNGOs, getRecentSightings } from "@/lib/data";
import { getCases } from "@/lib/cases";
import { getSupabaseAdmin } from "@/lib/supabase";

export const metadata = {
  title: "NGO Command Center — StrayPaw",
  description:
    "Operate and Impact views for NGO partners: case pipeline, sterilisation & vaccination coverage vs the 70% herd-immunity threshold, colonies, before/after outcomes and a co-branded funder report.",
};

export const dynamic = "force-dynamic";

/**
 * Safe, non-PII counts of "Can you help?" sign-ups. Read with the service role
 * SERVER-SIDE only (never the browser), and we surface just the counts — the
 * actual contacts stay in the password-gated moderation panel.
 */
async function getHelperCounts(): Promise<{ volunteers: number; ngos: number }> {
  const supa = getSupabaseAdmin();
  if (!supa) return { volunteers: 0, ngos: 0 };
  try {
    const [v, n] = await Promise.all([
      supa.from("helpers").select("id", { count: "exact", head: true }).eq("is_ngo", false),
      supa.from("helpers").select("id", { count: "exact", head: true }).eq("is_ngo", true),
    ]);
    return { volunteers: v.count ?? 0, ngos: n.count ?? 0 };
  } catch {
    return { volunteers: 0, ngos: 0 };
  }
}

export default async function DashboardPage() {
  // Real data (empty until there are live sightings/cases). The client overlays
  // the shared demo seed when Demo mode is on — same source the map uses.
  const [dogs, ngos, sightings, cases, helperCounts] = await Promise.all([
    getAllDogs(),
    getNGOs(),
    getRecentSightings(80),
    getCases(),
    getHelperCounts(),
  ]);

  return (
    <DashboardClient
      dogs={dogs}
      cases={cases}
      ngos={ngos}
      sightings={sightings}
      helperCounts={helperCounts}
    />
  );
}
