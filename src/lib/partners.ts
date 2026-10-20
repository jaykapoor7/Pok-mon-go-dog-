import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import fieldPartners from "@/data/field-partners.json";

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
   has imported. Operational status remains separate from public field-partner
   attribution, which the product owner expanded to all listed NGOs. Data
   platforms and public institutions remain separately credited sources. */
export type OrgListing = {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  mission: string | null; website: string | null; logoUrl: string | null;
};

/** Public NGO attribution approved by the product owner, including directory NGOs.
 * This public snapshot keeps the full list readable during a service outage.
 * It does not grant workspace access or change operational partner permissions. */
export async function getFieldPartners(): Promise<OrgListing[]> {
  const published = new Map<string, OrgListing>(fieldPartners.organisations.map(o => [o.id, o]));
  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) return [...published.values()];
  const { data, error } = await supa.from("ngos")
    .select("id,name,slug,city,state,mission,website,logo_url,partner_status")
    .eq("demo_mode", false)
    .in("partner_status", ["directory", "operational_partner", "pilot_partner"])
    .order("name", { ascending: true }).limit(200);
  if (!error) for (const row of data ?? []) {
    if (/HSI|Humane Society International|Humane World for Animals/i.test(row.name)) continue;
    published.set(row.id, {id:row.id,name:row.name,slug:row.slug,city:row.city,state:row.state,mission:row.mission,website:row.website,logoUrl:row.logo_url});
  }
  return [...published.values()].sort((a,b) => a.name.localeCompare(b.name));
}

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
     Field partner      an NGO approved for public attribution by the owner;
                        operational permissions retain their existing status
     Listed NGO         other directory entries without field-partner attribution
     Data source        an organisation or platform whose published data was
                        imported under its licence; no relationship implied */
export type OrgKind = "Field partner" | "Listed NGO" | "Data source";

export function orgKind(_name: string, status: string | null | undefined): OrgKind {
  if (!/HSI|Humane Society International|Humane World for Animals/i.test(_name) && (status === "directory" || status === "operational_partner" || status === "pilot_partner" || fieldPartners.organisations.some(o => o.name === _name))) return "Field partner";
  return status === "data_source" || status === "record_contributor" ? "Data source" : "Listed NGO";
}

export type DirectoryOrg = OrgListing & { kind: OrgKind };

export async function getPartnerDirectory(): Promise<DirectoryOrg[]> {
  const [partners, listed] = await Promise.all([getFieldPartners(), getListedOrganisations()]);
  const seen = new Set<string>();
  const out: DirectoryOrg[] = [];
  for (const p of partners) {
    if (seen.has(p.id)) continue; seen.add(p.id);
    out.push({ ...p, kind: "Field partner" });
  }
  // Public attribution does not change workspace membership or access controls.
  for (const o of listed.members) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: orgKind(o.name, "directory") });
  }
  for (const o of listed.sources) {
    if (seen.has(o.id)) continue; seen.add(o.id);
    out.push({ ...o, kind: "Data source" });
  }
  return out;
}
