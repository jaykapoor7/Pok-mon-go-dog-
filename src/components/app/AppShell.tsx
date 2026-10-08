"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ArrowLeft, Menu, Search } from "lucide-react";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { Welcome } from "./Welcome";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { readStoredRole } from "@/lib/roles";
import { SX_FONTS } from "@/components/shell/fonts";
import { SPACES, currentOf, rememberSpace, rememberedSpace, spaceFor, type Space } from "@/components/shell/spaces";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { AccountMenu, MoreSheet, SpaceMenu } from "@/components/shell/Menus";
import "./app.css";
/* Earlier content layers. Their .spa-scoped overrides no longer match (the
   shell no longer carries .spa); their standalone component classes still
   serve pages that have not been rebuilt. */
import "./editorial.css";
import "./desk.css";
import "./institution.css";
import "./street-os.css";
import "@/components/shell/shell.css";

/* ════════════════════════════════════════════════════════════════════
   The StrayPaw app shell.

   One ink bar, continuous with the landing page's navigation, so pressing
   "Open app" feels like walking further into the same place rather than
   into somebody else's dashboard. It carries the space you are in, its
   handful of destinations, search, the one primary action and you.
   Everything else — the long tail of an organisation's tools, other
   spaces, the language, feedback — is one press away, never permanently
   on screen.

   On a phone the destinations move to a thumb bar with the primary action
   at its centre, and the top bar becomes a back button on any page that is
   not a destination in its own right.
   ════════════════════════════════════════════════════════════════════ */

const InShell = createContext(false);

export function AppShell({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const nested = useContext(InShell);
  const pathname = usePathname();
  const router = useRouter();
  const [space, setSpace] = useState<Space>(() => spaceFor(pathname, null, null));
  const [cmd, setCmd] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const next = spaceFor(pathname, rememberedSpace(), readStoredRole());
    setSpace(next);
    rememberSpace(next);
  }, [pathname]);

  /* ⌘K / Ctrl-K or "/" opens search from anywhere that is not a text field. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(true); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setMore(false); }, [pathname]);
  const closeCmd = useCallback(() => setCmd(false), []);
  const closeMore = useCallback(() => setMore(false), []);
  const pick = useCallback((s: Space) => { rememberSpace(s); setSpace(s); }, []);

  if (nested) return <>{children}</>;

  const def = SPACES[space];
  const current = currentOf(def.nav, pathname, def.home);
  const isCurrent = (href: string) => href === current;
  const isDestination = def.nav.some((n) => n.href === pathname) || pathname === def.home;
  const isReporting = pathname === "/report" || pathname.startsWith("/report/");
  const phoneNav = def.phone.map((href) => def.nav.find((n) => n.href === href)).filter((n): n is NonNullable<typeof n> => !!n);
  const left = def.action ? phoneNav.slice(0, 2) : phoneNav.slice(0, 4);
  const right = def.action ? phoneNav.slice(2, 3) : [];

  function back() {
    if (window.history.length > 1) router.back();
    else router.push(def.home);
  }

  return (
    <InShell.Provider value={true}>
      <div className={`sx spa-scope ${SX_FONTS}${flush ? " is-flush" : ""}${isReporting ? " is-reporting" : ""}`} data-space={space}>
        <Welcome />
        <a href="#spa-main" className="sx-skip">Skip to content</a>

        <header className="sx-bar">
          <div className="sx-bar-in">
            {!isDestination && <button type="button" className="sx-back" onClick={back} aria-label="Back"><ArrowLeft size={20} /></button>}
            <Link href={def.home} className={`sx-brand${!isDestination ? " has-back" : ""}`} aria-label={`StrayPaw ${def.label} home`}>
              <StrayPawMark size={30} />
              <span className="sx-brand-t">StrayPaw</span>
            </Link>
            <div className="sx-space-slot"><SpaceMenu space={space} onPick={pick} /></div>

            <nav className="sx-nav" aria-label={`${def.label} destinations`}>
              {def.nav.map(({ href, label }) => (
                <Link key={href} href={href} prefetch aria-current={isCurrent(href) ? "page" : undefined}>{label}</Link>
              ))}
            </nav>

            <div className="sx-bar-end">
              <button type="button" className="sx-find" onClick={() => setCmd(true)} aria-label="Search animals, places and organisations" aria-keyshortcuts="Control+K Meta+K /">
                <Search size={16} aria-hidden /><span className="sx-find-t">Search</span><kbd className="sx-find-k">⌘K</kbd>
              </button>
              <div className="sx-lang"><LanguageSwitcher /></div>
              {def.action && !isReporting && (
                <Link href={def.action.href} className="sx-action"><def.action.Icon size={16} aria-hidden /><span>{def.action.label}</span></Link>
              )}
              <AccountMenu />
            </div>
          </div>
        </header>

        <main id="spa-main" className="sx-main">{children}</main>

        {!flush && (
          <footer className="sx-foot">
            <p>StrayPaw holds recorded animals, cases and care from many sources. Counts are records, never a population estimate.</p>
            <div>
              <FeedbackButton label="Send feedback" />
              <Link href="/data-governance">Data governance</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/">Main site</Link>
            </div>
          </footer>
        )}

        <nav className="sx-tabs" aria-label={`${def.label} navigation`}>
          {left.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined}><Icon size={22} strokeWidth={1.8} /><span>{label}</span></Link>)}
          {def.action && !isReporting && <Link href={def.action.href} className="sx-tabs-action" aria-label={def.action.label}><span className="sx-tabs-disc"><def.action.Icon size={22} /></span><span>{def.action.short}</span></Link>}
          {def.action && isReporting && <span className="sx-tabs-gap" aria-hidden />}
          {right.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined}><Icon size={22} strokeWidth={1.8} /><span>{label}</span></Link>)}
          <button type="button" aria-haspopup="dialog" aria-expanded={more} onClick={() => setMore(true)}><Menu size={22} strokeWidth={1.8} /><span>More</span></button>
        </nav>

        <MoreSheet open={more} onClose={closeMore} space={space} nav={def.nav} isCurrent={isCurrent} more={def.more} onPick={pick} />
        <CommandPalette open={cmd} onClose={closeCmd} jumps={[...(def.action ? [{ href: def.action.href, label: def.action.label, Icon: def.action.Icon, detail: "The primary action in this space" }] : []), ...def.nav.map((n) => ({ ...n, detail: `${def.label}` }))]} />
      </div>
    </InShell.Provider>
  );
}
