/* ════════════════════════════════════════════════════════════════════
   StrayPaw 2.0 workspaces (decisions 013, 014, 015).

   One product, one identity, four workspaces with three destinations
   each. Secondary tools are contextual (the index), never a fourth tab.
   Feeder, volunteer, vet, funder and reviewer contexts enter through
   scoped roles and workflows, not separate shells.

   A workspace in the switcher is a place to go, never a grant: what a
   person may read or change is decided on the server for every record.
   ════════════════════════════════════════════════════════════════════ */

export type WorkspaceId = "community" | "ngo" | "city" | "learn";

export type Dest = { href: string; label: string; short?: string; match?: string[] };
export type IndexGroup = { label: string; links: { href: string; label: string; note?: string }[] };

export type Workspace = {
  id: WorkspaceId;
  label: string;
  /** What the workspace is for, in the switcher. */
  purpose: string;
  /** The ink that marks the workspace in the switcher (identity, not data). */
  ink: string;
  home: string;
  dests: [Dest, Dest, Dest];
  action: { href: string; label: string; short: string } | null;
  index: IndexGroup[];
  /** Needs an organisation membership to show its records (still visitable). */
  members?: boolean;
};

export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  community: {
    id: "community", label: "Community", purpose: "The map of India's street animals, your reports and what happened next", ink: "#2457ce",
    home: "/community",
    dests: [
      { href: "/community", label: "Map", match: ["/animal"] },
      { href: "/community/report", label: "Report" },
      { href: "/community/activity", label: "My Activity", short: "Activity" },
    ],
    action: { href: "/community/report", label: "Report an animal", short: "Report" },
    index: [
      { label: "Read", links: [
        { href: "/community/stories", label: "Stories", note: "Documented animals, start to finish" },
        { href: "/community/organisations", label: "Organisations", note: "Who keeps the record" },
      ] },
      { label: "Help", links: [
        { href: "/community/help", label: "If an animal needs help", note: "What to do now, who to call" },
        { href: "/community/feeding", label: "Feeding spots", note: "For feeders and volunteers" },
      ] },
    ],
  },
  ngo: {
    id: "ngo", label: "NGO", purpose: "Your organisation's work queue, animal register and map", ink: "#1f6f80",
    home: "/ngo", members: true,
    dests: [
      { href: "/ngo", label: "Work", match: ["/ngo/cases", "/ngo/inbox", "/ngo/review", "/ngo/field"] },
      { href: "/ngo/animals", label: "Animals", match: ["/ngo/import"] },
      { href: "/ngo/map", label: "Map", match: ["/ngo/programmes"] },
    ],
    action: { href: "/ngo/cases/new", label: "New case", short: "New" },
    index: [
      { label: "Work", links: [
        { href: "/ngo/inbox", label: "Inbox & triage", note: "New reports and offers" },
        { href: "/ngo/review", label: "Historical review", note: "Imported statuses, never today's work" },
        { href: "/ngo/field", label: "Field mode", note: "Phone, one hand" },
      ] },
      { label: "Registers & reporting", links: [
        { href: "/ngo/import", label: "Import a workbook", note: "Map, review, release" },
        { href: "/ngo/programmes", label: "Programmes", note: "ABC / ARV drives, surveys" },
        { href: "/ngo/proof", label: "Reports & proof", note: "Evidence on demand" },
      ] },
      { label: "Records", links: [
        { href: "/ngo/care", label: "Care ledger", note: "Every care record, across animals" },
        { href: "/ngo/quality", label: "Data quality", note: "Gaps and checks in the register" },
        { href: "/ngo/evidence", label: "Evidence files", note: "Register pages, ledgers, threads" },
      ] },
      { label: "Outreach", links: [
        { href: "/ngo/stories", label: "Publish case stories" },
        { href: "/ngo/fundraising", label: "Fundraising" },
        { href: "/ngo/volunteers", label: "Volunteer sign-ups" },
        { href: "/ngo/feeding", label: "Feeding spots" },
        { href: "/ngo/projects", label: "Projects" },
        { href: "/ngo/surveys", label: "Surveys & census" },
      ] },
      { label: "Organisation", links: [
        { href: "/ngo/team", label: "Team & access", note: "Members, roles, invitations" },
        { href: "/ngo/settings", label: "Settings" },
      ] },
    ],
  },
  city: {
    id: "city", label: "Municipality", purpose: "Evidence layers, programmes and publishable findings for a city", ink: "#2f3d8f",
    home: "/city",
    dests: [
      { href: "/city", label: "Map" },
      { href: "/city/programmes", label: "Programmes" },
      { href: "/city/insights", label: "Insights", match: ["/city/report"] },
    ],
    action: null,
    index: [
      { label: "Publish", links: [
        { href: "/city/report", label: "City report", note: "Print-ready, with sources" },
      ] },
      { label: "Method", links: [
        { href: "/data-governance", label: "Data governance" },
        { href: "/research-standards", label: "Research standards" },
      ] },
    ],
  },
  learn: {
    id: "learn", label: "Education", purpose: "The StrayPaw Learning Academy: courses, workshops and resources", ink: "#b65a3a",
    home: "/learn",
    dests: [
      { href: "/learn", label: "Learn", match: ["/learn/courses", "/learn/playground"] },
      { href: "/learn/workshops", label: "Workshops" },
      { href: "/learn/resources", label: "Resources" },
    ],
    action: null,
    index: [
      { label: "Explore", links: [
        { href: "/learn/playground", label: "Neighbourhood playground", note: "Illustrative, never a forecast" },
        { href: "/education", label: "Education at StrayPaw", note: "For schools and partners" },
      ] },
    ],
  },
};

export const ORDER: WorkspaceId[] = ["community", "ngo", "city", "learn"];

/** Which workspace a path belongs to; shared routes keep the last one. */
export function workspaceFor(path: string, last: WorkspaceId | null): WorkspaceId {
  if (path.startsWith("/ngo")) return "ngo";
  if (path.startsWith("/city")) return "city";
  if (path.startsWith("/learn")) return "learn";
  if (path.startsWith("/community")) return "community";
  return last ?? "community";
}

/** The one current destination: exact, then the longest declared prefix. */
export function currentDest(ws: Workspace, path: string): string | null {
  let best: { href: string; len: number } | null = null;
  for (const d of ws.dests) {
    const pres = [d.href, ...(d.match ?? [])];
    for (const p of pres) {
      const hit = path === p || (p !== ws.home && path.startsWith(p.endsWith("/") ? p : `${p}/`)) || (p !== d.href && path.startsWith(p));
      if (hit && (!best || p.length > best.len)) best = { href: d.href, len: p.length };
    }
  }
  if (!best && path === ws.home) return ws.home;
  return best?.href ?? null;
}

const KEY = "sp2.workspace";
export function rememberWorkspace(id: WorkspaceId) { try { sessionStorage.setItem(KEY, id); } catch { /* storage blocked */ } }
export function lastWorkspace(): WorkspaceId | null {
  try { const v = sessionStorage.getItem(KEY); return v && v in WORKSPACES ? (v as WorkspaceId) : null; } catch { return null; }
}
