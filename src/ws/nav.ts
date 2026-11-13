/* ════════════════════════════════════════════════════════════════════
   The workspace tree: what a person sees in the sidebar, derived from
   who they are and the place they are working in.

   One shape for every place. A workspace has a home, an inbox, and a
   few pages; a page that holds records (Cases, Animals, Reports) keeps
   its views nested under it, the way a database keeps its views. Every
   page a person may open is in this tree, so there is no second index.

   What a person may see is still decided where it always was: role and
   feature-flag rules on each destination (workspaces.ts) and, for a
   programme place, the capabilities the server returned for it. This
   file only arranges what is already allowed.
   ════════════════════════════════════════════════════════════════════ */

import { destinations, navOn, type Role, type WorkspaceId } from "@/sp/shell/workspaces";
import type { PlaceLink } from "@/oh/places";

export type Node = {
  href: string; label: string; icon: string; tone?: string;
  exact?: boolean; match?: string[];
  count?: number | null; countTone?: string;
  /** Views of this page, or pages kept under it. */
  children?: Node[];
  /** The thing this page starts ("New case"), offered on hover. */
  create?: { href: string; label: string };
};
export type Section = { id: string; label?: string; nodes: Node[] };

type Leaf = [href: string, label: string, opts?: { exact?: boolean; match?: string[]; query?: string }];
type Group = { href?: string; label: string; icon: string; tone: string; views: Leaf[]; create?: Node["create"]; match?: string[] };

/* ── an NGO ───────────────────────────────────────────────────────── */
const NGO_WORK: Group[] = [
  { label: "Cases", icon: "list", tone: "flame", create: { href: "/ngo/cases/new", label: "New case" }, match: ["/ngo/cases"],
    views: [["/ngo/pipeline", "Board"], ["/ngo/work", "Queue"], ["/ngo/inbox", "Intake"], ["/ngo/verification", "Sign-off"], ["/ngo/review", "Decisions"]] },
  { label: "Animals", icon: "paw", tone: "blue",
    views: [["/ngo/animals", "Register", { exact: true, match: ["/ngo/animals"] }], ["/ngo/care", "Care ledger"], ["/ngo/map", "Map"], ["/ngo/animals/identity", "Identity review"], ["/ngo/animals/scan", "Scan a tag"], ["/ngo/quality", "Data quality"]] },
  { label: "Reports", icon: "file", tone: "green",
    views: [["/ngo/packages", "Monthly report"], ["/ngo/proof", "Exports"], ["/ngo/evidence", "Evidence files"], ["/ngo/contracts", "Contracts"]] },
];
const NGO_ORG: Group[] = [
  { label: "Drives", icon: "layers", tone: "teal",
    views: [["/ngo/programmes", "All drives", { exact: true, match: ["/ngo/programmes"] }], ["/ngo/programmes/zones", "Working zones"], ["/ngo/surveys", "Surveys"], ["/ngo/feeding", "Feeding spots"], ["/ngo/projects", "Projects"]] },
  { label: "Outreach", icon: "heart", tone: "violet",
    views: [["/ngo/stories", "Stories"], ["/ngo/fundraising", "Fundraising"], ["/ngo/volunteers", "Volunteers"]] },
  { label: "Team", icon: "users", tone: "slate", views: [["/ngo/team", "Members and codes"], ["/ngo/training", "Training"]] },
  { label: "Settings", icon: "settings", tone: "slate",
    views: [["/ngo/settings", "Organisation", { exact: true }], ["/ngo/settings/policies", "Workflow policies"], ["/ngo/settings/connections", "Connections"], ["/ngo/import", "Import a register"]] },
];

/* ── a reviewing office ───────────────────────────────────────────── */
const CITY_WORK: Group[] = [
  { label: "Review", icon: "check", tone: "violet", views: [["/city/review", "Submissions"]] },
  { label: "Contracts", icon: "file", tone: "green", views: [["/city/contracts", "Contracts and rates"]] },
  { label: "Wards and map", icon: "map", tone: "blue", views: [["/city", "Map", { exact: true }]] },
];
const CITY_PUBLIC: Group[] = [
  { label: "Programmes", icon: "layers", tone: "teal", views: [["/city/programmes", "Published programmes"]] },
  { label: "City report", icon: "file", tone: "slate", views: [["/city/report", "Printable report"]] },
  { label: "Connections", icon: "settings", tone: "slate", views: [["/city/connections", "Connections"]] },
];

function build(groups: Group[], allowed: Set<string>): Node[] {
  const out: Node[] = [];
  for (const g of groups) {
    const kids: Node[] = g.views.filter(([href]) => allowed.has(href)).map(([href, label, o]) => ({ href, label, icon: g.icon, tone: g.tone, exact: o?.exact, match: undefined }));
    if (!kids.length) continue;
    /* The page opens on its first view; a page with one view has nothing to unfold. */
    const first = g.views.find(([href]) => allowed.has(href))!;
    /* Allowed only one view that is not the page's main one: the page is that view, by its own name. */
    const label = kids.length === 1 && kids[0].href !== g.views[0][0] ? kids[0].label : g.label;
    out.push({ href: first[0], label, icon: g.icon, tone: g.tone, match: [...(g.match ?? []), ...kids.map((k) => k.href), ...(first[2]?.match ?? [])], exact: true, children: kids.length > 1 ? kids : undefined, create: g.create });
  }
  return out;
}

const TONE: Record<string, string> = { list: "flame", inbox: "flame", radio: "flame", paw: "blue", map: "violet", file: "green", check: "violet", shield: "violet", phone: "amber", camera: "amber", syringe: "teal", stethoscope: "teal", flask: "violet", gauge: "blue", arrows: "amber", activity: "slate", settings: "slate", users: "slate", layers: "teal", book: "green", grad: "green", heart: "flame", building: "slate", landmark: "slate", compass: "blue", home: "slate", plus: "blue", sparkles: "ink" };
const fromLink = (l: PlaceLink): Node => ({ href: l.href, label: l.label, icon: l.icon, tone: TONE[l.icon] ?? "slate", exact: l.exact, count: l.count, countTone: l.tone });

export type NavInput = {
  ws: WorkspaceId; role: Role | null; reviewer: boolean; member: boolean;
  /** Links of the programme place the path belongs to (hospital, laboratory, programme cell), or of every place on /today. */
  placeLinks?: PlaceLink[];
  /** Programme pages of the person's own NGO or office, appended to its workspace. */
  programmeLinks?: PlaceLink[];
  programmeName?: string | null;
};

/** The sidebar for this person in this place: sections of pages, each page with its views. */
export function workspaceTree(i: NavInput): Section[] {
  const allowed = (ws: WorkspaceId) => new Set(destinations(ws, i.role, i.reviewer).map((d) => d.href));
  const prog = (links?: PlaceLink[]): Section[] => (links?.length ? [{ id: "programme", label: i.programmeName ?? "Programme", nodes: links.map(fromLink) }] : []);

  if (i.ws === "ngo") {
    const ok = allowed("ngo");
    const work = build(NGO_WORK, ok);
    /* The field team's round comes first for the people who walk it. */
    if (ok.has("/ngo/field")) { const round: Node = { href: "/ngo/field", label: "My round", icon: "phone", tone: "amber" }; if (i.role === "member") work.unshift(round); else work.push(round); }
    return [{ id: "work", label: "Work", nodes: work }, ...prog(i.programmeLinks), { id: "org", label: "Organisation", nodes: build(NGO_ORG, ok) }].filter((s) => s.nodes.length);
  }
  if (i.ws === "city") {
    const ok = allowed("city");
    return [{ id: "work", label: "Work", nodes: build(CITY_WORK, ok) }, ...prog(i.programmeLinks), { id: "public", label: "Public record", nodes: build(CITY_PUBLIC, ok) }].filter((s) => s.nodes.length);
  }
  if (i.ws === "health") {
    const links = (i.placeLinks ?? []).filter((l) => l.label !== "Today");
    const order: string[] = []; const by = new Map<string, Node[]>();
    for (const l of links) { const k = l.section ?? "Work"; if (!by.has(k)) { by.set(k, []); order.push(k); } by.get(k)!.push(fromLink(l)); }
    return order.map((k) => ({ id: k.toLowerCase().replace(/\W+/g, "-"), label: k === "Modules" ? "Work" : k, nodes: by.get(k)! }));
  }
  /* Community and Learn: the public products, grouped as their own index groups them. */
  const order: string[] = []; const by = new Map<string, Node[]>();
  for (const d of destinations(i.ws, i.role, i.reviewer)) {
    if (d.listed === false || d.href === "/assistant") continue;
    const k = d.group; if (!by.has(k)) { by.set(k, []); order.push(k); }
    by.get(k)!.push({ href: d.query ? `${d.href}?${d.query}` : d.href, label: d.label, icon: d.icon, tone: TONE[d.icon] ?? "slate", exact: d.exact, match: d.match });
  }
  return order.map((k) => ({ id: k.toLowerCase().replace(/\W+/g, "-"), label: k, nodes: by.get(k)! }));
}

const strip = (h: string) => h.split("?")[0];
const on = (n: Node, path: string) => navOn({ href: strip(n.href), label: n.label, icon: n.icon, exact: n.exact, match: n.match }, path);

/** The page (and its view) that owns this address, if the tree has one. */
export function locate(tree: Section[], path: string): { section: Section; node: Node; view: Node | null } | null {
  let best: { section: Section; node: Node; view: Node | null; len: number } | null = null;
  for (const section of tree) for (const node of section.nodes) {
    const views = node.children ?? [];
    const view = views.filter((v) => on(v, path) || (v.exact && path === strip(v.href))).sort((a, b) => b.href.length - a.href.length)[0] ?? null;
    if (view) { if (!best || view.href.length > best.len) best = { section, node, view, len: view.href.length }; continue; }
    if (on(node, path) || path === strip(node.href)) { const len = strip(node.href).length; if (!best || len > best.len) best = { section, node, view: null, len }; }
  }
  return best ? { section: best.section, node: best.node, view: best.view } : null;
}

/** Every page and view, flat, for the command search. */
export function flatten(tree: Section[]): { href: string; label: string; detail: string }[] {
  const out: { href: string; label: string; detail: string }[] = [];
  for (const s of tree) for (const n of s.nodes) {
    out.push({ href: n.href, label: n.label, detail: s.label ?? "" });
    for (const c of n.children ?? []) if (c.href !== n.href) out.push({ href: c.href, label: `${n.label}: ${c.label}`, detail: s.label ?? "" });
  }
  return out;
}
