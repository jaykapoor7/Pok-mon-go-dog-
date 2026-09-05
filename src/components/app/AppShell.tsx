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
  Calculator,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  Heart,
  HandHeart,
  HelpCircle,
  Home,
  Inbox,
  LayoutGrid,
  ListChecks,
  MapPin,
  Menu,
  Radio,
  ScanSearch,
  Search,
  ShieldCheck,
  Stethoscope,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome, openTour } from "./Welcome";
import { ProfilePanel } from "./ProfilePanel";
import { ROLE_META, readStoredRole, type Role } from "@/lib/roles";
import { search, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

/* Everyone sees these. The console is one view, community reporters and NGO
   staff work the same map and the same records. */
/* Names say what the thing is, not what it feels like. "Living map" meant
   nothing; it is a map of street animals. "Directory" could be anything;
   it is a list of organisations. Home comes first because it is where
   opening the app should put you. */
const COMMUNITY = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  { href: "/map", label: "Map", Icon: MapPin },
  { href: "/report", label: "Report an animal", Icon: Radio },
  { href: "/following", label: "Animals I follow", Icon: Bookmark },
  { href: "/orgs", label: "Organisations", Icon: Building2 },
  { href: "/get-involved", label: "Volunteer", Icon: Heart },
];

/* The evidence chain, in the order it actually runs: what is missing, what is
   outstanding, what it would cost, what is being done, what changed. */
/* Six reference pages behind one entry. They are things you go to on
   purpose with a question, not places you pass through daily, and six of
   them in a sidebar is most of the reason it needed collapsing. */
const EVIDENCE = [
  { href: "/evidence", label: "Research and gaps", Icon: ScanSearch },
  { href: "/data", label: "Published data", Icon: Database },
];

/* Field-operations surface. Same shell, deeper records.

   Dashboard first. An organisation's programme totals are the thing they
   open StrayPaw to look at, and without an entry for it the only way back
   from a sub-page was the browser's back button. */
const WORKSPACE = [
  { href: "/partner", label: "Dashboard", Icon: LayoutGrid },
  { href: "/partner/incoming", label: "Incoming", Icon: Inbox },
  { href: "/partner/drives", label: "Drives", Icon: CalendarRange },
  { href: "/partner/cases", label: "Cases", Icon: ClipboardList },
  { href: "/partner/animals", label: "Animals", Icon: Database },
  { href: "/partner/field", label: "Field work", Icon: MapPin },
  { href: "/partner/team", label: "Team", Icon: Users },
  { href: "/partner/reports", label: "Coverage and reports", Icon: FileText },
  { href: "/partner/resources", label: "Resources", Icon: FolderOpen },
];
/* Reachable, but not from here. Medical is a filter on Cases, Import is
   something you do to Animals, and Volunteer sign-ups is a list you read
   from Team. Each is linked from the page it belongs to. */

/* One column, three sections, only one of them expanded at a time. */
const SECTIONS: {
  key: string;
  label: string;
  items: { href: string; label: string; Icon: typeof Home }[];
}[] = [
  { key: "community", label: "Explore", items: COMMUNITY },
  { key: "evidence", label: "Data and evidence", items: EVIDENCE },
  { key: "workspace", label: "Your organisation", items: WORKSPACE },
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
  /* Which sections are open. Null until the first click, meaning "just the
     one holding the current page"; after that it is whatever the person
     chose. Opening one never closes another: somebody who wants two open
     is telling you they work across both. */
  const [openSections, setOpenSections] = useState<Set<string> | null>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  function onQueryChange(v: string) {
    setQuery(v);
    setHits(search(v));
    setCursor(0);
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
    setOpen(false);
  }, [pathname]);

  /* Read after mount: localStorage is not available during SSR, and reading it
     during render would desync the server and client markup. */
  useEffect(() => {
    setRole(readStoredRole());
  }, [pathname]);

  /* The role reorders the sidebar, it does not restrict it. A funder still
     sees Report; it simply is not the first thing in front of them. */
  const prioritise = <T extends { href: string }>(items: T[]): T[] => {
    if (!role) return items;
    const rank = ROLE_META[role].priority;
    const score = (h: string) => {
      const i = rank.indexOf(h);
      return i === -1 ? rank.length : i;
    };
    return [...items].sort((a, b) => score(a.href) - score(b.href));
  };

  /* Both of these are the root of a section, so a prefix match would keep
     them lit on every page beneath them and nothing would ever look
     current. */
  const isActive = (href: string) =>
    href === "/app" || href === "/partner"
      ? pathname === href
      : pathname.startsWith(href);

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
          <StrayPawMark size={18} />
          <span>StrayPaw</span>
          <small>console</small>
        </Link>

        <form className="spa-search" onSubmit={handleSearch} role="search">
          <Search size={13} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search location, animal ID, org…"
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
          {/* Up here rather than in the side nav's foot, which was carrying
              four controls and a role chip in a 208px column. */}
          <button type="button" className="spa-tour" onClick={openTour}>
            <HelpCircle size={14} /> Show me around
          </button>
          <Link href="/" className="spa-exit">
            <ArrowUpRight size={13} /> Main site
          </Link>
        </div>
      </div>

      <div className="spa-body">
        <button
          type="button"
          className={`spa-scrim ${open ? "show" : ""}`}
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          tabIndex={open ? 0 : -1}
        />

        <nav className={`spa-side ${open ? "open" : ""}`}>
          {/* This was a green dot reading "Live network", which told nobody
              anything and set a tone the rest of the console does not. */}
          <div className="spa-side-brand">StrayPaw</div>

          {SECTIONS.map(({ key, label, items }) => {
            const links = prioritise(items);
            const here = links.some(({ href }) => isActive(href));
            /* Starts with the section holding the current page open, so 23
               links are not all in one column at once. After that it is
               whatever the person opened, and opening one never shuts
               another. */
            /* Everything is open. Fourteen links across three labelled
               groups does not need hiding, and a person should not have to
               find a control before they can find a page. The collapse is
               kept only as a preference somebody can set. */
            const shown = openSections === null ? true : openSections.has(key);
            return (
              <div key={key} className="spa-sect">
                <button
                  type="button"
                  className={`spa-side-label ${shown ? "on" : ""}`}
                  aria-expanded={shown}
                  onClick={() =>
                    setOpenSections((prev) => {
                      /* First click starts from what is on screen now, so
                         nothing jumps shut underneath them. */
                      const base =
                        prev ??
                        new Set(
                          SECTIONS.filter((sec) =>
                            prioritise(sec.items).some((l) => isActive(l.href))
                          ).map((sec) => sec.key)
                        );
                      const next = new Set(base);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                >
                  <span>{label}</span>
                  <span className="spa-side-count">
                    {links.length}
                    <ChevronDown size={13} />
                  </span>
                </button>
                {shown &&
                  links.map(({ href, label: l, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={isActive(href) ? "active" : ""}
                      onClick={() => setOpen(false)}
                    >
                      <Icon size={15} />
                      {l}
                    </Link>
                  ))}
              </div>
            );
          })}


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
