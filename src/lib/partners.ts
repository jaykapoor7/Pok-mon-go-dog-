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

/* ── The directory: every organisation on the record, in one list ──────
   A quiet tag says what each one is, so a municipal corporation or an open
   data platform whose records StrayPaw draws on never reads as a partner
   NGO. There is no type column; partner status decides partners, and a
   name decides the rest. */
export type OrgKind = "Field partner" | "Partner NGO" | "NGO" | "Public body" | "Research" | "Open data";

export function orgKind(name: string, status: string | null | undefined): OrgKind {
  if (status === "operational_partner" || status === "pilot_partner") return "Field partner";
  if (/municipal|corporation|mahanagara palike|nagar nigam|department of|ministry|government/i.test(name)) return "Public body";
  if (/\biiser\b|institute|university|college|research/i.test(name)) return "Research";
  if (/inaturalist|wikimedia|openstreetmap|\bgbif\b/i.test(name)) return "Open data";
  return "NGO";
}

export type DirectoryOrg = OrgListing & { kind: OrgKind };

export async function getPartnerDirectory(): Promise<DirectoryOrg[]> {
  const [partners, listed] = await Promise.all([getOperationalPartners(), getListedOrganisations()]);
  const seen = new Set<string>();
  const out: DirectoryOrg[] = [];
  for (const p of partners) {
    if (seen.has(p.id)) continue; seen.add(p.id);
    out.push({ id: p.id, name: p.name, slug: p.slug, city: p.city, state: p.state, mission: p.mission, website: null, logoUrl: p.logoUrl, kind: "Field partner" });
  }
  // Organisations given dashboard access (an invite code or email invite) are partner NGOs.
  for (const o of listed.members) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: "Partner NGO" });
  }
  for (const o of listed.sources) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: orgKind(o.name, null) });
  }
  return out;
}
