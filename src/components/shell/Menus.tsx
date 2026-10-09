"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, Binoculars, BookOpen, Bookmark, Building2, ChartColumn, Check, ChevronDown, Circle, ClipboardCheck, ClipboardList, FlaskConical, FolderKanban, GraduationCap, HandCoins, HandHeart, HelpCircle, Inbox, KeyRound, Layers, LifeBuoy, ListChecks, LogOut, Map as MapIcon, PawPrint, Repeat2, Scale, Search, Settings, ShieldCheck, Stethoscope, Syringe, Upload, UserPlus, Users, Utensils, X, type LucideIcon } from "lucide-react";
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
      <Link href="/access" onClick={onNavigate} className="sx-acct-entry"><KeyRound size={16} aria-hidden /><span><b>Sign up</b><small>Get a personal code by email</small></span></Link>
      <Link href="/join" onClick={onNavigate} className="sx-acct-entry"><KeyRound size={16} aria-hidden /><span><b>I have a code</b><small>Enter the code you were given</small></span></Link>
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

/** The phone's "More": one screen. Spaces as a row, everything not on the
 *  tab bar as a grid of tiles, then you, language and feedback in one line. */
export function MoreSheet({ open, onClose, space, nav, isCurrent, more, onPick, children }: {
  open: boolean; onClose: () => void; space: Space; nav: NavItem[]; isCurrent: (href: string) => boolean;
  more: MoreGroup[]; onPick: (s: Space) => void; children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const who = useWho();
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);
  const onBar = new Set(SPACES[space].phone);
  const seen = new Set<string>();
  const tiles = [
    ...nav.filter((n) => !onBar.has(n.href)).map((n) => ({ href: n.href, label: n.label, Icon: n.Icon as LucideIcon })),
    ...more.flatMap((g) => g.links.map((l) => ({ href: l.href, label: l.label, Icon: iconFor(l.href) }))),
  ].filter((t) => (seen.has(t.href) ? false : (seen.add(t.href), true)));
  return (
    <dialog ref={dialog} className="sx-sheet sx-sheet2" aria-label="Everything in StrayPaw" onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div className="sx-sheet-in">
        <header className="sx-sheet-head">
          <span className="sx-grip" aria-hidden />
          <h2>More</h2>
          <button type="button" className="sx-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <nav className="sx-sheet-sp" aria-label="Switch space">
          {SPACE_ORDER.map((s) => <Link key={s} href={SPACES[s].home} aria-current={s === space ? "true" : undefined} onClick={() => { onPick(s); onClose(); }}>{SPACES[s].label}</Link>)}
        </nav>
        <nav className="sx-sheet-tiles" aria-label={`${SPACES[space].label}: more`}>
          {tiles.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={onClose} aria-current={isCurrent(href) ? "page" : undefined}>
              <span className="sx-tile-ic"><Icon size={19} aria-hidden /></span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        {children}
        <div className="sx-sheet-me">
          {who.isAuthed ? (
            <>
              <span className="sx-avatar" aria-hidden>{who.name.slice(0, 1).toUpperCase()}</span>
              <span className="sx-me-t"><b>{who.name}</b><small>{who.profile?.org_name ?? who.user?.email ?? ""}</small></span>
              <button type="button" className="sx-me-btn" onClick={who.signOut} aria-label="Sign out"><LogOut size={17} /></button>
            </>
          ) : who.volunteer ? (
            <>
              <span className="sx-avatar" aria-hidden>{(who.volunteer.name || "V").slice(0, 1).toUpperCase()}</span>
              <span className="sx-me-t"><b>{who.volunteer.name || "Volunteer"}</b><small>For {who.volunteer.orgName}</small></span>
              <button type="button" className="sx-me-btn" onClick={() => { clearVolunteer(); who.setVolunteer(null); }} aria-label="Stop reporting for this organisation"><LogOut size={17} /></button>
            </>
          ) : (
            <>
              <Link href="/access" onClick={onClose} className="sx-me-pill is-main">Sign up</Link>
              <Link href="/join" onClick={onClose} className="sx-me-pill">I have a code</Link>
            </>
          )}
        </div>
        <div className="sx-sheet-row">
          <LanguageSwitcher />
          <FeedbackButton label="Feedback" />
          <Link href="/faq" onClick={onClose}>Help</Link>
          <Link href="/" onClick={onClose}>Main site <ArrowUpRight size={13} aria-hidden /></Link>
        </div>
      </div>
    </dialog>
  );
}
