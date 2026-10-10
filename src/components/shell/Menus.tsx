"use client";

import Link from "next/link";
import { LatestOnRecord } from "@/components/shell/LatestOnRecord";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, ChevronRight, Binoculars, BookOpen, Bookmark, Building2, ChartColumn, Check, ChevronDown, Circle, ClipboardCheck, ClipboardList, FlaskConical, FolderKanban, GraduationCap, HandCoins, HandHeart, HelpCircle, Inbox, KeyRound, Layers, LifeBuoy, ListChecks, LogOut, Map as MapIcon, PawPrint, Repeat2, Scale, Search, Settings, ShieldCheck, Stethoscope, Syringe, Upload, UserPlus, Users, Utensils, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { myProfile, type Profile } from "@/lib/programme";
import { readVolunteer, clearVolunteer, type VolunteerSession } from "@/lib/volunteer";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { openTour } from "@/components/app/Welcome";
import { SPACES, SPACE_ORDER, type Space, type MoreGroup, type NavItem } from "./spaces";

/** A disclosure that closes on outside press and Escape, returning focus. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [open]);
  return { open, setOpen, root, trigger };
}

/* ── which part of StrayPaw you are in ───────────────────────────────── */
export function SpaceMenu({ space, onPick }: { space: Space; onPick: (s: Space) => void }) {
  const { open, setOpen, root, trigger } = usePopover();
  const id = useId();
  return (
    <div className="sx-pop" ref={root}>
      <button ref={trigger} type="button" className="sx-space" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span className="sx-space-k">Space</span>
        <span className="sx-space-v">{SPACES[space].label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div id={id} className="sx-pop-panel sx-space-panel" role="menu" aria-label="Switch space">
          {SPACE_ORDER.map((s) => (
            <Link key={s} role="menuitemradio" aria-checked={s === space} href={SPACES[s].home} onClick={() => { onPick(s); setOpen(false); }} className={s === space ? "is-on" : ""}>
              <span><b>{SPACES[s].label}</b><small>{SPACES[s].blurb}</small></span>
              {s === space && <Check size={16} aria-hidden />}
            </Link>
          ))}
          <div className="sx-pop-foot">
            <button type="button" onClick={() => { setOpen(false); openTour(); }}><Repeat2 size={14} aria-hidden /> Show the introduction</button>
            <Link href="/" onClick={() => setOpen(false)}>Main site <ArrowUpRight size={13} aria-hidden /></Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── who you are ─────────────────────────────────────────────────────── */
function useWho() {
  const { user, isAuthed, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  useEffect(() => { setVolunteer(readVolunteer()); }, []);
  useEffect(() => {
    let live = true;
    if (!isAuthed) { setProfile(null); return; }
    myProfile().then((p) => live && setProfile(p)).catch(() => live && setProfile(null));
    return () => { live = false; };
  }, [isAuthed]);
  const name = profile?.name?.trim() || user?.name?.trim() || user?.email || "Your account";
  return { isAuthed, signOut, profile, user, volunteer, setVolunteer, name };
}

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const who = useWho();
  if (who.isAuthed) return (
    <div className="sx-acct">
      <div className="sx-acct-who">
        <span className="sx-avatar" aria-hidden>{who.name.slice(0, 1).toUpperCase()}</span>
        <span><b>{who.name}</b><small>{who.profile?.org_name ? `${who.profile.org_name} · ${who.profile.is_lead ? "Team lead" : "Team member"}` : who.user?.email ?? "Not in an organisation"}</small></span>
      </div>
      {who.profile?.org_name
        ? <Link href="/partner/team" onClick={onNavigate}><Users size={15} aria-hidden /> Team and codes</Link>
        : <Link href="/join" onClick={onNavigate}><KeyRound size={15} aria-hidden /> Enter an organisation code</Link>}
      <Link href="/faq" onClick={onNavigate}><HelpCircle size={15} aria-hidden /> Questions</Link>
      <button type="button" onClick={who.signOut}><LogOut size={15} aria-hidden /> Sign out</button>
    </div>
  );
  if (who.volunteer) return (
    <div className="sx-acct">
      <div className="sx-acct-who">
        <span className="sx-avatar" aria-hidden>{(who.volunteer.name || "V").slice(0, 1).toUpperCase()}</span>
        <span><b>{who.volunteer.name || "Volunteer"}</b><small>Reporting for {who.volunteer.orgName}</small></span>
      </div>
      <Link href="/faq" onClick={onNavigate}><HelpCircle size={15} aria-hidden /> Questions</Link>
      <button type="button" onClick={() => { clearVolunteer(); who.setVolunteer(null); }}><LogOut size={15} aria-hidden /> Stop reporting for them</button>
    </div>
  );
  return (
    <div className="sx-acct">
      <Link href="/join" onClick={onNavigate} className="sx-acct-entry"><KeyRound size={16} aria-hidden /><span><b>Sign in</b><small>With your email and code</small></span></Link>
      <Link href="/access" onClick={onNavigate} className="sx-acct-entry"><KeyRound size={16} aria-hidden /><span><b>Email me a code</b><small>First time here, or lost yours</small></span></Link>
    </div>
  );
}

export function AccountMenu() {
  const { open, setOpen, root, trigger } = usePopover();
  const who = useWho();
  const id = useId();
  const signedIn = who.isAuthed || !!who.volunteer;
  return (
    <div className="sx-pop" ref={root}>
      <button ref={trigger} type="button" className={`sx-account ${signedIn ? "is-in" : ""}`} aria-expanded={open} aria-controls={id} aria-label={signedIn ? `Account: ${who.isAuthed ? who.name : who.volunteer?.name ?? "Volunteer"}` : "Sign in or use a code"} onClick={() => setOpen((v) => !v)}>
        {signedIn
          ? <span className="sx-avatar" aria-hidden>{(who.isAuthed ? who.name : who.volunteer?.name || "V").slice(0, 1).toUpperCase()}</span>
          : <><KeyRound size={15} aria-hidden /><span className="sx-account-t">Sign in</span></>}
      </button>
      {open && <div id={id} className="sx-pop-panel sx-pop-right" role="menu" aria-label="Account"><AccountLinks onNavigate={() => setOpen(false)} /></div>}
    </div>
  );
}

/* ── everything else, on a phone ─────────────────────────────────────── */
const TILE_ICON: [RegExp, LucideIcon][] = [
  [/review/, ClipboardCheck], [/records/, Search], [/quality/, ShieldCheck], [/import/, Upload], [/medical/, Stethoscope],
  [/incoming/, Inbox], [/drives/, Syringe], [/projects/, FolderKanban], [/surveys/, ListChecks], [/team/, Users],
  [/settings/, Settings], [/volunteers/, UserPlus], [/codes/, KeyRound], [/operations/, Activity], [/fundrais/, HandCoins],
  [/orgs|partners/, Building2], [/programmes/, Layers], [/resources/, LifeBuoy], [/feeding/, Utensils], [/help/, HandHeart],
  [/stories/, BookOpen], [/insights|reports/, ChartColumn], [/learn/, GraduationCap], [/governance/, Scale], [/research/, FlaskConical],
  [/map/, MapIcon], [/following/, Bookmark], [/field/, Binoculars], [/cases/, ClipboardList], [/animals/, PawPrint],
];
const iconFor = (href: string) => TILE_ICON.find(([re]) => re.test(href))?.[1] ?? Circle;

/* The few pages each space reaches for most; everything else is one row away. */
const TOP: Record<Space, string[]> = {
  community: ["/insights", "/help", "/feeding", "/orgs", "/resources", "/fundraisers"],
  feeder: ["/stories", "/help", "/orgs", "/resources", "/insights", "/fundraisers"],
  educator: ["/resources", "/orgs", "/help", "/feeding", "/programmes", "/fundraisers"],
  ngo: ["/partner/review", "/partner/incoming", "/partner/medical", "/partner/reports", "/partner/team", "/partner/settings"],
  city: ["/stories", "/data-governance", "/research-standards", "/resources", "/programmes", "/orgs"],
};

/** The phone's "More": a short, calm list. You, the six pages your space
 *  uses most, then "Switch space" and "All pages" as rows that open in
 *  place, and language, feedback and help as small links. */
export function MoreSheet({ open, onClose, space, nav, isCurrent, more, children }: {
  open: boolean; onClose: () => void; space: Space; nav: NavItem[]; isCurrent: (href: string) => boolean;
  more: MoreGroup[]; onPick: (s: Space) => void; children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const who = useWho();
  const [allOpen, setAllOpen] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) { el.close(); setAllOpen(false); }
  }, [open]);
  /* Only what the bar actually shows (three beside the action, else four). */
  const onBar = new Set(SPACES[space].phone.slice(0, SPACES[space].action ? 3 : 4));
  const seen = new Set<string>();
  const all = [
    ...nav.filter((n) => !onBar.has(n.href)).map((n) => ({ href: n.href, label: n.label, Icon: n.Icon as LucideIcon })),
    ...more.flatMap((g) => g.links.map((l) => ({ href: l.href, label: l.label, Icon: iconFor(l.href) }))),
  ].filter((t) => !onBar.has(t.href) && (seen.has(t.href) ? false : (seen.add(t.href), true)));
  /* The space's own destinations that do not fit on the bar come first. */
  const navHrefs = new Set(nav.map((n) => n.href));
  const rank = (h: string) => { if (navHrefs.has(h)) return -1; const i = TOP[space].indexOf(h); return i < 0 ? 99 : i; };
  const top = [...all].sort((x, y) => rank(x.href) - rank(y.href)).slice(0, 6);
  const rest = all.filter((t) => !top.includes(t));
  const row = ({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) => (
    <Link key={href} href={href} onClick={onClose} className="sx-row" aria-current={isCurrent(href) ? "page" : undefined}>
      <Icon size={18} aria-hidden /><span>{label}</span><ChevronRight size={16} aria-hidden className="sx-row-go" />
    </Link>
  );
  return (
    <dialog ref={dialog} className="sx-sheet sx-sheet3" aria-label="More" onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div className="sx-sheet-in">
        <header className="sx-sheet-head">
          <span className="sx-grip" aria-hidden />
          <h2>More</h2>
          <button type="button" className="sx-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="sx-group">
          {who.isAuthed || who.volunteer ? (
            <div className="sx-row is-me">
              <span className="sx-avatar" aria-hidden>{(who.isAuthed ? who.name : who.volunteer?.name || "V").slice(0, 1).toUpperCase()}</span>
              <span className="sx-me-t"><b>{who.isAuthed ? who.name : who.volunteer?.name || "Volunteer"}</b><small>{who.isAuthed ? (who.profile?.org_name ?? who.user?.email ?? "") : `For ${who.volunteer?.orgName ?? "an organisation"}`}</small></span>
              <button type="button" className="sx-me-out" onClick={() => { if (who.isAuthed) who.signOut(); else { clearVolunteer(); who.setVolunteer(null); } }}>Sign out</button>
            </div>
          ) : (
            <Link href="/join" onClick={onClose} className="sx-row is-me">
              <span className="sx-avatar" aria-hidden><KeyRound size={16} /></span>
              <span className="sx-me-t"><b>Sign in</b><small>With your email and code</small></span>
              <ChevronRight size={16} aria-hidden className="sx-row-go" />
            </Link>
          )}
        </div>

        <nav className="sx-group" aria-label={`${SPACES[space].label}: more pages`}>{top.map(row)}</nav>

        <div className="sx-group">
          {rest.length > 0 && (
            <button type="button" className="sx-row" aria-expanded={allOpen} onClick={() => setAllOpen((v) => !v)}>
              <Layers size={18} aria-hidden /><span>All pages</span><em>{rest.length}</em><ChevronRight size={16} aria-hidden className="sx-row-go" />
            </button>
          )}
          {allOpen && rest.map((t) => <Link key={t.href} href={t.href} onClick={onClose} className="sx-row is-sub" aria-current={isCurrent(t.href) ? "page" : undefined}><span>{t.label}</span></Link>)}
        </div>

        {children}
        <LatestOnRecord className="is-sheet" />
        <div className="sx-sheet-row">
          <LanguageSwitcher />
          <FeedbackButton label="Feedback" />
          <Link href="/faq" onClick={onClose}>Help</Link>
          <Link href="/art-credits" onClick={onClose}>Art credits</Link>
          <Link href="/" onClick={onClose}>Main site <ArrowUpRight size={13} aria-hidden /></Link>
        </div>
      </div>
    </dialog>
  );
}
