"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Hash, Loader2, Lock, Megaphone, Plus, Search, Users } from "lucide-react";
import { CHANNELS, DMS, dmSlug } from "./fixtures";
import { Failed, Modal, Skeleton, errText, toast } from "./kit";
import { initials } from "./ui";
import { useProgrammeChannels } from "./collab";
import { announceChannel, announceDm, createChannel, openDm, useChannels, useDms, useLive, useOrgPeople, useUnread, type Channel, type Workspace } from "./live";
import "./css/conversations.css";

/* Starting conversations: a new channel, a new direct message, and (on phones and tablets, where the sidebar is hidden)
   the list of every channel and direct message. One host, mounted once in the frame, opens whichever is asked for, so the
   sidebar, a channel page and the phone list all open the same dialogs. */

/* ── Names ─────────────────────────────────────────────────────────── */

/** The database's word for someone who has not added a name. It is never shown as if it were a name. */
export const UNNAMED = "A colleague";
const NOT_ADDED = " (name not added)";
/** In a list that shows the role on its own line, someone without a name is just this. */
const MISSING = "Name not added";
const ROLE_WORD: Record<string, string> = { admin: "lead", coordinator: "coordinator", veterinarian: "veterinarian", member: "member", lead: "lead", clinician: "clinician", nurse: "nurse", lab_scientist: "laboratory scientist", analyst: "analyst", field: "field team", reviewer: "reviewer" };
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
/** A role as people say it: "Lead", "Laboratory scientist". */
export const roleWord = (role?: string | null) => (role ? cap(ROLE_WORD[role] ?? role.replace(/_/g, " ")) : "");
export const isUnnamed = (name?: string | null) => !name || !name.trim() || name.trim() === UNNAMED;
/** A person's name as it should read. Someone without a name is shown by their role, and says so, so two such people can be told apart. */
export function personName(name: string | null | undefined, role?: string | null) {
  if (!isUnnamed(name)) return name!.trim();
  return `${roleWord(role) || "Member"}${NOT_ADDED}`;
}
/** Letters for a person's round mark; a question mark when they have no name. */
/** True for a label made by personName for someone without a name. */
export const nameMissing = (label: string) => label.endsWith(NOT_ADDED) || label === MISSING;
export const faceOf = (label: string) => (nameMissing(label) ? "?" : initials(label.replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")) || "?");

/** A channel name as the database keeps it: small letters, numbers and single dashes. */
export const slugify = (raw: string) => raw.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
/** What #general is for, written once so the sidebar and the channel page set it up the same way. */
export const GENERAL_PURPOSE = "News, questions and handovers for everyone in the organisation";

/* ── Asking for a dialog ───────────────────────────────────────────── */

export type Ask = { kind: "channel"; name?: string } | { kind: "message" } | { kind: "list" };
/** Open "New channel", "New message" or the list of conversations from anywhere in the app. */
export const newConversation = (a: Ask) => window.dispatchEvent(new CustomEvent<Ask>("nx:conversation", { detail: a }));

/** Mounted once in the frame. */
export function ConversationHost() {
  const live = useLive();
  const router = useRouter();
  const [ask, setAsk] = useState<Ask | null>(null);
  useEffect(() => {
    const on = (e: Event) => setAsk((e as CustomEvent<Ask>).detail);
    window.addEventListener("nx:conversation", on); return () => window.removeEventListener("nx:conversation", on);
  }, []);
  if (!ask) return null;
  const org = live.ready ? live.org : null;
  const close = () => setAsk(null);
  const go = (href: string) => { setAsk(null); router.push(href); };
  if (ask.kind === "channel") return <NewChannel key="channel" org={org} signedIn={live.signedIn} initial={ask.name ?? ""} onClose={close} onDone={go} />;
  if (ask.kind === "message") return <NewMessage key="message" org={org} me={live.userId} onClose={close} onDone={go} />;
  return <AllConversations key="list" org={org} onClose={close} onAsk={setAsk} />;
}

/** Focus a field once its dialog has taken focus, so closing the dialog still returns focus to what opened it. */
function useFocusFirst<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { const t = window.setTimeout(() => ref.current?.focus(), 0); return () => window.clearTimeout(t); }, []);
  return ref;
}

/* ── New channel ───────────────────────────────────────────────────── */

type Check = { text: string; bad: boolean; ready: boolean };
function checkName(raw: string, slug: string, taken: Channel | undefined): Check {
  if (!raw.trim()) return { text: "Small letters, numbers and dashes. Spaces become dashes.", bad: false, ready: false };
  if (!slug) return { text: "Use English letters or numbers in the name.", bad: true, ready: false };
  if (slug.length < 2) return { text: "Use at least 2 letters or numbers.", bad: true, ready: false };
  if (slug.length > 40) return { text: `Make it shorter: 40 letters at most. This one has ${slug.length}.`, bad: true, ready: false };
  if (taken) return { text: taken.kind === "channel" || taken.kind === "announcement" ? `#${slug} already exists.` : "That name is already used. Choose another.", bad: true, ready: false };
  return { text: `It will be called #${slug}.`, bad: false, ready: true };
}

function NewChannel({ org, signedIn, initial, onClose, onDone }: { org: Workspace | null; signedIn: boolean; initial: string; onClose: () => void; onDone: (href: string) => void }) {
  const chans = useChannels(org?.org_id ?? null);
  const people = useOrgPeople(org?.org_id ?? null);
  const [raw, setRaw] = useState(initial);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useFocusFirst<HTMLInputElement>();
  const ids = { form: useId(), name: useId(), check: useId(), purpose: useId() };
  const slug = slugify(raw);
  const existing: Channel[] = org ? chans.rows ?? [] : CHANNELS.map((c) => ({ id: c.name, name: c.name, topic: null, kind: "channel" }));
  const taken = existing.find((c) => c.name === slug);
  const check = checkName(raw, slug, taken);
  const can = !!org && check.ready && chans.rows !== null && !busy;
  const n = people.rows?.length ?? 0;
  const submit = async () => {
    if (!can || !org) return;
    setBusy(true); setErr(null);
    const r = await createChannel(org.org_id, slug, purpose.trim());
    setBusy(false);
    const row = r.data as Channel | null;
    if (r.error || !row) { setErr(r.error?.code === "23505" ? `#${slug} already exists. Choose another name.` : errText(r.error ?? "")); return; }
    announceChannel({ ...row, org_id: org.org_id });
    toast({ text: `#${slug} is ready. Everyone in ${org.name} can read it.`, tone: "ok" });
    onDone(`/channels/${slug}`);
  };
  return (
    <Modal title="New channel" onClose={onClose} foot={<>
      <button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button>
      {org ? <button type="submit" form={ids.form} className="nx-btn" disabled={!can}>{busy ? <Loader2 size={14} className="nx-spin" /> : null}{busy ? "Creating…" : check.ready ? `Create #${slug}` : "Create channel"}</button>
        : <Link className="nx-btn" href={signedIn ? "/start" : "/sign-in?next=/home"}>{signedIn ? "Join an organisation" : "Sign in to create"}</Link>}
    </>}>
      <form id={ids.form} className="cx-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <p className="cx-lede">A channel is one shared conversation for a topic, a place or a team.</p>
        <div className="cx-field">
          <label htmlFor={ids.name}>Name</label>
          <div className={`cx-box ${check.bad ? "is-bad" : ""}`}>
            <Hash size={16} aria-hidden />
            <input ref={box} id={ids.name} value={raw} onChange={(e) => { setRaw(e.target.value); setErr(null); }} maxLength={60} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby={ids.check} aria-invalid={check.bad || undefined} placeholder="for example field-team" />
          </div>
          <p id={ids.check} className={`cx-check ${check.bad ? "is-bad" : check.ready ? "is-ok" : ""}`} aria-live="polite">
            {check.text}{taken && (taken.kind === "channel" || taken.kind === "announcement") && org ? <> <Link href={`/channels/${taken.name}`} onClick={onClose}>Open #{taken.name}</Link></> : null}
          </p>
        </div>
        <div className="cx-field">
          <label htmlFor={ids.purpose}>What it is for <span>(optional)</span></label>
          <div className="cx-box"><input id={ids.purpose} value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={200} autoComplete="off" /></div>
          <p className="cx-check">One line, shown under the channel name.</p>
        </div>
        <div className="cx-who">
          <Users size={16} aria-hidden />
          <div><b>Who can read it</b>
            {org ? <p>Everyone in {org.name} can read and post{n ? <>: {n} {n === 1 ? "person" : "people"} now</> : null}, and anyone who joins later.</p>
              : <p>Channels belong to an organisation. This is sample data, so nothing is created here.</p>}
          </div>
        </div>
        {err ? <p className="cx-err" role="alert">{err}</p> : null}
      </form>
    </Modal>
  );
}

/* ── New message ───────────────────────────────────────────────────── */

type Candidate = { id: string; raw: string; name: string; role: string; talked: boolean; last: string | null };

function NewMessage({ org, me, onClose, onDone }: { org: Workspace | null; me: string | null; onClose: () => void; onDone: (href: string) => void }) {
  const people = useOrgPeople(org?.org_id ?? null);
  const dms = useDms(org?.org_id ?? null);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const box = useFocusFirst<HTMLInputElement>();
  const listId = useId();
  const list = useMemo<Candidate[]>(() => {
    if (!org) return DMS.map((d) => ({ id: d.name, raw: d.name, name: d.name, role: "", talked: true, last: null }));
    const talked = new Map((dms.rows ?? []).map((d) => [d.other_id, d.last_at]));
    return (people.rows ?? []).filter((p) => p.user_id !== me)
      .map((p) => ({ id: p.user_id, raw: p.name, name: isUnnamed(p.name) ? MISSING : p.name.trim(), role: roleWord(p.role), talked: talked.has(p.user_id), last: talked.get(p.user_id) ?? null }))
      .sort((a, b) => Number(b.talked) - Number(a.talked) || (b.last ?? "").localeCompare(a.last ?? "") || a.name.localeCompare(b.name));
  }, [org, people.rows, dms.rows, me]);
  const words = q.trim().toLowerCase();
  const shown = (words ? list.filter((p) => `${p.name} ${p.role}`.toLowerCase().includes(words)) : list).slice(0, 60);
  const pick = async (p: Candidate | undefined) => {
    if (!p || busy) return;
    if (!org) { onDone(`/channels/${dmSlug(p.name)}`); return; }
    setBusy(p.id);
    const r = await openDm(org.org_id, p.id);
    setBusy(null);
    if (r.error || !r.name || !r.id) { toast({ text: r.error ? errText(r.error) : "That conversation could not be opened. Try again.", tone: "bad" }); return; }
    announceChannel({ id: r.id, name: r.name, topic: null, kind: "dm", org_id: org.org_id });
    announceDm({ channel_id: r.id, other_id: p.id, other_name: p.raw, last_at: p.last, org_id: org.org_id });
    onDone(`/channels/${r.name}`);
  };
  const loading = !!org && people.rows === null && !people.error;
  return (
    <Modal title="New message" onClose={onClose}>
      <div className="cx-box cx-search">
        <Search size={16} aria-hidden />
        <input ref={box} value={q} onChange={(e) => { setQ(e.target.value); setAt(0); }} placeholder="Search by name or role" aria-label="Find a person" autoComplete="off"
          role="combobox" aria-expanded aria-controls={listId} aria-activedescendant={shown[at] ? `${listId}-${at}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(shown.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void pick(shown[at]); }
          }} />
      </div>
      {org && people.error ? <Failed error={errText(people.error)} retry={people.reload} />
        : loading ? <Skeleton rows={4} label="Reading people" />
        : <div id={listId} role="listbox" aria-label={org ? `People in ${org.name}` : "Sample people"} className="cx-people">
          {shown.map((p, i) => (
            <button key={p.id} id={`${listId}-${i}`} type="button" role="option" aria-selected={i === at} className={`cx-person ${i === at ? "is-at" : ""}`} disabled={!!busy} onMouseMove={() => setAt(i)} onClick={() => void pick(p)}>
              <span className="cx-av" aria-hidden>{faceOf(p.name)}</span>
              <span className="cx-pn"><b>{p.name}</b>{p.role ? <small>{p.role}</small> : null}</span>
              <span className="cx-verb">{busy === p.id ? <Loader2 size={14} className="nx-spin" /> : <>{p.talked ? "Open" : "Start"}<ArrowRight size={14} aria-hidden /></>}</span>
            </button>
          ))}
          {!shown.length ? <p className="cx-none">{words ? <>No one in {org?.name ?? "the sample"} matches “{q.trim()}”.</> : <>You are the only person in {org?.name} so far.{org?.workspace === "ngo" ? <> <Link href="/ngo/team" onClick={onClose}>Invite your team</Link> to message them here.</> : " People who join can be messaged here."}</>}</p> : null}
        </div>}
      <p className="cx-private"><Lock size={14} aria-hidden /><span>Only the two of you can read a direct message. Kaju is not part of it.</span></p>
    </Modal>
  );
}

/* ── Every conversation (phones and tablets) ───────────────────────── */

function AllConversations({ org, onClose, onAsk }: { org: Workspace | null; onClose: () => void; onAsk: (a: Ask) => void }) {
  const path = usePathname();
  const chans = useChannels(org?.org_id ?? null);
  const dms = useDms(org?.org_id ?? null);
  const progs = useProgrammeChannels(!!org);
  const unread = useUnread(org?.org_id ?? null, path);
  const people = useOrgPeople(org && dms.rows?.some((d) => isUnnamed(d.other_name)) ? org.org_id : null);
  const nameOf = (id: string) => chans.rows?.find((c) => c.id === id)?.name ?? null;
  type Row = { key: string; href: string; label: string; n: number; icon: "hash" | "megaphone" | "users" | "face" };
  const channels: Row[] | null = org ? chans.rows?.filter((c) => c.kind === "channel" || c.kind === "announcement").map((c): Row => ({ key: c.id, href: `/channels/${c.name}`, label: c.name, n: unread[c.id] ?? 0, icon: c.kind === "announcement" ? "megaphone" : "hash" })) ?? null
    : CHANNELS.map((c): Row => ({ key: c.name, href: `/channels/${c.name}`, label: c.name, n: c.unread, icon: "hash" }));
  const programme: Row[] = org ? (progs ?? []).map((c): Row => ({ key: c.id, href: `/channels/${c.name}`, label: c.name, n: 0, icon: "users" })) : [];
  const direct: Row[] | null = org ? (dms.rows && chans.rows ? [...dms.rows].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? "")).flatMap((d) => { const name = nameOf(d.channel_id); return name ? [{ key: d.channel_id, href: `/channels/${name}`, label: personName(d.other_name, people.rows?.find((p) => p.user_id === d.other_id)?.role), n: unread[d.channel_id] ?? 0, icon: "face" } satisfies Row] : []; }) : null)
    : DMS.map((d): Row => ({ key: d.name, href: `/channels/${dmSlug(d.name)}`, label: d.name, n: 0, icon: "face" }));
  const row = (r: Row) => {
    const on = path === r.href;
    const n = on ? 0 : r.n;
    return (
      <li key={r.key}><Link href={r.href} onClick={onClose} className={`cx-row ${on ? "is-on" : ""} ${n ? "is-unread" : ""}`} aria-current={on ? "page" : undefined} aria-label={n ? `${r.icon === "face" ? r.label : `#${r.label}`}, ${n} unread` : undefined}>
        {r.icon === "face" ? <span className="cx-av is-s" aria-hidden>{faceOf(r.label)}</span> : <span className="cx-ic" aria-hidden>{r.icon === "megaphone" ? <Megaphone size={16} /> : r.icon === "users" ? <Users size={16} /> : <Hash size={16} />}</span>}
        <span className="cx-rn">{r.label}</span>{n ? <i>{n}</i> : null}
      </Link></li>
    );
  };
  return (
    <Modal title="Conversations" onClose={onClose}>
      <div className="cx-acts">
        <button type="button" className="nx-btn is-quiet" onClick={() => onAsk({ kind: "channel" })}><Plus size={14} />New channel</button>
        <button type="button" className="nx-btn is-quiet" onClick={() => onAsk({ kind: "message" })}><Plus size={14} />New message</button>
      </div>
      <nav aria-label="All conversations" className="cx-all">
        <h3 className="cx-group">Channels</h3>
        {channels === null ? <Skeleton rows={2} label="Reading channels" /> : channels.length ? <ul className="cx-list">{channels.map(row)}</ul>
          : <p className="cx-none">No channels yet. <Link href="/channels/general" onClick={onClose}>Set up #general</Link></p>}
        {programme.length ? <><h3 className="cx-group">Programme channels</h3><ul className="cx-list">{programme.map(row)}</ul></> : null}
        <h3 className="cx-group">Direct messages</h3>
        {direct === null ? <Skeleton rows={2} label="Reading direct messages" /> : direct.length ? <ul className="cx-list">{direct.map(row)}</ul>
          : <p className="cx-none">No direct messages yet. Use New message to write to one person.</p>}
      </nav>
    </Modal>
  );
}
