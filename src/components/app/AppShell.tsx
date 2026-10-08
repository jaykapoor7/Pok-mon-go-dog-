"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
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
  Database,
  LayoutGrid,
  MapPin,
  Plus,
  Radio,
  Repeat2,
  ScanSearch,
  Search,
  ChartColumn,
  GraduationCap,
  Menu,
  Utensils,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ProfilePanel } from "./ProfilePanel";
import { PhoneMenu } from "./PhoneMenu";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { groupFor } from "@/components/partner/PartnerTabs";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import { readStoredRole, type Role } from "@/lib/roles";
import "./app.css";
import "./editorial.css";
import "./desk.css";
import "./institution.css";
import "./street-os.css";

/* The shared record everyone can reach: the map, saved animals, the place
   brief, the stories and the partner directory. Every public space carries
   this same set after its own distinctive pages, so Stories, Insights and
   the rest work the same way whichever role you are in. */
const SHARED_NAV = [
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/following", label: "Saved dogs", Icon: Bookmark },
  { href: "/insights", label: "Insights", Icon: ChartColumn },
  { href: "/stories", label: "Stories", Icon: BookOpen },
  { href: "/orgs", label: "Partner NGOs", Icon: Building2 },
];

/* Community: report, follow, and the shared record. */
const COMMUNITY_NAV = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  ...SHARED_NAV,
];

/* NGO navigation is about decisions, records, geography and reporting. The
   detailed tables (cases, quality, imports, projects, operations) remain
   contextual subviews rather than permanent top-level features. */
const NGO_NAV = [
  { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
  { href: "/partner/animals", label: "Records", Icon: Database },
  { href: "/partner/field", label: "Field work", Icon: BookOpen },
  { href: "/partner/map", label: "Map", Icon: MapPin },
  { href: "/partner/reports", label: "Analysis", Icon: ScanSearch },
  { href: "/partner/team", label: "Team", Icon: Building2 },
];

/* Municipality is a geographic command surface, not the community map with
   a different label. It keeps access to the shared record, but returns to the
   command map as its home and puts coverage analysis beside it. */
const MUNICIPAL_NAV = [
  { href: "/municipality", label: "City command", Icon: MapPin },
  { href: "/insights", label: "Coverage analysis", Icon: ChartColumn },
  { href: "/map", label: "Public atlas", Icon: LayoutGrid },
  { href: "/orgs", label: "Partner NGOs", Icon: Building2 },
];

/* A feeder's space is their route; an educator's is the lessons. Both
   share the public map and record with the community. */
const FEEDER_NAV = [
  { href: "/feeder", label: "My patch", Icon: LayoutGrid },
  { href: "/feeding", label: "Feeding spots", Icon: Utensils },
  ...SHARED_NAV,
];

const EDUCATOR_NAV = [
  { href: "/learn", label: "Lesson studio", Icon: GraduationCap },
  ...SHARED_NAV,
];

type Space = "community" | "feeder" | "educator" | "ngo" | "municipality";
const SPACES = {
  /* The phone bar has three places around Report and a More slot. Work
     that does not fit there remains one horizontal, always-visible row
     above the page; More is reserved for genuinely secondary navigation. */
  community: {
    label: "Community", home: "/app", nav: COMMUNITY_NAV,
    phone: COMMUNITY_NAV.filter((x) => x.href !== "/insights" && x.href !== "/orgs"),
    shortcuts: SHARED_NAV.filter((x) => x.href === "/insights" || x.href === "/stories" || x.href === "/orgs"),
  },
  feeder: {
    label: "Feeder", home: "/feeder", nav: FEEDER_NAV, phone: FEEDER_NAV.slice(0, 4),
    shortcuts: SHARED_NAV.filter((x) => x.href === "/insights" || x.href === "/stories" || x.href === "/orgs"),
  },
  educator: {
    label: "Educator", home: "/learn", nav: EDUCATOR_NAV,
    phone: EDUCATOR_NAV.filter((x) => x.href !== "/orgs"),
    shortcuts: SHARED_NAV.filter((x) => x.href === "/insights" || x.href === "/stories" || x.href === "/orgs"),
  },
  ngo: {
    label: "NGO operations", home: "/partner", nav: NGO_NAV,
    phone: NGO_NAV.filter((x) => x.href !== "/partner/field").slice(0, 4),
    shortcuts: NGO_NAV.filter((x) => x.href === "/partner/field" || x.href === "/partner/reports" || x.href === "/partner/team"),
  },
  municipality: {
    label: "Municipality", home: "/municipality", nav: MUNICIPAL_NAV, phone: MUNICIPAL_NAV,
    shortcuts: MUNICIPAL_NAV.filter((x) => x.href === "/orgs"),
  },
};

/* A space's own routes decide it outright: /partner is the organisation,
   /app the community, /feeder and /feeding the feeder, /learn the
   educator. Shared routes (the map, insights, stories) keep the feeder or
   educator space that was picked, and otherwise read as community, so the
   organisation's navigation never leaks onto public pages. */
function spaceFor(path: string, stored: Role | null): Space {
  if (path.startsWith("/partner") || path === "/surveys" || path.startsWith("/surveys/")) return "ngo";
  if (path === "/municipality") return "municipality";
  if (path === "/app") return "community";
  if (path === "/feeder" || path.startsWith("/feeding")) return "feeder";
  if (path === "/learn") return "educator";
  return stored === "feeder" || stored === "educator" ? stored : "community";
}
const InShell = createContext(false);

export function AppShell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const nested = useContext(InShell);
  const pathname = usePathname();
  const router = useRouter();
  const [space, setSpace] = useState<Space>(() => spaceFor(pathname, null));
  const isNgo = space === "ngo";
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  /* Which space you are in is decided by where you are, not by what you
     once picked. Including the stored role here meant anybody who had ever
     chosen "organisation" saw the NGO navigation on /app as well, so the
     community space became unreachable without clearing storage: the two
     dashboards stopped being separate. The stored role still decides where
     the picker sends you; it does not decide what you see once you arrive. */
  useEffect(() => {
    setSpace(spaceFor(pathname, readStoredRole()));
  }, [pathname]);

  /* Command-palette behaviour without another modal layer: the global finder
     * is already capable of records, places and organisations, so Cmd/Ctrl-K
     * should take a person straight to it from every working surface. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const isReporting = pathname === "/report" || pathname.startsWith("/report/");
  const { nav: primaryNav, phone: phoneNav, shortcuts, home, label: spaceLabel } = SPACES[space];
  const destinations = new Set(primaryNav.map((n) => n.href));
  const showBack = !destinations.has(pathname) && !isReporting && pathname !== "/";

  /* Exactly one destination is current, decided once rather than asked of
     each item in turn. Asked separately, three rules could all say yes:
     /partner/map lit Map (exact) and Dashboard (the longest item whose
     href + "/" prefixes it, since "/partner/map" does not start with
     "/partner/map/"), and /partner/cases lit Records (its group root) and
     Dashboard for the same reason. The phone tab bar showed two selected
     tabs on both. The rules are a precedence order: an exact destination,
     then the workspace group a secondary route belongs to, then the
     longest enclosing destination. */
  const currentHref = (() => {
    const exact = primaryNav.find((item) => item.href === pathname);
    if (exact) return exact.href;
    const root = groupFor(pathname)?.root;
    if (root && primaryNav.some((item) => item.href === root)) return root;
    return primaryNav
      .filter((item) => pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  })();
  const isActive = (href: string) => href === currentHref;
  const pageLabel = primaryNav.find((item) => item.href === currentHref)?.label ?? "Record";

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) return router.back();
    router.push(home);
  }

  if (nested) return <>{children}</>;

  return <InShell.Provider value={true}>
    <div className={`spa spa-editorial spa-desk${isReporting ? " spa-reporting" : ""}`}>
      <Welcome />
      <a href="#spa-main" className="skip-link">Skip to content</a>

      <div className="spa-top">
        <Link href={home} className="spa-brand"><StrayPawMark size={34}/><span className="spa-brand-copy"><strong>StrayPaw</strong><small>The shared record</small></span></Link>
        <form className="spa-search" onSubmit={handleSearch} role="search">
          <Search size={13}/>
          <input ref={searchRef} type="search" placeholder="Search StrayPaw ID, place or organisation" aria-label="Search the network" value={query} onChange={(e) => onQueryChange(e.target.value)} onKeyDown={onSearchKey} onBlur={() => window.setTimeout(() => setHits([]), 120)} role="combobox" aria-expanded={hits.length > 0} aria-controls="spa-search-results" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}/>
          {hits.length > 0 && <ul className="spa-results" id="spa-search-results" role="listbox">{hits.map((h, i) => <li key={`${h.kind}-${h.href}-${h.label}`} role="option" aria-selected={i === cursor}><button type="button" className={i === cursor ? "on" : ""} onMouseEnter={() => setCursor(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)}><span className="spa-res-kind">{KIND_LABEL[h.kind]}</span><b>{h.label}</b><span className="spa-res-detail">{h.detail}</span></button></li>)}</ul>}
        </form>
        <div className="spa-top-right"><LanguageSwitcher /><div className="spa-top-account"><ProfilePanel/></div><div className="spa-register-feedback"><FeedbackButton label="Feedback"/></div><button type="button" className="spa-switch" onClick={openTour}><Repeat2 size={15}/> Switch space</button><Link href="/" className="spa-exit"><ArrowUpRight size={13}/> Main site</Link></div>
      </div>

      <div className="spa-body">
        <nav id="spa-side-nav" className="spa-side" aria-label="Main navigation">
          <p className="spa-nav-context">{spaceLabel}</p>
          <div className="spa-primary-nav">{primaryNav.map(({ href, label, Icon }) => <Link key={label} href={href} prefetch aria-current={isActive(href) ? "page" : undefined} className={isActive(href) ? "active" : ""}><Icon size={17}/>{label}</Link>)}</div>

          {isNgo && <div className="spa-quick-list" aria-label="Quick actions">
            <p>Start</p>
            <Link href="/partner/cases/new" className="spa-quick-primary"><Plus size={15}/><span>New rescue case</span></Link>
            <Link href="/report"><Radio size={14}/><span>Report a dog</span></Link>
            <Link href="/partner/import"><Database size={14}/><span>Import workbook</span></Link>
          </div>}

          <div className="spa-phone-links">
            {phoneNav.slice(0, 2).map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={20}/><span>{label}</span></Link>)}
            <Link href="/report" className="spa-mobile-report" aria-label="Report a dog"><Radio size={20}/><span>Report</span></Link>
            {phoneNav.slice(2, 3).map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={20}/><span>{label}</span></Link>)}
            <button type="button" className="spa-phone-more" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20}/><span>More</span></button>
          </div>

          <div className="spa-side-foot"><ProfilePanel/><div className="spa-side-feedback"><FeedbackButton label="Send feedback"/></div></div>
        </nav>

        <PhoneMenu open={menuOpen} onClose={closeMenu} nav={primaryNav} spaceLabel={spaceLabel} isNgo={isNgo} isActive={isActive} />

        <main id="spa-main" className={`spa-main ${flush ? "flush" : ""}`}>
          {!flush && !isReporting && shortcuts.length > 0 && <nav className="spa-mobile-shortcuts" aria-label={`${spaceLabel} key workflows`}>
            <span className="spa-mobile-shortcuts-label">Key workflows</span>
            <div>
              {isNgo && <Link href="/partner/cases/new" className="is-action"><Plus size={15}/><span>New case</span></Link>}
              {shortcuts.map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={15}/><span>{label}</span></Link>)}
            </div>
          </nav>}
          {!flush && <div className="spa-page-context"><span>{spaceLabel} / {pageLabel}</span></div>}
          {showBack && <div className="spa-back"><button type="button" onClick={goBack}><ArrowLeft size={15}/>Back</button></div>}
          {children}
        </main>
      </div>
    </div>
  </InShell.Provider>;
}
