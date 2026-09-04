"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode, useRef, type FormEvent } from "react";
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
  Users,
  Wrench,
  X,
} from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import "./app.css";

/* Everyone sees these. The console is one view — community reporters and NGO
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
];

export function AppShell({
  children,
  flush = false,
}: {
  children: ReactNode;
  flush?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/map?q=${encodeURIComponent(q)}`);
    setQuery("");
    searchRef.current?.blur();
  }

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <div className="spa">
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
          <span>straypaw</span>
          <small>console</small>
        </Link>

        <form className="spa-search" onSubmit={handleSearch} role="search">
          <Search size={13} />
          <input
            ref={searchRef}
            placeholder="Location, animal ID, org…"
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>

        <div className="spa-top-right">
          <Link href="/" className="spa-exit">
            <ArrowUpRight size={13} /> Main site
          </Link>
        </div>
      </div>

      <div className="spa-body">
        <nav className={`spa-side ${open ? "open" : ""}`}>
          <div className="spa-live">
            <i /> Live network
          </div>

          {COMMUNITY.map(({ href, label, Icon }) => (
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
          {EVIDENCE.map(({ href, label, Icon }) => (
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
          {WORKSPACE.map(({ href, label, Icon }) => (
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
          </div>
        </nav>

        <main id="spa-main" className={`spa-main ${flush ? "flush" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
