"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useState,
  useEffect,
  useContext,
  createContext,
  type ReactNode,
  useRef,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  Bookmark,
  Building2,
  Calculator,
  ClipboardList,
  Database,
  FileText,
  Heart,
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
import { Welcome } from "./Welcome";
import { ROLE_META, readStoredRole, type Role } from "@/lib/roles";
import { search, KIND_LABEL, type SearchHit } from "@/lib/search";
import "./app.css";

/* Everyone sees these. The console is one view, community reporters and NGO
   staff work the same map and the same records. */
const COMMUNITY = [
  { href: "/app", label: "Home", Icon: LayoutGrid },
  { href: "/map", label: "Living map", Icon: MapPin },
  { href: "/report", label: "Report an animal", Icon: Radio },
  { href: "/following", label: "Following", Icon: Bookmark },
  { href: "/orgs", label: "Directory", Icon: Building2 },
  { href: "/get-involved", label: "Volunteer", Icon: Heart },
];

/* The evidence chain, in the order it actually runs: what is missing, what is
   outstanding, what it would cost, what is being done, what changed. */
const EVIDENCE = [
  { href: "/gaps", label: "Data gaps", Icon: ScanSearch },
  { href: "/needs", label: "Needs", Icon: ListChecks },
  { href: "/what-would-it-take", label: "What would it take?", Icon: Calculator },
  { href: "/studies", label: "Studies", Icon: FileText },
  { href: "/interventions", label: "Interventions", Icon: Wrench },
  { href: "/outcomes", label: "Outcomes", Icon: ShieldCheck },
];

/* Field-operations surface. Same shell, deeper records. */
const WORKSPACE = [
  { href: "/partner/cases", label: "Cases", Icon: ClipboardList },
  { href: "/partner/animals", label: "Animals", Icon: Database },
  { href: "/partner/field", label: "Field ops", Icon: MapPin },
  { href: "/partner/medical", label: "Medical", Icon: Stethoscope },
  { href: "/partner/team", label: "Team", Icon: Users },
  { href: "/partner/reports", label: "Analytics", Icon: FileText },
  { href: "/partner/import", label: "Import records", Icon: Upload },
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

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

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
          <div className="spa-live">
            <i /> Live network
          </div>

          {prioritise(COMMUNITY).map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}

          <div className="spa-side-label">Evidence</div>
          {prioritise(EVIDENCE).map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}

          <div className="spa-side-label">Workspace</div>
          {prioritise(WORKSPACE).map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}

          <div className="spa-side-foot">
            Network
            <b>Pan-India</b>
            {role && (
              <button
                type="button"
                className="spa-role-chip"
                onClick={() => {
                  try {
                    window.localStorage.removeItem("straypaw.role");
                    window.localStorage.removeItem("straypaw.tour.v1");
                  } catch {
                    /* nothing stored to clear */
                  }
                  window.location.reload();
                }}
                title="Change how the console is ordered for you"
              >
                {ROLE_META[role].label}
              </button>
            )}
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
