import type { ComponentType } from "react";
import {
  Binoculars, CalendarClock, Inbox, BookOpen, Bookmark, Building2, ChartColumn, ClipboardList, Compass, Database,
  FileText, GraduationCap, Home, Landmark, Map as MapIcon, PawPrint, Plus, Radio, Route, Utensils,
} from "lucide-react";
import type { Role } from "@/lib/roles";

/* ════════════════════════════════════════════════════════════════════
   One product, three audiences, one map of where everything lives.

   A space is the job someone came to do. It decides the handful of
   destinations in the bar, the one primary action, and the long tail the
   More sheet carries. Shared routes (the map, Insights, Stories) keep
   the space you arrived from, so a municipal officer who opens the map
   is still in the City space when they come back.
   ════════════════════════════════════════════════════════════════════ */

export type Space = "community" | "feeder" | "educator" | "ngo" | "city";
export type NavItem = { href: string; label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number }> };
export type MoreGroup = { label: string; links: { href: string; label: string }[] };

type SpaceDef = {
  label: string;
  /** What the switcher says the space is for. */
  blurb: string;
  home: string;
  nav: NavItem[];
  /** Phone bar: two either side of the action, or four when there is none. */
  phone: string[];
  action: { href: string; label: string; short: string; Icon: NavItem["Icon"] } | null;
  more: MoreGroup[];
};

const REPORT = { href: "/report", label: "Report a dog", short: "Report", Icon: Radio };

const COMMUNITY_MORE: MoreGroup[] = [
  { label: "Around StrayPaw", links: [
    { href: "/orgs", label: "Partner NGOs" },
    { href: "/programmes", label: "Programmes" },
    { href: "/resources", label: "Emergency contacts & guides" },
    { href: "/fundraisers", label: "Fundraisers" },
    { href: "/feeding", label: "Feeding spots" },
    { href: "/help", label: "Help nearby" },
  ] },
];

export const SPACES: Record<Space, SpaceDef> = {
  community: {
    label: "Community", blurb: "Animals near you, reports and what happened next", home: "/app",
    nav: [
      { href: "/app", label: "Nearby", Icon: Home },
      { href: "/map", label: "Map", Icon: MapIcon },
      { href: "/following", label: "Saved", Icon: Bookmark },
      { href: "/stories", label: "Stories", Icon: BookOpen },
      { href: "/insights", label: "Insights", Icon: ChartColumn },
    ],
    phone: ["/app", "/map", "/following", "/stories"],
    action: REPORT,
    more: COMMUNITY_MORE,
  },
  feeder: {
    label: "Feeder", blurb: "Your route, feeding spots and the animals on it", home: "/feeder",
    nav: [
      { href: "/feeder", label: "My route", Icon: Route },
      { href: "/feeding", label: "Feeding spots", Icon: Utensils },
      { href: "/map", label: "Map", Icon: MapIcon },
      { href: "/following", label: "Saved", Icon: Bookmark },
      { href: "/stories", label: "Stories", Icon: BookOpen },
    ],
    phone: ["/feeder", "/feeding", "/map", "/following"],
    action: REPORT,
    more: COMMUNITY_MORE,
  },
  educator: {
    label: "Educator", blurb: "Lessons built from real local records", home: "/learn",
    nav: [
      { href: "/learn", label: "Lessons", Icon: GraduationCap },
      { href: "/map", label: "Map", Icon: MapIcon },
      { href: "/stories", label: "Stories", Icon: BookOpen },
      { href: "/insights", label: "Insights", Icon: ChartColumn },
      { href: "/resources", label: "Guides", Icon: FileText },
    ],
    phone: ["/learn", "/map", "/stories", "/insights"],
    action: REPORT,
    more: COMMUNITY_MORE,
  },
  ngo: {
    label: "NGO workspace", blurb: "Cases, animals, field work and reporting", home: "/partner",
    nav: [
      { href: "/partner", label: "Today", Icon: Compass },
      { href: "/partner/inbox", label: "Inbox", Icon: Inbox },
      { href: "/partner/cases", label: "Cases", Icon: ClipboardList },
      { href: "/partner/followups", label: "Follow-ups", Icon: CalendarClock },
      { href: "/partner/animals", label: "Animals", Icon: PawPrint },
      { href: "/partner/field", label: "Field", Icon: Binoculars },
      { href: "/partner/reports", label: "Reports", Icon: ChartColumn },
    ],
    phone: ["/partner", "/partner/inbox", "/partner/cases", "/partner/followups"],
    action: { href: "/partner/cases/new", label: "New case", short: "New case", Icon: Plus },
    more: [
      { label: "Records", links: [
        { href: "/partner/review", label: "Case review" },
        { href: "/partner/records", label: "Search source records" },
        { href: "/partner/quality", label: "Data quality" },
        { href: "/partner/import", label: "Import a workbook" },
        { href: "/partner/medical", label: "Medical" },
      ] },
      { label: "Field work", links: [
        { href: "/partner/map", label: "Map of open work" },
        { href: "/partner/drives", label: "ABC / ARV drives" },
        { href: "/partner/projects", label: "Projects" },
        { href: "/partner/surveys", label: "Surveys" },
        { href: "/partner/operations", label: "Operations log" },
        { href: "/partner/feeding", label: "Feeding" },
      ] },
      { label: "Organisation", links: [
        { href: "/partner/team", label: "Team" },
        { href: "/partner/volunteers", label: "Volunteers" },
        { href: "/partner/codes", label: "Invite codes" },
        { href: "/partner/settings", label: "Settings" },
        { href: "/partner/stories", label: "Stories" },
        { href: "/partner/fundraising", label: "Fundraising" },
        { href: "/partner/resources", label: "Resources" },
      ] },
      { label: "Shared record", links: [
        { href: "/report", label: "Report a dog" },
        { href: "/map", label: "Public map" },
        { href: "/orgs", label: "Partner NGOs" },
      ] },
    ],
  },
  city: {
    label: "Municipality", blurb: "Programme evidence and gaps, city by city", home: "/municipality",
    nav: [
      { href: "/municipality", label: "City brief", Icon: Landmark },
      { href: "/map", label: "Map", Icon: MapIcon },
      { href: "/insights", label: "Analysis", Icon: ChartColumn },
      { href: "/programmes", label: "Programmes", Icon: Database },
      { href: "/orgs", label: "Partners", Icon: Building2 },
    ],
    phone: ["/municipality", "/map", "/insights", "/orgs"],
    action: null,
    more: [
      { label: "Evidence", links: [
        { href: "/stories", label: "Case stories" },
        { href: "/data-governance", label: "Data governance" },
        { href: "/research-standards", label: "Research standards" },
        { href: "/resources", label: "Guides & contacts" },
      ] },
    ],
  },
};

export const SPACE_ORDER: Space[] = ["community", "ngo", "city", "feeder", "educator"];

const SPACE_KEY = "sx.space";

/** A space's own routes decide it outright; shared routes keep the last one. */
export function spaceFor(path: string, remembered: Space | null, stored: Role | null): Space {
  if (path.startsWith("/partner") || path === "/surveys" || path.startsWith("/surveys/")) return "ngo";
  if (path === "/municipality") return "city";
  if (path === "/app") return "community";
  if (path === "/feeder" || path.startsWith("/feeding")) return "feeder";
  if (path === "/learn") return "educator";
  if (remembered && remembered !== "ngo") return remembered;
  return stored === "feeder" || stored === "educator" ? stored : "community";
}

export function rememberSpace(space: Space) {
  try { sessionStorage.setItem(SPACE_KEY, space); } catch { /* storage blocked */ }
}
export function rememberedSpace(): Space | null {
  try {
    const v = sessionStorage.getItem(SPACE_KEY);
    return v && v in SPACES ? (v as Space) : null;
  } catch { return null; }
}

/** Exactly one destination is current: exact, then longest enclosing. */
export function currentOf(nav: NavItem[], path: string, home: string): string | null {
  const exact = nav.find((n) => n.href === path);
  if (exact) return exact.href;
  /* The home of a space is never "current" for a page that merely lives
     under it: /partner/medical is not Today. */
  return nav.filter((n) => n.href !== home && path.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
