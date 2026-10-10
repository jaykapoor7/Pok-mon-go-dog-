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
  const supa = getSupabaseAdmin() ?? getSupabase();
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

/* ── Everyone else on the record ───────────────────────────────────────
   Organisations listed on StrayPaw (the ones moderation gave an invite code
   or an email invite), and the organisations whose published data StrayPaw
   has imported. Neither is a partnership: only `ngos.partner_status` of
   operational_partner or pilot_partner is. Names, places and their own
   one-line descriptions only. */
export type OrgListing = {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  mission: string | null; website: string | null; logoUrl: string | null;
};

export async function getListedOrganisations(): Promise<{ members: OrgListing[]; sources: OrgListing[] }> {
  const supa = getSupabaseAdmin() ?? getSupabase();
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
  const source = (s: string) => s === "data_source" || s === "record_contributor";
  return {
    members: rows.filter((r) => !source(r.partner_status) && !partner(r.partner_status) && (!invited || invited.has(r.id))).map(toListing),
    sources: rows.filter((r) => source(r.partner_status)).map(toListing),
  };
}

/* ── The directory: every organisation on the record, in one list ──────
   The kind says what StrayPaw's relationship to each one actually is, so a
   municipal corporation or an open data platform whose published records
   StrayPaw draws on never reads as a partner:
     Field partner      a verified working relationship (partner_status
                        operational_partner or pilot_partner)
     Listed NGO         an organisation listed in the directory or invited
                        to use StrayPaw; listing is not a partnership
     Data source        an organisation or platform whose published data was
                        imported under its licence; no relationship implied */
export type OrgKind = "Field partner" | "Listed NGO" | "Data source";

export function orgKind(_name: string, status: string | null | undefined): OrgKind {
  if (status === "operational_partner" || status === "pilot_partner") return "Field partner";
  return status === "data_source" || status === "record_contributor" ? "Data source" : "Listed NGO";
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
  // Organisations given dashboard access (an invite code or email invite) are listed, not partners.
  for (const o of listed.members) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: "Listed NGO" });
  }
  for (const o of listed.sources) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: "Data source" });
  }
  return out;
}
