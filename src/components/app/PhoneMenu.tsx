"use client";

/* ════════════════════════════════════════════════════════════════════
   Everything, on a phone.

   The phone bar has room for three places around Report. Everything else
   the desk rail and the workspace tabs carry (an organisation's cases,
   drives, imports, volunteers, settings; the community's insights and
   partner NGOs; switching space; the language; the account) used to have
   no way in on a phone at all. This sheet is that way in: one tap from
   any screen, every section, grouped the way the desk groups them.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";
import { ArrowUpRight, Plus, Radio, Database, Repeat2, X } from "lucide-react";
import { CONSOLE_GROUPS } from "@/components/partner/PartnerTabs";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { ProfilePanel } from "./ProfilePanel";
import { openTour } from "./Welcome";

type NavItem = { href: string; label: string; Icon: ComponentType<{ size?: number }> };

/* Routes an organisation has that no tab names. */
const NGO_MORE = [
  { href: "/partner/medical", label: "Medical" },
  { href: "/partner/feeding", label: "Feeding" },
  { href: "/partner/fundraising", label: "Fundraising" },
  { href: "/partner/stories", label: "Stories" },
  { href: "/partner/resources", label: "Resources" },
  { href: "/partner/reports", label: "Reports" },
];

const ON_STRAYPAW = [
  { href: "/fundraisers", label: "Fundraisers" },
  { href: "/programmes", label: "Programmes" },
  { href: "/feeding", label: "Feeding spots" },
  { href: "/help", label: "Help nearby" },
];

const PUBLIC = [
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
  { href: "/education", label: "Education" },
  { href: "/for-ngos", label: "For NGOs" },
  { href: "/for-governments", label: "Municipalities" },
];

export function PhoneMenu({ open, onClose, nav, spaceLabel, isNgo, isActive }: {
  open: boolean;
  onClose: () => void;
  nav: NavItem[];
  spaceLabel: string;
  isNgo: boolean;
  isActive: (href: string) => boolean;
}) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);
  const here = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /* A route change is the answer to the menu; close it. */
  useEffect(() => {
    const didNavigate = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (didNavigate && open) onClose();
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    sheet.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const extras = ON_STRAYPAW.filter((x) => !nav.some((n) => n.href === x.href));

  return (
    <div className="pm" role="dialog" aria-modal="true" aria-label="All sections">
      <button type="button" className="pm-scrim" aria-label="Close menu" onClick={onClose} />
      <div className="pm-sheet" ref={sheet} tabIndex={-1}>
        <div className="pm-head">
          <span className="pm-grip" aria-hidden />
          <p className="pm-kicker">{spaceLabel}</p>
          <button type="button" className="pm-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <nav className="pm-tiles" aria-label={`${spaceLabel} sections`}>
          {nav.map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>
          ))}
        </nav>

        {isNgo && <>
          <div className="pm-start">
            <Link href="/partner/cases/new" className="is-primary"><Plus size={16} />New rescue case</Link>
            <Link href="/report"><Radio size={15} />Report a dog</Link>
            <Link href="/partner/import"><Database size={15} />Import workbook</Link>
          </div>
          {CONSOLE_GROUPS.map((g) => (
            <section key={g.id} className="pm-group">
              <h3>{g.label}</h3>
              <div className="pm-links">
                {g.tabs.map((t) => <Link key={t.href} href={t.href} aria-current={here(t.href) ? "page" : undefined}>{t.label}</Link>)}
              </div>
            </section>
          ))}
          <section className="pm-group">
            <h3>More in the workspace</h3>
            <div className="pm-links">
              {NGO_MORE.map((t) => <Link key={t.href} href={t.href} aria-current={here(t.href) ? "page" : undefined}>{t.label}</Link>)}
            </div>
          </section>
        </>}

        {!isNgo && extras.length > 0 && (
          <section className="pm-group">
            <h3>On StrayPaw</h3>
            <div className="pm-links">
              {extras.map((t) => <Link key={t.href} href={t.href} aria-current={here(t.href) ? "page" : undefined}>{t.label}</Link>)}
            </div>
          </section>
        )}

        <section className="pm-group pm-account">
          <h3>You</h3>
          <ProfilePanel onNavigate={onClose} />
        </section>

        <div className="pm-row">
          <LanguageSwitcher />
          <button type="button" className="pm-chip" onClick={() => { onClose(); openTour(); }}><Repeat2 size={15} />Switch space</button>
          <div className="pm-feedback"><FeedbackButton label="Send feedback" /></div>
        </div>

        <section className="pm-group pm-site">
          <h3>The main site</h3>
          <div className="pm-links">
            <Link href="/">Home <ArrowUpRight size={13} /></Link>
            {PUBLIC.map((t) => <Link key={t.href} href={t.href}>{t.label}</Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}
