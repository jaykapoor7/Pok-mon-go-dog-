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
  CalendarRange,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  Heart,
  HelpCircle,
  Inbox,
  LayoutGrid,
  MapPin,
  Menu,
  Radio,
  ScanSearch,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { ProfilePanel } from "./ProfilePanel";
import { readStoredRole, type Role } from "@/lib/roles";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { search, searchAreas, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

/* One stable rail for the whole product. Roles influence the landing point,
   never the information architecture, so a resident and an NGO can work from
   the same shared record without being sent into separate products. */
const PRIMARY = [
  { key: "home", label: "Home", Icon: LayoutGrid },
  { key: "map", label: "Map", Icon: MapPin },
  { href: "/partner/animals", label: "Records", Icon: Database },
  { href: "/partner/field", label: "Field work", Icon: CalendarRange },
  { href: "/evidence", label: "Evidence", Icon: ScanSearch },
];

const FIELD_TOOLS = [
  { href: "/partner/incoming", label: "Incoming", Icon: Inbox },
  { href: "/partner/drives", label: "Programme drives", Icon: CalendarRange },
  { href: "/partner/team", label: "Team", Icon: Users },
  { href: "/partner/reports", label: "Coverage", Icon: FileText },
];
const COMMUNITY_TOOLS = [
  { href: "/following", label: "Saved animals", Icon: Bookmark },
  { href: "/feed", label: "Recent activity", Icon: Radio },
  { href: "/orgs", label: "Organisations", Icon: Heart },
];
const EVIDENCE_TOOLS = [
  { href: "/gaps", label: "Coverage and gaps", Icon: ScanSearch },
  { href: "/needs", label: "Local needs", Icon: ClipboardList },
  { href: "/what-would-it-take", label: "Cost a programme", Icon: FileText },
  { href: "/studies", label: "Published studies", Icon: FileText },
  { href: "/interventions", label: "Interventions", Icon: Stethoscope },
  { href: "/outcomes", label: "Verified outcomes", Icon: Database },
];
const ACCOUNT_TOOLS = [
  { href: "/partner/resources", label: "Resources", Icon: FolderOpen },
  { href: "/partner/import", label: "Import records", Icon: Database },
  { href: "/partner/settings", label: "Settings", Icon: FileText },
];
/* A phone shows the few destinations somebody opens the console to reach,
   and one control for the rest. The full row is 2,300px of chips on a
   390px screen, which is six screen-widths of sideways scrolling before
   you have seen your own workspace: everything past the third chip may as
   well not exist. These four stay out; the other thirteen live one tap
   away, with their group headings intact, which is more structure than the
   flattened row ever had. */
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
  /* Which sections are open. Null until the first click, meaning "just the
     one holding the current page"; after that it is whatever the person
     chose. Opening one never closes another: somebody who wants two open
     is telling you they work across both. */
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousPathname = useRef(pathname);

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

  /* Escape closes the mobile drawer, the shortcut every user already
     expects from an overlay (Jakob's law). */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* A route change means the user got where they were going, the drawer
     should not still be sitting open on top of the destination. */
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  /* Read after mount: localStorage is not available during SSR, and reading it
     during render would desync the server and client markup. */
  useEffect(() => {
    setRole(readStoredRole());
  }, [pathname]);

  const homeHref = role === "ngo" ? "/partner" : "/app";
  const mapHref = role === "ngo" ? "/partner/map" : "/map";
  const primaryNav = PRIMARY.map((item) =>
    item.key === "home" ? { ...item, href: homeHref } : item.key === "map" ? { ...item, href: mapHref } : item,
  ) as Array<{ href: string; label: string; Icon: typeof LayoutGrid }>;
  const isActive = (href: string, label?: string) => {
    if (label === "Home") return pathname === "/app" || pathname === "/partner";
    if (label === "Map") return pathname === "/map" || pathname === "/partner/map";
    if (href === "/partner/animals") return pathname.startsWith("/partner/animals") || pathname.startsWith("/partner/cases") || pathname.startsWith("/partner/medical");
    if (href === "/partner/field") return pathname.startsWith("/partner/field") || pathname.startsWith("/partner/incoming") || pathname.startsWith("/partner/drives") || pathname.startsWith("/partner/reports");
    return pathname.startsWith(href);
  };
  const mobileNav = primaryNav.filter(({ label }) => ["Home", "Map", "Records"].includes(label));

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
        <button
          className="spa-menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

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
          <Link href="/report" className="spa-global-report"><Radio size={16} /> Report</Link>
          {/* Up here rather than in the side nav's foot, which was carrying
              four controls and a role chip in a 208px column. */}
          <Link href="/" className="spa-exit">
            <ArrowUpRight size={13} /> Main site
          </Link>
        </div>
      </div>

      <div className="spa-body">
        <button
          type="button"
          className="spa-scrim"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          tabIndex={open ? 0 : -1}
        />

        <nav id="spa-side-nav" className="spa-side" aria-label="Main navigation">
          <p className="spa-nav-context">StrayPaw workspace</p>
          <div className="spa-primary-nav">
            {primaryNav.map(({ href, label, Icon }) => <Link key={label} href={href} aria-current={isActive(href, label) ? "page" : undefined} className={isActive(href, label) ? "active" : ""} onClick={() => setOpen(false)}><Icon size={17}/>{label}</Link>)}
          </div>

          <div className="spa-phone-links">
            {mobileNav.map(({href,label,Icon}) => <Link key={label} href={href} aria-current={isActive(href, label) ? "page" : undefined}><Icon size={20}/><span>{label}</span></Link>)}
          </div>
          <Link href="/report" className="spa-mobile-report" aria-label="Report a sighting"><Radio size={21}/><span>Report</span></Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="spa-more" aria-label="Open more tools">
                <Menu size={15} />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-[340px] overflow-y-auto p-0">
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle className="font-display text-base font-normal">
                  All sections
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Everything else, arranged around the job you came to do.
                </SheetDescription>
              </SheetHeader>
              <div className="border-b px-5 py-4"><ProfilePanel onNavigate={() => setOpen(false)} /></div>
              <div className="flex flex-col gap-4 px-3 py-4">
                <MoreGroup title="Field operations" items={FIELD_TOOLS} active={isActive} onNavigate={() => setOpen(false)} />
                <MoreGroup title="Community" items={COMMUNITY_TOOLS} active={isActive} onNavigate={() => setOpen(false)} />
                <MoreGroup title="Evidence and planning" items={EVIDENCE_TOOLS} active={isActive} onNavigate={() => setOpen(false)} />
                <MoreGroup title="Account and tools" items={ACCOUNT_TOOLS} active={isActive} onNavigate={() => setOpen(false)} />
                <Button variant="ghost" className="mt-4 justify-start" onClick={() => { setOpen(false); openTour(); }}><HelpCircle size={16}/> Show me around</Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className="spa-side-foot">
            <ProfilePanel onNavigate={() => setOpen(false)} />
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

function MoreGroup({ title, items, active, onNavigate }: { title: string; items: Array<{ href: string; label: string; Icon: typeof LayoutGrid }>; active: (href: string, label?: string) => boolean; onNavigate: () => void }) {
  return <section className="flex flex-col gap-1">
    <p className="spa-mono px-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
    {items.map(({ href, label, Icon }) => <Button key={href} asChild variant={active(href, label) ? "secondary" : "ghost"} className="justify-start gap-2.5"><Link href={href} onClick={onNavigate}><Icon size={15}/>{label}</Link></Button>)}
  </section>;
}
