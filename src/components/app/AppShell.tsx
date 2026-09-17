"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Building2,
  CalendarRange,
  Database,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Plus,
  Radio,
  Repeat2,
  ScanSearch,
  Search,
  Waves,
  Utensils,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ProfilePanel } from "./ProfilePanel";
import { groupFor } from "@/components/partner/PartnerTabs";
import { readStoredRole, type Role } from "@/lib/roles";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

/* Community navigation follows the public story of the work, not the
   database schema. Map/search/report remain actions inside those surfaces. */
const COMMUNITY_NAV = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  { href: "/rescues", label: "Rescues", Icon: Radio },
  { href: "/outcomes", label: "Completed", Icon: Database },
  { href: "/timeline", label: "Timeline", Icon: Waves },
];

/* Secondary public resources stay searchable and linkable, but do not earn
   permanent navigation simply because a route exists. */
const COMMUNITY_REFERENCE_NAV: { href: string; label: string; Icon: typeof MapPin }[] = [];

/* An educator opens StrayPaw for the material, not the field work, so
   education takes the slot the dashboard would have. The rest is the same
   community console: a teacher still reports and still reads the map. */
const EDUCATOR_NAV = [
  { href: "/education", label: "Education", Icon: GraduationCap },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report", Icon: Radio },
  { href: "/learn", label: "Learn", Icon: BookOpen },
];

/* Pawesome's operational register clarified the real NGO jobs: decide what
   needs action, work the records, run field work, understand patterns, and
   manage the team. Cases/animals/maps remain available inside those jobs. */
const NGO_NAV = [
  { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
  { href: "/partner/animals", label: "Records", Icon: Database },
  { href: "/partner/field", label: "Field work", Icon: CalendarRange },
  { href: "/partner/reports", label: "Analytics", Icon: ScanSearch },
  { href: "/partner/team", label: "Team", Icon: Building2 },
];

const FEEDER_NAV = [
  { href: "/feeder", label: "My patch", Icon: Utensils },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report", Icon: Radio },
  { href: "/following", label: "Saved dogs", Icon: Bookmark },
  { href: "/evidence", label: "Evidence", Icon: ScanSearch },
];

/* ── The phone bar ────────────────────────────────────────────────
   Two on each side of Report. Report remains the central action; the four
   surrounding destinations match the role's actual workflow. */
const PHONE_NAV: Record<Role, { href: string; label: string; Icon: typeof MapPin }[]> = {
  individual: [
    { href: "/app", label: "Home", Icon: LayoutGrid },
    { href: "/rescues", label: "Rescues", Icon: Radio },
    { href: "/outcomes", label: "Completed", Icon: Database },
    { href: "/timeline", label: "Timeline", Icon: Waves },
  ],
  feeder: [
    { href: "/feeder", label: "My patch", Icon: Utensils },
    { href: "/map", label: "Map", Icon: MapPin },
    { href: "/following", label: "Saved", Icon: Bookmark },
    { href: "/evidence", label: "Evidence", Icon: ScanSearch },
  ],
  educator: [
    { href: "/learn", label: "Learn", Icon: BookOpen },
    { href: "/map", label: "Map", Icon: MapPin },
    { href: "/following", label: "Saved", Icon: Bookmark },
    { href: "/feed", label: "Activity", Icon: Waves },
  ],
  ngo: [
    { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
    { href: "/partner/animals", label: "Records", Icon: Database },
    { href: "/partner/field", label: "Field work", Icon: CalendarRange },
    { href: "/partner/reports", label: "Analytics", Icon: ScanSearch },
  ],
  funder: [
    { href: "/what-would-it-take", label: "Programme", Icon: LayoutGrid },
    { href: "/map", label: "Map", Icon: MapPin },
    { href: "/gaps", label: "Gaps", Icon: ScanSearch },
    { href: "/outcomes", label: "Outcomes", Icon: Database },
  ],
};
/* Set once an AppShell is mounted. Chrome wraps app routes in a shell from
   a hand-maintained route list, while several pages also mount one directly;
   whenever those two disagree the console renders inside itself. Rather than
   keep the list perfectly in sync forever, a nested shell detects the outer
   one and renders as a plain passthrough. */
const InShell = createContext(false);

export function AppShell({
  children,
  flush = false,
}: {
  children: ReactNode;
  flush?: boolean;
}) {
  const nested = useContext(InShell);
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  function go(hit: SearchHit) {
    router.push(hit.href);
    setQuery("");
    setHits([]);
    searchRef.current?.blur();
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (hits[cursor]) go(hits[cursor]);
  }

  const searchSeq = useRef(0);
  function onQueryChange(v: string) {
    setQuery(v);
    const base = search(v);
    setHits(base);
    setCursor(0);

    const seq = ++searchSeq.current;
    if (v.trim().length < 2) return;
    searchAreas(v)
      .then((areas) => {
        if (seq !== searchSeq.current || !areas.length) return;
        setHits((prev) => {
          const keep = prev.filter((h) => h.kind !== "ward");
          const head = keep.filter((h) => h.kind === "place" || h.kind === "state");
          const tail = keep.filter((h) => h.kind !== "place" && h.kind !== "state");
          return [...head, ...areas, ...tail].slice(0, 10);
        });
      })
      .catch(() => {});
  }

  function onSearchKey(e: React.KeyboardEvent) {
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Escape") {
      setHits([]);
    }
  }

  useEffect(() => {
    setRole(readStoredRole());
  }, [pathname]);

  const isNgo = role === "ngo" || pathname.startsWith("/partner");
  const isFeeder = role === "feeder" || pathname.startsWith("/feeder");
  const isReporting = pathname.startsWith("/report");
  const isEducator = role === "educator" || pathname.startsWith("/education");

  const phoneRole: Role = role ?? "individual";
  const phoneNav = PHONE_NAV[phoneRole];
  const primaryNav = isNgo
    ? NGO_NAV
    : isFeeder
      ? FEEDER_NAV
      : isEducator
        ? EDUCATOR_NAV
        : COMMUNITY_NAV;
  const referenceNav = !isNgo && !isFeeder && !isEducator ? COMMUNITY_REFERENCE_NAV : [];
  const destinations = new Set<string>([
    ...primaryNav.map((n) => n.href),
    ...referenceNav.map((n) => n.href),
    ...phoneNav.map((n) => n.href),
  ]);
  const showBack =
    !destinations.has(pathname) &&
    !pathname.startsWith("/report") &&
    pathname !== "/";

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(isNgo ? "/partner" : isFeeder ? "/feeder" : isEducator ? "/education" : "/app");
  }

  const isActive = (href: string) => {
    if (pathname === href) return true;
    const group = groupFor(pathname);
    if (group) return group.root === href;
    if (!pathname.startsWith(`${href}/`)) return false;
    const candidates = [...primaryNav, ...referenceNav, ...phoneNav].map((item) => item.href);
    const closest = candidates
      .filter((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`))
      .sort((a, b) => b.length - a.length)[0];
    return closest === href;
  };

  if (nested) return <>{children}</>;

  return (
   <InShell.Provider value={true}>
    <div className={`spa${isReporting ? " spa-reporting" : ""}`}>
      <Welcome />
      <a href="#spa-main" className="skip-link">
        Skip to content
      </a>

      <div className="spa-top">
        <Link href="/app" className="spa-brand">
          <StrayPawMark size={34} />
          <span>StrayPaw</span>
        </Link>

        <form className="spa-search" onSubmit={handleSearch} role="search">
          <Search size={13} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search StrayPaw ID, place or organisation"
            aria-label="Search the network"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onSearchKey}
            onBlur={() => window.setTimeout(() => setHits([]), 120)}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="spa-search-results"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {hits.length > 0 && (
            <ul className="spa-results" id="spa-search-results" role="listbox">
              {hits.map((h, i) => (
                <li key={`${h.kind}-${h.href}-${h.label}`} role="option" aria-selected={i === cursor}>
                  <button
                    type="button"
                    className={i === cursor ? "on" : ""}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(h)}
                  >
                    <span className="spa-res-kind">{KIND_LABEL[h.kind]}</span>
                    <b>{h.label}</b>
                    <span className="spa-res-detail">{h.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="spa-top-right">
          <div className="spa-top-account"><ProfilePanel /></div>
          <button type="button" className="spa-switch" onClick={openTour}><Repeat2 size={15} /> Switch space</button>
          <Link href="/" className="spa-exit">
            <ArrowUpRight size={13} /> Main site
          </Link>
        </div>
      </div>

      <div className="spa-body">
        <nav id="spa-side-nav" className="spa-side" aria-label="Main navigation">
          <p className="spa-nav-context">{isNgo ? "NGO operations" : isFeeder ? "Feeder workspace" : isEducator ? "Education" : "Community"}</p>
          <div className="spa-primary-nav">
            {primaryNav.map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined} className={`${isActive(href) ? "active " : ""}${label === "Report" ? "spa-report-shortcut" : ""}`}><Icon size={17}/>{label}</Link>)}
          </div>
          {isNgo && <div className="spa-ngo-actions" aria-label="Quick actions">
            <p>Quick actions</p>
            <Link href="/report" className="spa-ngo-action spa-ngo-action-primary"><Radio size={16} /><span><b>Report an animal</b><small>Log a new sighting</small></span><ArrowUpRight size={15} /></Link>
            <Link href="/partner/cases/new" className="spa-ngo-action"><Plus size={16} /><span><b>New case</b><small>Start team follow-up</small></span><ArrowUpRight size={15} /></Link>
            <Link href="/partner/import" className="spa-ngo-action"><Database size={16} /><span><b>Import records</b><small>Bring in a register</small></span><ArrowUpRight size={15} /></Link>
          </div>}
          {referenceNav.length > 0 && (
            <div className="spa-reference-nav" aria-label="Community reference spaces">
              <p>Explore</p>
              {referenceNav.map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={16}/>{label}</Link>)}
            </div>
          )}

          <div className="spa-phone-links">
            {phoneNav.slice(0, 2).map(({ href, label, Icon }) => (
              <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}>
                <Icon size={30} />
                <span>{label}</span>
              </Link>
            ))}
            <Link href="/report" className="spa-mobile-report" aria-label="Report a sighting">
              <Radio size={30} />
              <span>Report</span>
            </Link>
            {phoneNav.slice(2).map(({ href, label, Icon }) => (
              <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}>
                <Icon size={30} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
          <div className="spa-side-foot">
            <ProfilePanel />
            <div className="spa-side-feedback">
              <FeedbackButton label="Send feedback" />
            </div>
          </div>
        </nav>

        <main id="spa-main" className={`spa-main ${flush ? "flush" : ""}`}>
          {showBack && (
            <div className="spa-back">
              <button type="button" onClick={goBack}>
                <ArrowLeft size={15} />
                Back
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
   </InShell.Provider>
  );
}
