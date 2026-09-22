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
  Building2,
  Database,
  LayoutGrid,
  MapPin,
  Plus,
  Radio,
  Repeat2,
  ScanSearch,
  Search,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ProfilePanel } from "./ProfilePanel";
import { groupFor } from "@/components/partner/PartnerTabs";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

/* Community is intentionally small: report, see the map, and understand the
   complete animal stories produced by community + NGO records. */
const COMMUNITY_NAV = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/stories", label: "Stories", Icon: BookOpen },
  { href: "/orgs", label: "Organisations", Icon: Building2 },
];

/* NGO navigation is about decisions, records, geography and reporting. The
   detailed tables (cases, quality, imports, projects, operations) remain
   contextual subviews rather than permanent top-level features. */
const NGO_NAV = [
  { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
  { href: "/partner/animals", label: "Records", Icon: Database },
  { href: "/partner/map", label: "Map", Icon: MapPin },
  { href: "/partner/reports", label: "Reports", Icon: ScanSearch },
  { href: "/partner/team", label: "Team", Icon: Building2 },
];

const PHONE_COMMUNITY = COMMUNITY_NAV;
const PHONE_NGO = NGO_NAV.slice(0, 4);
const InShell = createContext(false);

export function AppShell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const nested = useContext(InShell);
  const pathname = usePathname();
  const router = useRouter();
  const [isNgo, setIsNgo] = useState(pathname.startsWith("/partner"));
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Which space you are in is decided by where you are, not by what you
     once picked. Including the stored role here meant anybody who had ever
     chosen "organisation" saw the NGO navigation on /app as well, so the
     community space became unreachable without clearing storage: the two
     dashboards stopped being separate. The stored role still decides where
     the picker sends you; it does not decide what you see once you arrive. */
  useEffect(() => {
    setIsNgo(pathname.startsWith("/partner"));
  }, [pathname]);

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

  const isReporting = pathname.startsWith("/report");
  const primaryNav = isNgo ? NGO_NAV : COMMUNITY_NAV;
  const phoneNav = isNgo ? PHONE_NGO : PHONE_COMMUNITY;
  const destinations = new Set(primaryNav.map((n) => n.href));
  const showBack = !destinations.has(pathname) && !pathname.startsWith("/report") && pathname !== "/";

  const isActive = (href: string) => {
    if (pathname === href) return true;
    const group = groupFor(pathname);
    if (group?.root === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;
    return primaryNav.filter((item) => pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href === href;
  };

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) return router.back();
    router.push(isNgo ? "/partner" : "/app");
  }

  if (nested) return <>{children}</>;

  return <InShell.Provider value={true}>
    <div className={`spa${isReporting ? " spa-reporting" : ""}`}>
      <Welcome />
      <a href="#spa-main" className="skip-link">Skip to content</a>

      <div className="spa-top">
        <Link href="/app" className="spa-brand"><StrayPawMark size={34}/><span>StrayPaw</span></Link>
        <form className="spa-search" onSubmit={handleSearch} role="search">
          <Search size={13}/>
          <input ref={searchRef} type="search" placeholder="Search StrayPaw ID, place or organisation" aria-label="Search the network" value={query} onChange={(e) => onQueryChange(e.target.value)} onKeyDown={onSearchKey} onBlur={() => window.setTimeout(() => setHits([]), 120)} role="combobox" aria-expanded={hits.length > 0} aria-controls="spa-search-results" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}/>
          {hits.length > 0 && <ul className="spa-results" id="spa-search-results" role="listbox">{hits.map((h, i) => <li key={`${h.kind}-${h.href}-${h.label}`} role="option" aria-selected={i === cursor}><button type="button" className={i === cursor ? "on" : ""} onMouseEnter={() => setCursor(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)}><span className="spa-res-kind">{KIND_LABEL[h.kind]}</span><b>{h.label}</b><span className="spa-res-detail">{h.detail}</span></button></li>)}</ul>}
        </form>
        <div className="spa-top-right"><div className="spa-top-account"><ProfilePanel/></div><button type="button" className="spa-switch" onClick={openTour}><Repeat2 size={15}/> Switch space</button><Link href="/" className="spa-exit"><ArrowUpRight size={13}/> Main site</Link></div>
      </div>

      <div className="spa-body">
        <nav id="spa-side-nav" className="spa-side" aria-label="Main navigation">
          <p className="spa-nav-context">{isNgo ? "NGO operations" : "Community"}</p>
          <div className="spa-primary-nav">{primaryNav.map(({ href, label, Icon }) => <Link key={label} href={href} prefetch aria-current={isActive(href) ? "page" : undefined} className={isActive(href) ? "active" : ""}><Icon size={17}/>{label}</Link>)}</div>

          {isNgo && <div className="spa-quick-list" aria-label="Quick actions">
            <p>Start</p>
            <Link href="/partner/cases/new" className="spa-quick-primary"><Plus size={15}/><span>New rescue case</span></Link>
            <Link href="/report"><Radio size={14}/><span>Report an animal</span></Link>
            <Link href="/partner/import"><Database size={14}/><span>Import workbook</span></Link>
          </div>}

          <div className="spa-phone-links">
            {phoneNav.slice(0, 2).map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={30}/><span>{label}</span></Link>)}
            <Link href="/report" className="spa-mobile-report" aria-label="Report an animal"><Radio size={30}/><span>Report</span></Link>
            {phoneNav.slice(2).map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={30}/><span>{label}</span></Link>)}
          </div>

          <div className="spa-side-foot"><ProfilePanel/><div className="spa-side-feedback"><FeedbackButton label="Send feedback"/></div></div>
        </nav>

        <main id="spa-main" className={`spa-main ${flush ? "flush" : ""}`}>
          {showBack && <div className="spa-back"><button type="button" onClick={goBack}><ArrowLeft size={15}/>Back</button></div>}
          {children}
        </main>
      </div>
    </div>
  </InShell.Provider>;
}
