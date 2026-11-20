import { GraduationCap, Settings2, Upload, Users, SlidersHorizontal, Activity, BarChart3, Building2, CalendarDays, ClipboardCheck, ClipboardList, FileCheck2, FlaskConical, FolderKanban, Handshake, History, Home, Inbox, LayoutGrid, ListChecks, Microscope, PawPrint, Radar, Route, Scissors, ShieldCheck, Sparkles, Stethoscope, Syringe, Zap } from "lucide-react";

/* Every page of the rebuilt app, by workspace. The sidebar, the phone bar and the command bar all read this. */
export type NavItem = { href: string; label: string; icon: typeof Home; n?: number; office?: boolean };
export const NGO: NavItem[] = [
  { href: "/ngo/today", label: "Today", icon: Home },
  { href: "/ngo/inbox", label: "Inbox", icon: Inbox, n: 4 },
  { href: "/ngo/cases", label: "Cases", icon: ClipboardList },
  { href: "/ngo/animals", label: "Animals", icon: PawPrint },
  { href: "/ngo/operations", label: "Operations", icon: Route },
  { href: "/ngo/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/ngo/submissions", label: "Submissions & Reports", icon: FileCheck2 },
];
/** The NGO's own setup, below its seven working pages. */
export const NGO_MORE: NavItem[] = [
  { href: "/ngo/team", label: "Team", icon: Users },
  { href: "/ngo/training", label: "Training", icon: GraduationCap },
  { href: "/ngo/import", label: "Import", icon: Upload },
  { href: "/ngo/settings", label: "Settings", icon: Settings2 },
];
export const GOV: NavItem[] = [
  { href: "/gov/overview", label: "Overview", icon: BarChart3 },
  { href: "/gov/programmes", label: "Programmes", icon: FolderKanban },
  { href: "/gov/partners", label: "Partners", icon: Handshake },
  { href: "/gov/verification", label: "Verification", icon: ShieldCheck, n: 22, office: true },
  { href: "/gov/surveillance", label: "Surveillance", icon: Radar },
  { href: "/gov/reports", label: "Reports", icon: FileCheck2 },
];
export const HEALTH: NavItem[] = [
  { href: "/health/today", label: "Today", icon: Home },
  { href: "/health/bites", label: "Bite cases", icon: ClipboardList },
  { href: "/health/pep", label: "PEP", icon: Syringe },
  { href: "/health/referrals", label: "Referrals", icon: Route },
  { href: "/health/facilities", label: "Facilities", icon: Building2 },
  { href: "/health/surveillance", label: "Surveillance", icon: Activity },
];
/* A veterinarian of an NGO: that NGO's animals from the clinical side. */
export const VET: NavItem[] = [
  { href: "/health/today", label: "Today", icon: Home },
  { href: "/health/patients", label: "Patients", icon: PawPrint },
  { href: "/health/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/health/care", label: "Clinical care", icon: Stethoscope },
  { href: "/health/procedures", label: "Procedures", icon: Scissors },
  { href: "/health/followups", label: "Follow-ups", icon: ClipboardCheck },
];
/* An independent veterinary clinic: its own patients and visits. */
export const CLINIC_VET: NavItem[] = [
  { href: "/health/today", label: "Today", icon: Home },
  { href: "/health/patients", label: "Patients", icon: PawPrint },
  { href: "/health/appointments", label: "Appointments", icon: CalendarDays },
];
export const VET_PATHS = ["/health/patients", "/health/appointments", "/health/care", "/health/procedures", "/health/followups"];
export const LAB: NavItem[] = [
  { href: "/health/today", label: "Work queue", icon: Home },
  { href: "/health/samples", label: "Samples", icon: FlaskConical },
  { href: "/health/testing", label: "Testing", icon: Microscope },
  { href: "/health/results", label: "Results", icon: FileCheck2 },
  { href: "/health/quality", label: "Quality", icon: ShieldCheck },
];
export const RESEARCH: NavItem[] = [
  { href: "/research/datasets", label: "Datasets", icon: LayoutGrid },
  { href: "/research/explore", label: "Explore", icon: BarChart3 },
  { href: "/research/maps", label: "Maps & Analysis", icon: Radar },
  { href: "/research/studies", label: "Studies", icon: FolderKanban },
  { href: "/research/reports", label: "Reports", icon: FileCheck2 },
];
export const KAJU: NavItem[] = [
  { href: "/kaju", label: "Ask Kaju", icon: Sparkles },
  { href: "/kaju/missions", label: "Missions", icon: ListChecks, n: 2 },
  { href: "/kaju/automations", label: "Automations", icon: Zap },
  { href: "/kaju/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/kaju/insights", label: "Insights", icon: BarChart3 },
  { href: "/kaju/history", label: "History", icon: History },
  { href: "/kaju/rules", label: "Rules & memory", icon: SlidersHorizontal },
];
export const BUILT = new Set(["/ngo/today", "/ngo/operations", "/ngo/programmes", "/ngo/inbox", "/ngo/submissions", "/ngo/cases", "/ngo/animals", "/gov/overview", "/gov/programmes", "/gov/partners", "/gov/verification", "/gov/surveillance", "/gov/reports", "/gov/data-requests", "/health/today", "/health/patients", "/health/appointments", "/health/care", "/health/procedures", "/health/followups", "/health/referrals", "/health/facilities", "/health/surveillance", "/health/testing", "/health/results", "/health/quality", "/health/bites", "/health/pep", "/health/samples", "/research/datasets", "/research/explore", "/research/maps", "/research/studies", "/research/reports", "/kaju", "/kaju/missions", "/kaju/automations", "/kaju/approvals", "/kaju/history", "/kaju/insights", "/kaju/rules", "/ngo/team", "/ngo/training", "/ngo/import", "/ngo/settings"]);
/** Where an organisation's workspace opens. Healthcare and research open in the current app until they are rebuilt. */
export const homeOf = (w: string, id: string) => (w === "ngo" ? "/ngo/today" : w === "government" ? "/gov/overview" : w === "healthcare" ? "/health/today" : w === "research" ? "/research/datasets" : "/home");
export const WS_LABEL: Record<string, string> = { ngo: "NGO workspace", government: "Government & Programmes", healthcare: "Healthcare", research: "Research" };

/* Words people search with that are not in a page's name ("coverage" finds the programmes, "alerts" surveillance). */
const KEYWORDS: Record<string, string> = {
  "/gov/overview": "decisions alerts needs a decision city", "/gov/programmes": "coverage vaccination target work requests partners report data setup network areas",
  "/gov/surveillance": "alerts bites rabies samples exposures by area", "/gov/verification": "review claims packages abc evidence queried",
  "/gov/reports": "export csv print monthly", "/gov/partners": "ngo hospitals laboratories organisations", "/gov/data-requests": "research access data sharing approve decline",
};
/** Built pages with the workspace they belong to, for search. Data requests has no sidebar row (it is reached from a
    request's notification and Kaju), so search is where a programme lead finds it again. */
export const PAGES: { href: string; label: string; ws: string; icon: NavItem["icon"]; office?: boolean; lab?: boolean; keywords?: string }[] = [
  ...NGO.map((i) => ({ ...i, ws: "NGO" })), ...NGO_MORE.map((i) => ({ ...i, ws: "NGO" })), ...GOV.map((i) => ({ ...i, ws: "Government & Programmes" })),
  { href: "/gov/data-requests", label: "Data requests", icon: FileCheck2, ws: "Government & Programmes" },
  ...HEALTH.map((i) => ({ ...i, ws: "Healthcare" })), ...LAB.filter((i) => i.href !== "/health/today").map((i) => ({ ...i, ws: "Laboratory", lab: true })),
  ...RESEARCH.map((i) => ({ ...i, ws: "Research" })), ...KAJU.map((i) => ({ ...i, ws: "Kaju" })),
].filter((i) => BUILT.has(i.href)).map((i) => ({ ...i, keywords: KEYWORDS[i.href] }));
/** The workspace a search page belongs to; Kaju belongs to everyone. */
export const PAGE_WS: Record<string, "ngo" | "government" | "healthcare" | "research"> = { NGO: "ngo", "Government & Programmes": "government", Healthcare: "healthcare", Laboratory: "healthcare", Research: "research" };

