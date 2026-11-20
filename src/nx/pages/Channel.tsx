"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, AtSign, Check as Tick, CornerUpLeft, FileText, Hash, Loader2, Lock, Megaphone, MoreHorizontal, Paperclip, Pencil, Send, SmilePlus, Sparkles, Trash2, Users, X } from "lucide-react";
import { Shell } from "../Shell";
import { Check, Chip, Sample, initials } from "../ui";
import { Confirm, Skeleton, errText, toast } from "../kit";
import { CH_PEOPLE, CH_RECORDS, CH_WORK, KAJU_TASKS, MESSAGES, SAMPLE_CHATS } from "../fixtures";
import { addTasks, announceChannel, askKaju, createChannel, markRead, setTaskDone, useChannels, useDms, useLive, useOrgPeople, useTasks, type Channel as ChannelRow, type Workspace } from "../live";
import { recordHref, EMOJI, FILE_TYPES, deleteMessage, editMessage, fileLink, mentionsIn, sendMessage, uploadFile, useChannelMessages, useProgrammeChannels, useReactions, type FileRef, type Msg } from "../collab";
import { GENERAL_PURPOSE, faceOf, isUnnamed, nameMissing, newConversation, personName, roleWord } from "../conversations";
import { Sheet } from "../Phone";
import { askKaju as askKajuPrivately } from "../data/ngo";
import "../css/channel.css";
import "../css/conversations.css";

/* A channel: people talking, with the work, records and files the talk is about one tab away. Mentions notify only
   people who can read the channel; files live in the channel's private folder; edits and deletions are marked and kept
   for audit. Kaju answers when asked and creates nothing until a person accepts. */

type Tab = "Messages" | "Work" | "Records" | "Files";
type VMsg = { id: string; who: string; when: string; day?: string | null; text: string; kaju?: boolean; record?: string | null; recordHref?: string | null; tasks?: string[] | null; parent?: string | null; mine?: boolean; edited?: boolean; deleted?: boolean; files?: FileRef[] };
type VTask = { id: string; title: string; note: string; done: boolean };
type Person = { user_id: string; name: string };
type View = {
  name: string; sample: boolean; sub?: string | null; msgs: VMsg[] | null; work: VTask[]; people: string[]; mentionable: Person[];
  accepted: (m: VMsg) => boolean; onSend: (text: string, parent?: string, files?: FileRef[]) => Promise<boolean> | boolean | void; onAccept: (m: VMsg) => void; onToggle?: (t: VTask) => void; note?: string | null;
  /** Kaju's answer to a question asked with @Kaju, shown only to the person who asked (never posted to the channel). */
  privately?: { q: string; text: string | null; error: string | null } | null; onClosePrivate?: () => void;
  dm?: string | null; kind?: string; canPost?: boolean; programme?: string | null; focus?: string | null;
  /** Who can read the conversation, said in one line under its name. */
  readers?: { icon: "users" | "lock" | "megaphone"; text: string } | null;
  reactions?: { counts: (id: string) => { emoji: string; n: number; mine: boolean }[]; toggle: (id: string, e: string) => void };
  onEdit?: (m: VMsg, body: string) => Promise<boolean>; onDelete?: (m: VMsg) => Promise<boolean>; onUpload?: (f: File) => Promise<FileRef | null>;
};

/** What Kaju does in the channel itself, for everyone here: tasks from the messages, or a recap of them. Anything else
    asked with @Kaju is a question, answered for the person who asked. A bare "@Kaju" is a recap. */
const channelAsk = (q: string) => !q || /\b(tasks?|to-?dos?|actions?|recap|summar\w*|catch (?:me )?up|what did i miss|latest|what(?:'s| has| have)? (?:been )?(?:said|happen\w*|discussed)|this (?:channel|thread|conversation))\b/i.test(q);
const clock = (iso?: string) => (iso ? new Date(iso) : new Date()).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
/** The day a message was posted, as a heading between days: Today, Yesterday, then the date. */
const dayOf = (iso: string) => {
  const d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return same(d, now) ? "Today" : same(d, y) ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
};

function FileChip({ f, sample }: { f: FileRef; sample?: boolean }) {
  const [busy, setBusy] = useState(false);
  const img = /^image\//.test(f.mime ?? "");
  return <button type="button" className="nx-file" disabled={busy || sample} title={sample ? "Sample file" : "Opens a private link that works for people in this channel"} onClick={async () => { setBusy(true); const u = await fileLink(f.path); setBusy(false); if (u) window.open(u, "_blank", "noopener"); else toast({ text: "That file could not be opened.", tone: "bad" }); }}>{busy ? <Loader2 size={13} className="nx-spin" /> : img ? <FileText size={13} /> : <Paperclip size={13} />}<span>{f.name}</span>{f.size ? <small>{f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`}</small> : null}</button>;
}

/** The box for writing: @ to mention someone who can read the channel, a paperclip for files, Enter to send. */
function Composer({ v, parent, placeholder, autoFocus }: { v: View; parent?: string; placeholder: string; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [uploading, setUploading] = useState(0);
  const [at, setAt] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  /* The box grows with what is written, up to about six lines, then scrolls. */
  useLayoutEffect(() => { const t = box.current; if (!t) return; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 168)}px`; }, [text]);
  const matches = at !== null ? v.mentionable.filter((p) => p.name.toLowerCase().includes(at.toLowerCase())).slice(0, 6) : [];
  const onChange = (val: string) => { setText(val); const m = /(^|\s)@([\p{L}.\- ]{0,30})$/u.exec(val.slice(0, box.current?.selectionStart ?? val.length)); setAt(m && v.mentionable.length ? m[2] : null); };
  const choose = (p: Person) => { const cur = box.current?.selectionStart ?? text.length; const before = text.slice(0, cur).replace(/@([\p{L}.\- ]{0,30})$/u, `@${p.name} `); setText(before + text.slice(cur)); setAt(null); box.current?.focus(); };
  const send = async () => { const t = text.trim(); if ((!t && !files.length) || uploading) return; const ok = await v.onSend(t || "Shared a file", parent, files); if (ok !== false) { setText(""); setFiles([]); } };
  const add = async (list: FileList | null) => { if (!list || !v.onUpload) return; for (const f of [...list].slice(0, 10 - files.length)) { setUploading((n) => n + 1); const r = await v.onUpload(f); setUploading((n) => n - 1); if (r) setFiles((fs) => [...fs, r]); } };
  if (v.canPost === false) return <div className="nx-compose is-closed"><Megaphone size={14} /><span>Only the channel&apos;s creator and the organisation&apos;s leads post here.</span></div>;
  return (
    <form className="nx-compose" onSubmit={(e) => { e.preventDefault(); void send(); }} onDragOver={(e) => { if (v.onUpload) e.preventDefault(); }} onDrop={(e) => { if (!v.onUpload) return; e.preventDefault(); void add(e.dataTransfer.files); }}>
      {matches.length ? <ul className="nx-mention" role="listbox" aria-label="Mention someone">{matches.map((p) => <li key={p.user_id}><button type="button" role="option" aria-selected="false" onMouseDown={(e) => { e.preventDefault(); choose(p); }}><span className="nx-msg-f">{initials(p.name)}</span>{p.name}</button></li>)}</ul> : null}
      <textarea ref={box} rows={1} value={text} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} maxLength={8000} placeholder={placeholder} aria-label={placeholder}
        onKeyDown={(e) => { if (at !== null && matches.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); choose(matches[0]); return; } if (e.key === "Escape") setAt(null); if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
      {files.length || uploading ? <div className="nx-compose-files">{files.map((f) => <span key={f.path} className="nx-file is-pending"><Paperclip size={12} />{f.name}<button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((fs) => fs.filter((x) => x.path !== f.path))}><X size={11} /></button></span>)}{uploading ? <span className="nx-file is-pending"><Loader2 size={12} className="nx-spin" />Uploading…</span> : null}</div> : null}
      <div className="nx-compose-f">
        {v.dm || v.sample ? null : <button type="button" className="nx-ib ch-kaju" aria-label="Mention Kaju" title="Ask Kaju" onClick={() => setText((t) => (t ? `${t} @Kaju ` : "@Kaju turn these updates into tasks"))}><Sparkles size={15} /></button>}
        {v.mentionable.length ? <button type="button" className="nx-ib ch-at" aria-label="Mention someone" title="Mention someone" onClick={() => { setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@`); setAt(""); box.current?.focus(); }}><AtSign size={15} /></button> : null}
        {v.onUpload ? <><button type="button" className="nx-ib ch-clip" aria-label="Attach a file" title="Attach a file (10 MB at most)" onClick={() => pick.current?.click()}><Paperclip size={15} /></button><input ref={pick} type="file" hidden multiple accept={FILE_TYPES} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} /></> : null}
        <small className="nx-hide-s">Enter to send · Shift Enter for a new line</small>
        <button type="submit" className="nx-btn is-sm ch-send" style={{ marginLeft: "auto" }} aria-label={parent ? "Reply" : "Send"} disabled={(!text.trim() && !files.length) || !!uploading}><Send size={12} /><span className="ch-send-t">{parent ? "Reply" : "Send"}</span></button>
      </div>
    </form>
  );
}

function ChannelView(v: View) {
  const [tab, setTab] = useState<Tab>("Messages");
  const end = useRef<HTMLDivElement>(null);
  const calm = useReducedMotion();
  const [thread, setThread] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [react, setReact] = useState<string | null>(null);
  const [del, setDel] = useState<VMsg | null>(null);
  /* On a phone a message's reactions, reply, edit and delete open from one button as a sheet of large rows. */
  const [acts, setActs] = useState<{ m: VMsg; inThread: boolean } | null>(null);
  const closeActs = useCallback(() => setActs(null), []);
  const top = (v.msgs ?? []).filter((m) => !m.parent);
  const repliesOf = (id: string) => (v.msgs ?? []).filter((m) => m.parent === id);
  const parent = thread ? (v.msgs ?? []).find((m) => m.id === thread) ?? null : null;
  const count = top.length;
  useEffect(() => { if (v.focus) { document.getElementById(`m-${v.focus}`)?.scrollIntoView({ block: "center" }); return; } end.current?.scrollIntoView({ block: "end", behavior: calm ? "auto" : "smooth" }); }, [count, calm, v.focus]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setThread(null); setMenu(null); setReact(null); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  const files = (v.msgs ?? []).flatMap((m) => (m.files ?? []).map((f) => ({ f, m })));
  const records = (v.msgs ?? []).filter((m) => m.record).map((m) => ({ label: m.record!, href: m.recordHref ?? null, id: m.id }));
  const recordsShown = v.sample ? CH_RECORDS.map((r) => ({ label: r, href: null, id: r })) : records.filter((r, i, a) => a.findIndex((x) => x.label === r.label) === i);
  const open = v.work.filter((w) => !w.done).length;
  const tabs: [Tab, number?][] = v.dm ? [["Messages"], ["Files", files.length]] : [["Messages"], ["Work", open], ["Records", recordsShown.length], ["Files", files.length]];
  const label = v.dm ?? `#${v.name}`;

  const bubble = (m: VMsg, inThread = false) => {
    const rs = v.reactions?.counts(m.id) ?? [];
    return (
      <motion.div key={m.id} id={`m-${m.id}`} className={`nx-msg ${v.focus === m.id ? "is-focus" : ""} ${m.deleted ? "is-deleted" : ""}`} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
        <span className={`nx-msg-f ${m.kaju ? "is-kaju" : ""}`}>{m.kaju ? <Sparkles size={14} /> : initials(m.who)}</span>
        <div style={{ minWidth: 0 }}>
          <b>{m.who}</b><time>{m.when}</time>{m.edited && !m.deleted ? <small className="nx-t3"> · edited</small> : null}
          {editing?.id === m.id ? (
            <form className="nx-edit" onSubmit={async (e) => { e.preventDefault(); if (v.onEdit && (await v.onEdit(m, editing.text.trim()))) setEditing(null); }}>
              <textarea value={editing.text} autoFocus onChange={(e) => setEditing({ id: m.id, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }} aria-label="Edit message" maxLength={8000} />
              <div><button type="submit" className="nx-btn is-sm" disabled={!editing.text.trim()}>Save</button><button type="button" className="nx-btn is-quiet is-sm" onClick={() => setEditing(null)}>Cancel</button></div>
            </form>
          ) : <p style={{ whiteSpace: "pre-wrap" }} className={m.deleted ? "nx-t3" : undefined}>{m.text}</p>}
          {m.files?.length ? <div className="nx-msg-x">{m.files.map((f) => <FileChip key={f.path} f={f} sample={v.sample} />)}</div> : null}
          {m.record ? <div className="nx-msg-x">{m.recordHref ? <Link className="nx-reclink" href={m.recordHref}><ArrowUpRight size={12} />{m.record}</Link> : <span className="nx-reclink"><ArrowUpRight size={12} />{m.record}</span>}</div> : null}
          {rs.length ? <div className="nx-reacts">{rs.map((r) => <button key={r.emoji} type="button" className={r.mine ? "is-mine" : ""} aria-pressed={r.mine} aria-label={`${r.emoji} ${r.n}${r.mine ? ", including you" : ""}`} onClick={() => v.reactions?.toggle(m.id, r.emoji)}>{r.emoji}<span>{r.n}</span></button>)}</div> : null}
          {!inThread && !m.deleted ? (() => { const n = repliesOf(m.id).length; return <div className={`nx-msg-x ${n ? "" : "nx-msg-reply"}`}><button type="button" className="nx-thread" onClick={() => setThread(m.id)} aria-label={n ? `${n} ${n === 1 ? "reply" : "replies"} to ${m.who}` : `Reply to ${m.who}`}>{n ? `${n} ${n === 1 ? "reply" : "replies"}` : "Reply"}</button></div>; })() : null}
          {!inThread && m.tasks?.length ? (
            <div className="nx-prop">
              <ul>{m.tasks.map((t) => <li key={t}><span className={`nx-check ${v.accepted(m) ? "is-done" : ""}`} aria-hidden><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.4 5 8.8 9.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}</li>)}</ul>
              <div className="nx-prop-f">{v.accepted(m) ? <><Tick size={13} style={{ color: "var(--ok)" }} />Added to Work. <button type="button" className="nx-thread" onClick={() => setTab("Work")}>Open Work</button></> : <><button type="button" className="nx-btn is-sm" onClick={() => v.onAccept(m)}>Create {m.tasks.length} {m.tasks.length === 1 ? "task" : "tasks"}</button><span>Proposed from the messages above</span></>}</div>
            </div>
          ) : null}
        </div>
        {!m.deleted && (!inThread || !v.sample) ? <button type="button" className="nx-ib ch-more" aria-label={`Actions for the message from ${m.who}`} aria-haspopup="dialog" onClick={() => setActs({ m, inThread })}><MoreHorizontal size={18} aria-hidden /></button> : null}
        {!m.deleted && !v.sample ? <div className="nx-msg-tools">
          {v.reactions ? <button type="button" className="nx-ib" aria-label="React" aria-expanded={react === m.id} onClick={() => setReact(react === m.id ? null : m.id)}><SmilePlus size={14} /></button> : null}
          {m.mine && (v.onEdit || v.onDelete) ? <button type="button" className="nx-ib" aria-label="More actions" aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)}><MoreHorizontal size={14} /></button> : null}
          {react === m.id ? <div className="nx-pop" role="menu" aria-label="Reactions">{EMOJI.map((e) => <button key={e} type="button" role="menuitem" onClick={() => { v.reactions?.toggle(m.id, e); setReact(null); }}>{e}</button>)}</div> : null}
          {menu === m.id ? <div className="nx-pop is-menu" role="menu">{v.onEdit && !m.kaju ? <button type="button" role="menuitem" onClick={() => { setEditing({ id: m.id, text: m.text }); setMenu(null); }}><Pencil size={13} />Edit</button> : null}{v.onDelete ? <button type="button" role="menuitem" className="is-bad" onClick={() => { setDel(m); setMenu(null); }}><Trash2 size={13} />Delete</button> : null}</div> : null}
        </div> : null}
      </motion.div>
    );
  };
  const task = (w: VTask) => <li key={w.id} className={`nx-tr ${w.done ? "nx-row-done" : ""}`} style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}>{v.onToggle ? <Check done={w.done} onClick={() => v.onToggle!(w)} label={w.done ? `Reopen: ${w.title}` : `Mark done: ${w.title}`} /> : <span className="nx-check" aria-hidden />}<span className="nx-cell-main"><span><b>{w.title}</b><small>{w.note}</small></span></span></li>;
  const kindIcon = v.kind === "announcement" ? <Megaphone size={16} /> : v.kind === "programme" ? <Users size={16} /> : <Hash size={16} />;
  const mark = <span className={`cx-mark ${v.dm ? "is-dm" : ""}`} aria-hidden>{v.dm ? faceOf(v.dm) : kindIcon}</span>;
  const readersIcon = v.readers?.icon === "lock" ? <Lock size={12} aria-hidden /> : v.readers?.icon === "megaphone" ? <Megaphone size={12} aria-hidden /> : <Users size={12} aria-hidden />;
  /* A heading between days; sample conversations are all today. */
  const listed: ReactNode[] = top.flatMap((m, i) => (m.day && m.day !== top[i - 1]?.day ? [<p key={`day-${m.id}`} className="nx-day"><span>{m.day}</span></p>, bubble(m)] : [bubble(m)]));

  return (
    <Shell crumb={v.dm ? ["Direct messages", v.dm] : ["Channels", v.name]} flush>
      <div className="nx-ch">
        <div className="nx-ch-main">
          <div className="nx-ch-h cx-head">
            <button type="button" className="nx-ib cx-back" aria-label="All conversations" title="All conversations" onClick={() => newConversation({ kind: "list" })}><ArrowLeft size={18} /></button>
            {mark}
            <div className="cx-title">
              <h1>{v.dm ?? v.name}{v.sample ? <Sample /> : null}{v.programme ? <Chip tone="accent">Programme · {v.programme}</Chip> : null}</h1>
              {v.sub ? <p className="cx-purpose">{v.sub}</p> : null}
              {v.readers ? <p className="cx-readers">{readersIcon}{v.readers.text}</p> : null}
            </div>
          </div>
          <div className="nx-tabs" role="tablist" aria-label="Channel sections">
            {tabs.map(([t, n]) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{n ? <span className="nx-count">{n}</span> : null}{tab === t ? <motion.span layoutId="nx-ch-tab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
          </div>

          {tab === "Messages" ? <>
            <div className="nx-msgs" role="log" aria-label="Messages" aria-live="polite">
              {v.msgs === null ? <Skeleton rows={4} label="Reading messages" /> : !top.length ? (
                <div className="cx-start">
                  {mark}
                  <h2>{v.dm ? (nameMissing(v.dm) ? "No messages yet" : `No messages with ${v.dm} yet`) : `No messages in #${v.name} yet`}</h2>
                  <p>{v.dm ? "Write the first message below. Files you attach are shared with the two of you only." : v.programme ? "Partners invited to this programme channel read it. Nothing private to your organisation is shared unless you post it." : v.canPost === false ? "Announcements from the organisation's leads appear here." : "Write the first message below. Type @ and a name to bring someone in, or @Kaju to turn updates into tasks."}</p>
                </div>
              ) : v.sample ? <p className="nx-day"><span>Today</span></p> : null}
              <AnimatePresence initial={false}>{listed}</AnimatePresence>
              {v.note ? <p className="nx-foot" role="status">{v.note}</p> : null}
              {v.privately ? <div className="nx-note ch-private" role="status">
                <Sparkles size={13} aria-hidden /><div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0 }}><b>Only you see this.</b> Kaju answers questions with what you may read, so it is not posted to #{v.name}.</p>
                  <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{v.privately.error ?? (v.privately.text === null ? "Kaju is reading…" : v.privately.text.replace(/\*\*/g, ""))}</p>
                  <p style={{ margin: "6px 0 0" }}><Link className="nx-link" href={`/kaju?q=${encodeURIComponent(v.privately.q)}`}>Continue in Kaju</Link></p>
                </div>
                <button type="button" className="nx-ib" aria-label="Close Kaju's answer" onClick={v.onClosePrivate}><X size={14} /></button>
              </div> : null}
              <div ref={end} />
            </div>
            <Composer v={v} placeholder={v.dm ? (nameMissing(v.dm) ? "Write a message" : `Message ${v.dm}`) : `Message #${v.name}`} />
          </> : null}
          {tab === "Work" ? <div className="nx-msgs">{v.work.length ? <ul className="nx-table">{v.work.map(task)}</ul> : <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No work linked to this channel.</b> Ask @Kaju to turn updates into tasks.</p>}</div> : null}
          {tab === "Records" ? <div className="nx-msgs">{recordsShown.length ? <ul className="nx-table">{recordsShown.map((r) => <li key={r.id} className="nx-tr" style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}><ArrowUpRight size={14} style={{ color: "var(--ink-3)" }} />{r.href ? <Link href={r.href}>{r.label}</Link> : <span>{r.label}</span>}</li>)}</ul> : <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No records shared here yet.</b> A message posted from a record links back to it here.</p>}</div> : null}
          {tab === "Files" ? <div className="nx-msgs">{files.length ? <ul className="nx-table">{files.map(({ f, m }) => <li key={f.path} className="nx-tr" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><FileChip f={f} sample={v.sample} /><small className="nx-t3">{m.who} · {m.when}</small></li>)}</ul> : <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No files here yet.</b> Attach one to a message with the paperclip. Files open through private links for people in this channel only.</p>}</div> : null}
        </div>

        {parent ? (
          <aside className="nx-ch-side nx-thread-p" aria-label={`Thread: ${parent.who}`}>
            <div className="nx-thread-h"><b>Thread</b><span>{label}</span><button type="button" className="nx-ib" style={{ marginLeft: "auto" }} onClick={() => setThread(null)} aria-label="Close thread"><X size={16} /></button></div>
            <div className="nx-thread-b">
              {bubble(parent, true)}
              <p className="nx-day"><span>{repliesOf(parent.id).length ? `${repliesOf(parent.id).length} ${repliesOf(parent.id).length === 1 ? "reply" : "replies"}` : "No replies yet"}</span></p>
              <AnimatePresence initial={false}>{repliesOf(parent.id).map((m) => bubble(m, true))}</AnimatePresence>
            </div>
            <Composer v={v} parent={parent.id} placeholder="Reply in thread" autoFocus />
          </aside>
        ) : v.dm ? <aside className="nx-ch-side" aria-label="About this conversation">
          <h2 className="nx-h3">Private</h2>
          <p className="nx-foot" style={{ marginTop: 0 }}>Only you and {v.dm} can read this conversation and its files. Kaju is not part of direct messages, and nothing here becomes a task unless one of you creates it.</p>
        </aside> : <aside className="nx-ch-side" aria-label="About this channel">
          <h2 className="nx-h3">Linked work <span className="nx-count">{open}</span></h2>
          {open ? <ul className="nx-feed">{v.work.filter((w) => !w.done).slice(0, 4).map((w) => <li key={w.id} style={{ gridTemplateColumns: "16px minmax(0,1fr)" }}><span className="nx-check" aria-hidden /><div><b>{w.title}</b><small>{w.note}</small></div></li>)}</ul> : <p className="nx-foot" style={{ marginTop: 0 }}>Nothing open.</p>}
          {v.people.length ? <><h2 className="nx-h3">People</h2><div className="nx-people">{v.people.map((p, i) => <Chip key={`${p}-${i}`} bare>{p}</Chip>)}</div></> : null}
          <h2 className="nx-h3">Kaju here</h2>
          <p className="nx-foot" style={{ marginTop: 0 }}>Kaju reads only what you can see in this channel, quotes messages as written, and asks before anything is created.</p>
        </aside>}
      </div>
      <Sheet open={!!acts} onClose={closeActs} label="Message">
        {acts ? <div className="ch-acts">
          <p className="ch-acts-q"><b>{acts.m.who}</b> {acts.m.text.length > 120 ? `${acts.m.text.slice(0, 120)}…` : acts.m.text}</p>
          {v.reactions && !v.sample ? <div className="ch-acts-r" role="group" aria-label="React">{EMOJI.map((e) => <button key={e} type="button" aria-label={`React ${e}`} onClick={() => { v.reactions?.toggle(acts.m.id, e); setActs(null); }}>{e}</button>)}</div> : null}
          <ul className="ph-rows">
            {!acts.inThread ? <li><button type="button" className="ph-row" onClick={() => { setThread(acts.m.id); setActs(null); }}><CornerUpLeft size={20} aria-hidden /><span>{repliesOf(acts.m.id).length ? `Open the thread (${repliesOf(acts.m.id).length})` : "Reply in a thread"}</span></button></li> : null}
            {acts.m.mine && v.onEdit && !acts.m.kaju ? <li><button type="button" className="ph-row" onClick={() => { setEditing({ id: acts.m.id, text: acts.m.text }); setActs(null); }}><Pencil size={20} aria-hidden /><span>Edit</span></button></li> : null}
            {acts.m.mine && v.onDelete ? <li><button type="button" className="ph-row ch-bad" onClick={() => { setDel(acts.m); setActs(null); }}><Trash2 size={20} aria-hidden /><span>Delete</span></button></li> : null}
          </ul>
        </div> : null}
      </Sheet>
      {del ? <Confirm title="Delete this message?" confirm="Delete" danger onClose={() => setDel(null)} onConfirm={async () => { if (v.onDelete && (await v.onDelete(del))) setDel(null); }}><p>It shows as deleted to everyone in {label}. Its files are removed from the message. The earlier wording is kept for audit and is not shown.</p></Confirm> : null}
    </Shell>
  );
}

/** Every other sample channel and direct message: a short conversation of its own. */
function SampleChat({ name }: { name: string }) {
  const chat = SAMPLE_CHATS[name];
  const calm = useReducedMotion();
  const [msgs, setMsgs] = useState<VMsg[]>((chat?.msgs ?? []).map((m) => ({ ...m, parent: m.parent ?? null })));
  const onSend = (t: string, parent?: string) => {
    setMsgs((m) => [...m, { id: `u${Date.now()}`, who: "You", when: clock(), text: t, parent: parent ?? null, mine: true }]);
    if (!chat?.dm && !parent && /@kaju/i.test(t)) window.setTimeout(() => setMsgs((m) => [...m, { id: `k${Date.now()}`, who: "Kaju", kaju: true, when: clock(), text: `I read the ${Math.min(3, chat?.msgs.length ?? 0)} latest messages here. Nothing is created until someone in this channel asks and accepts.` }]), calm ? 0 : 650);
  };
  return <ChannelView name={name} sample dm={chat?.dm ?? null} sub={chat?.sub ?? "Sample channel"} readers={chat?.dm ? { icon: "lock", text: "Only the two of you can read this" } : null} msgs={msgs} work={[]} people={chat?.people ?? []} mentionable={[]} accepted={() => false} onSend={onSend} onAccept={() => {}} />;
}

function SampleChannel({ name }: { name: string }) {
  const [msgs, setMsgs] = useState<VMsg[]>([...MESSAGES.map((m) => ({ id: m.id, who: m.who, when: m.when, text: m.text, record: m.record })),
    { id: "r1", parent: "m3", who: "Field team A", when: "10:15 am", text: "We can have the van at the centre by 11:30." },
    { id: "r2", parent: "m3", who: "Dr. Arun K.", when: "10:18 am", text: "Good. I will keep the slot open until noon." }]);
  const [work, setWork] = useState<VTask[]>(CH_WORK.map((w, i) => ({ id: `s${i}`, title: w.title, note: w.note, done: false })));
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const calm = useReducedMotion();
  const onSend = (t: string, parent?: string) => {
    setMsgs((m) => [...m, { id: `u${Date.now()}`, who: "You", when: clock(), text: t, parent: parent ?? null, mine: true }]);
    if (!parent && /@kaju/i.test(t)) window.setTimeout(() => setMsgs((m) => [...m, { id: `k${Date.now()}`, who: "Kaju", kaju: true, when: clock(), text: /task/i.test(t) ? "From this morning's messages I can prepare two return visits. Nothing is created until you accept." : "I read the last three messages. Two dogs were missed in Ward 12, 17 photos were added to the drive, and the clinical follow-up depends on transport before noon.", tasks: /task/i.test(t) ? KAJU_TASKS : null }]), calm ? 0 : 650);
  };
  const onAccept = (m: VMsg) => { if (accepted.has(m.id) || !m.tasks) return; setAccepted((a) => new Set(a).add(m.id)); setWork((w) => [...m.tasks!.map((x, i) => ({ id: `${m.id}-${i}`, title: x, note: "From this channel · Field team A", done: false })), ...w]); };
  return <ChannelView name={name} sample sub={`Vaccination drive · Ward 12 · ${CH_PEOPLE.length} members`} msgs={msgs} work={work} people={CH_PEOPLE} mentionable={[]} accepted={(m) => accepted.has(m.id)} onSend={onSend} onAccept={onAccept} onToggle={(t) => setWork((w) => w.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />;
}

function LiveChannel({ name }: { name: string }) {
  const { org, userId, userName } = useLive();
  const sp = useSearchParams();
  const channels = useChannels(org!.org_id);
  const progs = useProgrammeChannels(true);
  const own = channels.rows?.find((c) => c.name === name) ?? null;
  const prog = !own ? (progs ?? []).find((c) => c.name === name) ?? null : null;
  const ch = own ?? (prog ? { id: prog.id, name: prog.name, topic: prog.topic, kind: "programme" } : null);
  const messages = useChannelMessages(ch?.id ?? null);
  const people = useOrgPeople(org!.org_id);
  const dms = useDms(ch?.kind === "dm" ? org!.org_id : null);
  const dmRow = ch?.kind === "dm" ? dms.rows?.find((d) => d.channel_id === ch.id) ?? null : null;
  const dmRole = dmRow ? people.rows?.find((p) => p.user_id === dmRow.other_id)?.role ?? null : null;
  const dm = ch?.kind === "dm" ? (dmRow ? personName(dmRow.other_name, dmRole) : "Direct message") : null;
  const seen = messages.rows?.length ?? 0;
  const chId = ch?.id ?? null;
  useEffect(() => { if (chId) void markRead(chId); }, [chId, seen]);
  /* Work linked to this channel only: nothing is read until the channel is known, so the organisation's other tasks never show here. */
  const tasks = useTasks(ch ? org!.org_id : null, ch?.id ?? null);
  const ids = useMemo(() => (messages.rows ?? []).map((m) => m.id), [messages.rows]);
  const reactions = useReactions(ids);
  const [note, setNote] = useState<string | null>(null);
  const [privately, setPrivately] = useState<View["privately"]>(null);
  const done = useMemo(() => new Set((tasks.rows ?? []).map((t) => t.source_message_id).filter(Boolean) as string[]), [tasks.rows]);
  const lead = ["admin", "lead", "coordinator"].includes(org!.role);
  /* Someone without a name cannot be told apart in a suggestion, so they are not offered there (as in Kaju's list of people). */
  const mentionable = (people.rows ?? []).filter((p) => p.user_id !== userId && !isUnnamed(p.name));

  if (channels.rows && !ch && progs !== null) return <NoChannel name={name} org={org!} channels={channels.rows} people={people.rows?.length ?? null} />;
  const onSend = async (t: string, parent?: string, files?: FileRef[]) => {
    if (!ch) return false;
    setNote(null);
    const r = await sendMessage(ch.id, t, { authorName: userName, parentId: parent ?? null, mentions: mentionsIn(t, people.rows ?? []), files });
    if (r.error || !r.data) { toast({ text: `Not sent: ${r.error?.message ?? "try again"}. Your words are still in the box.`, tone: "bad" }); return false; }
    messages.setRows((rows) => (rows && !rows.some((x) => x.id === r.data!.id) ? [...rows, r.data!] : rows));
    if (!parent && ch.kind !== "dm" && /@kaju\b/i.test(t)) {
      /* Kaju in the channel turns the channel's own messages into tasks or a recap, by fixed rules, for everyone here.
         Any other question ("what's overdue in Indiranagar?") is about records, which not everyone here may read, so
         Kaju answers it for the person who asked, here, under their own access, and posts nothing. */
      const q = t.replace(/@kaju\b[:,]?/gi, "").trim();
      if (channelAsk(q)) { const k = await askKaju(ch.id, t); if (!k.ok) setNote(k.error ?? null); else messages.reload(); }
      else {
        setPrivately({ q, text: null, error: null });
        const a = await askKajuPrivately(q, { path: `/channels/${ch.name}`, workspace: org!.workspace, channel: ch.name });
        setPrivately({ q, text: a.data?.text ?? null, error: a.error ?? (a.data ? null : "Kaju could not answer. Nothing was changed.") });
      }
    }
    return true;
  };
  const onAccept = async (m: VMsg) => { if (!ch || !m.tasks) return; const r = await addTasks(org!.org_id, m.tasks, { messageId: m.id, channelId: ch.id }); if (r.error) setNote(`Tasks not created: ${r.error.message}`); else tasks.reload(); };
  const msgs: VMsg[] | null = messages.rows ? messages.rows.map((m: Msg) => ({ id: m.id, who: m.author_kind === "kaju" ? (m.author_name ?? "Kaju") : m.author_id === userId ? "You" : m.author_name ?? "Member", kaju: m.author_kind === "kaju", when: clock(m.created_at), day: dayOf(m.created_at), text: m.body, record: m.record_label, recordHref: recordHref(m.record_kind, m.record_id), tasks: m.proposal?.tasks ?? null, parent: m.parent_id, mine: m.author_id === userId && m.author_kind === "person", edited: !!m.edited_at, deleted: !!m.deleted_at, files: m.files })) : null;
  const work: VTask[] = (tasks.rows ?? []).map((t) => ({ id: t.id, title: t.title, note: t.source_kind === "kaju" ? "Proposed by Kaju, accepted here" : t.assignee_name ?? "Unassigned", done: t.state === "done" }));
  const counts = (id: string) => EMOJI.map((e) => { const rs = reactions.rows.filter((r) => r.message_id === id && r.emoji === e); return { emoji: e, n: rs.length, mine: rs.some((r) => r.user_id === userId) }; }).filter((x) => x.n);
  /* Who can read, said once under the name; the count is everyone in the organisation, who can all read an open channel. */
  const n = people.rows?.length ?? 0;
  const count = n ? ` · ${n} ${n === 1 ? "person" : "people"}` : "";
  const readers: View["readers"] = !ch ? null
    : ch.kind === "dm" ? { icon: "lock", text: "Only the two of you can read this" }
    : ch.kind === "programme" ? { icon: "users", text: `People invited from partner organisations in ${prog?.programme_name ?? "the programme"} can read and post` }
    : ch.kind === "announcement" ? { icon: "megaphone", text: `Everyone in ${org!.name} can read${count}. Leads and coordinators post.` }
    : { icon: "users", text: `Everyone in ${org!.name} can read and post${count}` };
  const open = ch?.kind === "channel" || ch?.kind === "announcement";
  const names = open ? [...(people.rows ?? [])].sort((a, b) => Number(b.user_id === userId) - Number(a.user_id === userId)).map((p) => (p.user_id === userId ? "You" : personName(p.name, p.role))) : [];
  return <ChannelView name={name} sample={false} dm={dm} kind={ch?.kind} programme={prog?.programme_name ?? null} focus={sp.get("m")}
    canPost={ch?.kind === "announcement" ? lead : true}
    sub={dm ? (dmRow && dmRole && !isUnnamed(dmRow.other_name) ? roleWord(dmRole) : null) : ch?.topic || null}
    readers={readers}
    msgs={ch ? msgs : null} work={work} people={names.length > 12 ? [...names.slice(0, 11), `and ${names.length - 11} more`] : names} mentionable={ch?.kind === "programme" ? [] : mentionable} accepted={(m) => done.has(m.id)} onSend={onSend} onAccept={onAccept} note={note ?? messages.error ?? tasks.error} privately={privately} onClosePrivate={() => setPrivately(null)}
    reactions={{ counts, toggle: (id, e) => { void reactions.toggle(id, e, userId); } }}
    onEdit={async (m, body) => { const r = await editMessage(m.id, body); if (r.error) { toast({ text: r.error.message, tone: "bad" }); return false; } messages.reload(); return true; }}
    onDelete={async (m) => { const r = await deleteMessage(m.id); if (r.error) { toast({ text: r.error.message, tone: "bad" }); return false; } toast({ text: "Message deleted.", tone: "ok" }); messages.reload(); return true; }}
    onUpload={ch ? async (f) => { const r = await uploadFile(ch.id, f); if (r.error) { toast({ text: r.error, tone: "bad" }); return null; } return r.file ?? null; } : undefined}
    onToggle={async (t) => { const r = await setTaskDone(t.id, !t.done, userId); if (r.error) setNote(r.error.message); else tasks.reload(); }} />;
}

/** A channel that is not there. #general, the one everyone reads, is set up in one step; any other name opens New channel. */
function NoChannel({ name, org, channels, people }: { name: string; org: Workspace; channels: ChannelRow[]; people: number | null }) {
  const router = useRouter();
  const own = channels.filter((c) => c.kind === "channel" || c.kind === "announcement");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setup = async () => {
    setBusy(true); setErr(null);
    const r = await createChannel(org.org_id, "general", GENERAL_PURPOSE);
    setBusy(false);
    const row = r.data as ChannelRow | null;
    if (r.error || !row) { setErr(r.error?.code === "23505" ? "#general already exists. Open it from All conversations." : errText(r.error ?? "")); return; }
    announceChannel({ ...row, org_id: org.org_id });
    toast({ text: `#general is ready. Everyone in ${org.name} can read it.`, tone: "ok" });
    if (name !== "general") router.push("/channels/general");
  };
  const back = <button type="button" className="cx-first-back" onClick={() => newConversation({ kind: "list" })}><ArrowLeft size={16} aria-hidden />All conversations</button>;
  /* #general is the one everyone reads, so it is offered in one step whenever it is missing. */
  const first = !own.length || name === "general";
  const others = own.length ? <><h2 className="cx-group">Open another channel</h2>
    <ul className="cx-list">{own.slice(0, 8).map((c) => <li key={c.id}><Link className="cx-row" href={`/channels/${c.name}`}><span className="cx-ic" aria-hidden>{c.kind === "announcement" ? <Megaphone size={16} /> : <Hash size={16} />}</span><span className="cx-rn">{c.name}</span></Link></li>)}</ul></> : null;
  return (
    <Shell crumb={["Channels", name]}>
      <div className="nx-page">
        {first ? (
          <section className="cx-first" aria-labelledby="cx-first-h">
            {back}
            <span className="cx-first-mark" aria-hidden><Hash size={24} /></span>
            <h1 id="cx-first-h">Start with #general</h1>
            <p>{own.length ? `${org.name} does not have #general yet. It is the shared conversation everyone in the organisation reads.` : `${org.name} has no channels yet. A channel is a shared conversation, and #general is the one everyone reads.`}</p>
            <div className="cx-preview">
              <b><Hash size={16} aria-hidden />general</b>
              <span>{GENERAL_PURPOSE}</span>
              <small><Users size={12} aria-hidden />Everyone in {org.name} can read and post{people ? ` · ${people} ${people === 1 ? "person" : "people"}` : ""}</small>
            </div>
            <div className="cx-first-a">
              <button type="button" className="nx-btn" disabled={busy} onClick={() => void setup()}>{busy ? <Loader2 size={14} className="nx-spin" /> : null}{busy ? "Setting up…" : "Set up #general"}</button>
              <button type="button" className="nx-btn is-quiet" onClick={() => newConversation({ kind: "channel", name: name === "general" ? "" : name })}>Name a different channel</button>
            </div>
            {err ? <p className="cx-err" role="alert">{err}</p> : null}
            {others}
          </section>
        ) : (
          <section className="cx-first" aria-labelledby="cx-first-h">
            {back}
            <h1 id="cx-first-h">No channel called #{name}</h1>
            <p>Check the name, or create it. Everyone in {org.name} will be able to read and post in it.</p>
            <div className="cx-first-a"><button type="button" className="nx-btn" onClick={() => newConversation({ kind: "channel", name })}>Create #{name}</button></div>
            {others}
          </section>
        )}
      </div>
    </Shell>
  );
}

export function Channel({ name }: { name: string }) {
  const live = useLive();
  // Until the session is known the sample channel is shown: it paints first, and members never see it.
  return live.ready && live.org ? <Suspense fallback={null}><LiveChannel name={name} /></Suspense> : name === "abc-ward-12" ? <SampleChannel name={name} /> : <SampleChat name={name} />;
}
