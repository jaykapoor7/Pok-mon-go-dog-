import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

export type Partner = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  mission: string | null;
  areas: string[];
  logoUrl: string | null;
  partnerStatus: string;
  /** When the partnership began, if recorded. */
  partneredAt?: string | null;
};

/* A confirmed founding partner is shown while a deployment is waiting for its
   migration. This is a public relationship, not seed animal or case data. */
const FOUNDING_PARTNERS: Partner[] = [{
  id: "pawesome-project",
  name: "The Pawsome People Project",
  slug: "the-pawsome-people-project",
  city: "Coimbatore",
  state: "Tamil Nadu",
  mission: "Community animal rescue, treatment follow-up, sterilisation and vaccination work in Coimbatore.",
  areas: ["Rescue", "Treatment", "ABC", "Follow-up"],
  logoUrl: null,
  partnerStatus: "operational_partner",
  partneredAt: null,
}];

export async function getOperationalPartners(): Promise<Partner[]> {
  const supa = getSupabase();
  if (!supa) return FOUNDING_PARTNERS;
  const { data, error } = await supa
    .from("ngos")
    .select("id,name,slug,city,state,mission,areas_of_work,logo_url,partner_status,partnered_at")
    .in("partner_status", ["operational_partner", "pilot_partner"])
    .order("partnered_at", { ascending: true });
  if (error || !data?.length) return FOUNDING_PARTNERS;
  return data.map((row: any) => ({
    id: row.id, name: row.name, slug: row.slug, city: row.city ?? null,
    state: row.state ?? null, mission: row.mission ?? null,
    areas: row.areas_of_work ?? [], logoUrl: row.logo_url ?? null,
    partnerStatus: row.partner_status,
    partneredAt: row.partnered_at ?? null,
  }));
}

/* ── Everyone else on the platform ─────────────────────────────────────
   Organisations set up on StrayPaw (the ones moderation gave an invite code
   or an email invite), and the organisations whose published data StrayPaw
   has imported. Names, places and their own one-line descriptions only. */
export type OrgListing = {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  mission: string | null; website: string | null; logoUrl: string | null;
};

export async function getListedOrganisations(): Promise<{ members: OrgListing[]; sources: OrgListing[] }> {
  const supa = getSupabase();
  if (!supa) return { members: [], sources: [] };
  const { data, error } = await supa
    .from("ngos")
    .select("id,name,slug,city,state,mission,website,logo_url,partner_status,created_at")
    .eq("demo_mode", false)
    .order("name", { ascending: true });
  if (error || !data) return { members: [], sources: [] };
  const rows = data as any[];
  const toListing = (r: any): OrgListing => ({
    id: r.id, name: r.name, slug: r.slug, city: r.city ?? null, state: r.state ?? null,
    mission: r.mission ?? null, website: r.website ?? null, logoUrl: r.logo_url ?? null,
  });

  /* Where the server can read the invite tables, only organisations that
     hold an invite code or an email invite are listed as on StrayPaw. */
  let invited: Set<string> | null = null;
  const admin = getSupabaseAdmin();
  if (admin) {
    const [codes, emails] = await Promise.all([
      admin.from("org_invite_codes").select("ngo_id"),
      admin.from("org_email_invites").select("ngo_id"),
    ]);
    if (!codes.error && !emails.error) invited = new Set([...(codes.data ?? []), ...(emails.data ?? [])].map((x: any) => x.ngo_id));
  }
  const partner = (s: string) => s === "operational_partner" || s === "pilot_partner";
  return {
    members: rows.filter((r) => r.partner_status !== "data_source" && !partner(r.partner_status) && (!invited || invited.has(r.id))).map(toListing),
    sources: rows.filter((r) => r.partner_status === "data_source").map(toListing),
  };
}
