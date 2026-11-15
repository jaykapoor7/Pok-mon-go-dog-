import { Activity, BarChart3, Building2, ClipboardList, FileCheck2, FlaskConical, FolderKanban, Handshake, History, Home, Inbox, LayoutGrid, ListChecks, Microscope, PawPrint, Radar, Route, ShieldCheck, Sparkles, Syringe, Zap } from "lucide-react";

/* Every page of the rebuilt app, by workspace. The sidebar, the phone bar and the command bar all read this. */
export type NavItem = { href: string; label: string; icon: typeof Home; n?: number; office?: boolean };
export const NGO: NavItem[] = [
  { href: "/next/ngo/today", label: "Today", icon: Home },
  { href: "/next/ngo/inbox", label: "Inbox", icon: Inbox, n: 4 },
  { href: "/next/ngo/cases", label: "Cases", icon: ClipboardList },
  { href: "/next/ngo/animals", label: "Animals", icon: PawPrint },
  { href: "/next/ngo/operations", label: "Operations", icon: Route },
  { href: "/next/ngo/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/next/ngo/submissions", label: "Submissions & Reports", icon: FileCheck2 },
];
export const GOV: NavItem[] = [
  { href: "/next/gov/overview", label: "Overview", icon: BarChart3 },
  { href: "/next/gov/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/next/gov/partners", label: "Partners", icon: Handshake },
  { href: "/next/gov/verification", label: "Verification", icon: ShieldCheck, n: 22, office: true },
  { href: "/next/gov/surveillance", label: "Surveillance", icon: Radar },
  { href: "/next/gov/reports", label: "Reports", icon: FileCheck2 },
];
export const HEALTH: NavItem[] = [
  { href: "/next/health/today", label: "Today", icon: Home },
  { href: "/next/health/bites", label: "Bite cases", icon: ClipboardList },
  { href: "/next/health/pep", label: "PEP", icon: Syringe },
  { href: "/next/health/referrals", label: "Referrals", icon: Route },
  { href: "/next/health/facilities", label: "Facilities", icon: Building2 },
  { href: "/next/health/surveillance", label: "Surveillance", icon: Activity },
];
export const LAB: NavItem[] = [
  { href: "/next/health/today", label: "Work queue", icon: Home },
  { href: "/next/health/samples", label: "Samples", icon: FlaskConical },
  { href: "/next/health/testing", label: "Testing", icon: Microscope },
  { href: "/next/health/results", label: "Results", icon: FileCheck2 },
  { href: "/next/health/quality", label: "Quality", icon: ShieldCheck },
];
export const RESEARCH: NavItem[] = [
  { href: "/next/research/datasets", label: "Datasets", icon: LayoutGrid },
  { href: "/next/research/explore", label: "Explore", icon: BarChart3 },
  { href: "/next/research/maps", label: "Maps & Analysis", icon: Radar },
  { href: "/next/research/studies", label: "Studies", icon: FolderKanban },
  { href: "/next/research/reports", label: "Reports", icon: FileCheck2 },
];
export const KAJU: NavItem[] = [
  { href: "/next/kaju", label: "Ask Kaju", icon: Sparkles },
  { href: "/next/kaju/missions", label: "Missions", icon: ListChecks, n: 2 },
  { href: "/next/kaju/automations", label: "Automations", icon: Zap },
  { href: "/next/kaju/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/next/kaju/insights", label: "Insights", icon: BarChart3 },
  { href: "/next/kaju/history", label: "History", icon: History },
];
export const BUILT = new Set(["/next/ngo/today", "/next/ngo/operations", "/next/ngo/programmes", "/next/ngo/inbox", "/next/ngo/submissions", "/next/ngo/cases", "/next/ngo/animals", "/next/gov/overview", "/next/gov/programmes", "/next/gov/partners", "/next/gov/verification", "/next/gov/surveillance", "/next/gov/reports", "/next/health/today", "/next/health/referrals", "/next/health/facilities", "/next/health/surveillance", "/next/health/testing", "/next/health/results", "/next/health/quality", "/next/health/bites", "/next/health/pep", "/next/health/samples", "/next/research/datasets", "/next/research/explore", "/next/research/maps", "/next/kaju", "/next/kaju/missions", "/next/kaju/approvals", "/next/kaju/history", "/next/kaju/insights"]);
/** Where an organisation's workspace opens. Healthcare and research open in the current app until they are rebuilt. */
export const homeOf = (w: string, id: string) => (w === "ngo" ? "/next/ngo/today" : w === "government" ? "/next/gov/overview" : w === "healthcare" ? "/next/health/today" : w === "research" ? "/next/research/datasets" : `/workspace/${id}`);
export const WS_LABEL: Record<string, string> = { ngo: "NGO workspace", government: "Government & Programmes", healthcare: "Healthcare", research: "Research" };

/** Built pages with the workspace they belong to, for search. */
export const PAGES: { href: string; label: string; ws: string; icon: NavItem["icon"]; office?: boolean; lab?: boolean }[] = [
  ...NGO.map((i) => ({ ...i, ws: "NGO" })), ...GOV.map((i) => ({ ...i, ws: "Government & Programmes" })),
  ...HEALTH.map((i) => ({ ...i, ws: "Healthcare" })), ...LAB.filter((i) => i.href !== "/next/health/today").map((i) => ({ ...i, ws: "Laboratory", lab: true })),
  ...RESEARCH.map((i) => ({ ...i, ws: "Research" })), ...KAJU.map((i) => ({ ...i, ws: "Kaju" })),
].filter((i) => BUILT.has(i.href));
