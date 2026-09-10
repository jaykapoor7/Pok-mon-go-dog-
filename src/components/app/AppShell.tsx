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
  ArrowUpRight,
  Bookmark,
  Building2,
  CalendarRange,
  Database,
  Heart,
  LayoutGrid,
  MapPin,
  Radio,
  Repeat2,
  ScanSearch,
  Search,
  Utensils,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { ProfilePanel } from "./ProfilePanel";
import { readStoredRole, type Role } from "@/lib/roles";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

const COMMUNITY_NAV = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report", Icon: Radio },
  { href: "/following", label: "Saved animals", Icon: Bookmark },
  { href: "/feed", label: "Recent activity", Icon: Radio },
  { href: "/orgs", label: "Organisations", Icon: Heart },
  { href: "/evidence", label: "Evidence", Icon: ScanSearch },
];

const NGO_NAV = [
  { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
  { href: "/partner/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report", Icon: Radio },
  { href: "/partner/animals", label: "Records", Icon: Database },
  { href: "/partner/field", label: "Field work", Icon: CalendarRange },
];

const FEEDER_NAV = [
  { href: "/feeder", label: "My patch", Icon: Utensils },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report", Icon: Radio },
  { href: "/following", label: "Saved dogs", Icon: Bookmark },
  { href: "/evidence", label: "Evidence", Icon: ScanSearch },
];
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
    /* Enter takes the highlighted result. Pushing the raw text at the map
       did nothing. It reads lat/lng, not a free-text query. */
    if (hits[cursor]) go(hits[cursor]);
  }

  /* Static answers land on the keystroke; wards and districts are a round
     trip and arrive after. Merged rather than replaced so the list does not
     jump under a finger already moving towards a result, and the request is
     tagged so a slow answer to "che" cannot overwrite the results for
     "chennai". */
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
        /* Areas sit under places but above pages: someone typing a ward
           number wants the ward, someone typing a city wants the city. */
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

  /* Read after mount: localStorage is not available during SSR, and reading it
     during render would desync the server and client markup. */
  useEffect(() => {
    setRole(readStoredRole());
  }, [pathname]);

  const isNgo = role === "ngo" || pathname.startsWith("/partner");
  const isFeeder = role === "feeder" || pathname.startsWith("/feeder");
  const primaryNav = isNgo ? NGO_NAV : isFeeder ? FEEDER_NAV : COMMUNITY_NAV;
  const mobileNav = isNgo
    ? primaryNav.filter(({ label }) => ["Dashboard", "Map", "Records", "Field work"].includes(label))
    : isFeeder
      ? primaryNav.filter(({ label }) => ["My patch", "Map", "Saved dogs", "Evidence"].includes(label))
    : primaryNav.filter(({ label }) => ["Home", "Map", "Saved animals", "Evidence"].includes(label));
  const isActive = (href: string) => {
    if (href === "/partner/animals") return pathname.startsWith("/partner/animals") || pathname.startsWith("/partner/cases") || pathname.startsWith("/partner/medical");
    if (href === "/partner/field") return pathname.startsWith("/partner/field") || pathname.startsWith("/partner/incoming") || pathname.startsWith("/partner/drives") || pathname.startsWith("/partner/reports");
    return pathname.startsWith(href);
  };

  /* Placed after every hook so the hook order stays stable either way. */
  if (nested) return <>{children}</>;

  return (
   <InShell.Provider value={true}>
    <div className="spa">
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
            placeholder="Search places or organisations"
            aria-label="Search the network"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onSearchKey}
            onBlur={() => window.setTimeout(() => setHits([]), 120)}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="spa-search-results"
            /* Mobile keyboards show a "search" key instead of "return". */
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
          <button type="button" className="spa-switch" onClick={openTour}><Repeat2 size={15} /> Switch space</button>
          {/* Up here rather than in the side nav's foot, which was carrying
              four controls and a role chip in a 208px column. */}
          <Link href="/" className="spa-exit">
            <ArrowUpRight size={13} /> Main site
          </Link>
        </div>
      </div>

      <div className="spa-body">
        <nav id="spa-side-nav" className="spa-side" aria-label="Main navigation">
          <p className="spa-nav-context">{isNgo ? "NGO operations" : isFeeder ? "Feeder workspace" : "Community"}</p>
          <div className="spa-primary-nav">
            {primaryNav.map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined} className={`${isActive(href) ? "active " : ""}${label === "Report" ? "spa-report-shortcut" : ""}`}><Icon size={17}/>{label}</Link>)}
          </div>

          <div className="spa-phone-links">
            {mobileNav.map(({href,label,Icon}) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={20}/><span>{label}</span></Link>)}
          </div>
          <Link href="/report" className="spa-mobile-report" aria-label="Report a sighting"><Radio size={21}/><span>Report</span></Link>
          <div className="spa-side-foot">
            <ProfilePanel />
          </div>
        </nav>

        <main id="spa-main" className={`spa-main ${flush ? "flush" : ""}`}>
          {children}
        </main>
      </div>
    </div>
   </InShell.Provider>
  );
}
