"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, AtSign, Check as Tick, Hash, Send, Sparkles, X } from "lucide-react";
import { Shell } from "../Shell";
import { Check, Chip, Sample, initials } from "../ui";
import { CH_PEOPLE, CH_RECORDS, CH_WORK, KAJU_TASKS, MESSAGES, SAMPLE_CHATS } from "../fixtures";
import { addTasks, askKaju, createChannel, markRead, postMessage, setTaskDone, useChannels, useDms, useLive, useMessages, useTasks } from "../live";

type Tab = "Messages" | "Work" | "Records" | "Files";
type VMsg = { id: string; who: string; when: string; text: string; kaju?: boolean; record?: string | null; tasks?: string[] | null; parent?: string | null };
type VTask = { id: string; title: string; note: string; done: boolean };
type View = {
  name: string; sample: boolean; sub: string; msgs: VMsg[] | null; work: VTask[]; records: string[]; people: string[];
  accepted: (m: VMsg) => boolean; onSend: (text: string, parent?: string) => void; onAccept: (m: VMsg) => void; onToggle?: (t: VTask) => void; note?: string | null;
  /** The other person, when this is a direct message. Kaju is not offered in a direct message. */
  dm?: string | null;
};

/** A channel: people talking, with the work and records the talk is about one tab away.
    Asking Kaju for tasks gets a proposal; nothing is created until a person accepts it. */
function ChannelView(v: View) {
  const [tab, setTab] = useState<Tab>("Messages");
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const calm = useReducedMotion();
  const [thread, setThread] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const tend = useRef<HTMLDivElement>(null);
  /* A reply belongs to its message, not to the channel: the main list shows only top-level messages. */
  const top = (v.msgs ?? []).filter((m) => !m.parent);
  const repliesOf = (id: string) => (v.msgs ?? []).filter((m) => m.parent === id);
  const parent = thread ? (v.msgs ?? []).find((m) => m.id === thread) ?? null : null;
  const count = top.length, tcount = thread ? repliesOf(thread).length : 0;
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: calm ? "auto" : "smooth" }); }, [count, calm]);
  useEffect(() => { tend.current?.scrollIntoView({ block: "end", behavior: calm ? "auto" : "smooth" }); }, [tcount, thread, calm]);
  useEffect(() => { if (!thread) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setThread(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [thread]);
  const send = () => { const t = text.trim(); if (!t) return; v.onSend(t); setText(""); };
  const sendReply = () => { const t = reply.trim(); if (!t || !thread) return; v.onSend(t, thread); setReply(""); };
  const bubble = (m: VMsg, inThread = false) => (
    <motion.div key={m.id} className="nx-msg" initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
      <span className={`nx-msg-f ${m.kaju ? "is-kaju" : ""}`}>{m.kaju ? <Sparkles size={14} /> : initials(m.who)}</span>
      <div>
        <b>{m.who}</b><time>{m.when}</time>
        <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
        {m.record ? <div className="nx-msg-x"><span className="nx-reclink"><ArrowUpRight size={12} />{m.record}</span></div> : null}
        {!inThread ? (() => { const n = repliesOf(m.id).length; return <div className={`nx-msg-x ${n ? "" : "nx-msg-reply"}`}><button type="button" className="nx-thread" onClick={() => setThread(m.id)} aria-label={n ? `${n} ${n === 1 ? "reply" : "replies"} to ${m.who}` : `Reply to ${m.who}`}>{n ? `${n} ${n === 1 ? "reply" : "replies"}` : "Reply"}</button></div>; })() : null}
        {!inThread && m.tasks?.length ? (
          <div className="nx-prop">
            <ul>{m.tasks.map((t) => <li key={t}><span className={`nx-check ${v.accepted(m) ? "is-done" : ""}`} aria-hidden><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.4 5 8.8 9.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}</li>)}</ul>
            <div className="nx-prop-f">{v.accepted(m) ? <><Tick size={13} style={{ color: "var(--ok)" }} />Added to Work. <button type="button" className="nx-thread" onClick={() => setTab("Work")}>Open Work</button></> : <><button type="button" className="nx-btn is-sm" onClick={() => v.onAccept(m)}>Create {m.tasks.length} {m.tasks.length === 1 ? "task" : "tasks"}</button><span>Proposed from the messages above</span></>}</div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
  const open = v.work.filter((w) => !w.done).length;
  const tabs: [Tab, number?][] = v.dm ? [["Messages"]] : [["Messages"], ["Work", open], ["Records", v.records.length], ["Files"]];
  const label = v.dm ?? `#${v.name}`;
  const task = (w: VTask) => <li key={w.id} className={`nx-tr ${w.done ? "nx-row-done" : ""}`} style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}>{v.onToggle ? <Check done={w.done} onClick={() => v.onToggle!(w)} label={w.done ? `Reopen: ${w.title}` : `Mark done: ${w.title}`} /> : <span className="nx-check" aria-hidden />}<span className="nx-cell-main"><span><b>{w.title}</b><small>{w.note}</small></span></span></li>;

  return (
    <Shell crumb={v.dm ? ["Direct messages", v.dm] : ["Channels", v.name]} flush>
      <div className="nx-ch">
        <div className="nx-ch-main">
          <div className="nx-ch-h"><div><h1>{v.dm ? <span className="nx-msg-f" style={{ width: 22, height: 22, fontSize: 9 }}>{initials(v.dm)}</span> : <Hash size={16} style={{ color: "var(--ink-3)" }} />}{v.dm ?? v.name}{v.sample ? <Sample /> : null}</h1><p>{v.sub}</p></div></div>
          <div className="nx-tabs" role="tablist" aria-label="Channel sections">
            {tabs.map(([t, n]) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{n ? <span className="nx-count">{n}</span> : null}{tab === t ? <motion.span layoutId="nx-ch-tab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
          </div>

          {tab === "Messages" ? <>
            <div className="nx-msgs" role="log" aria-label="Messages">
              {v.msgs === null ? <p className="nx-sub" style={{ padding: "24px 0" }}>Reading messages…</p> : !top.length ? <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No messages yet.</b> {v.dm ? `Only you and ${v.dm} can read this conversation.` : "Say what is happening; type @Kaju to hand it work."}</p> : <p className="nx-day"><span>{v.sample ? "Today" : "Latest"}</span></p>}
              <AnimatePresence initial={false}>
                {top.map((m) => bubble(m))}
              </AnimatePresence>
              {v.note ? <p className="nx-foot" role="status">{v.note}</p> : null}
              <div ref={end} />
            </div>
            <form className="nx-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} placeholder={v.dm ? `Message ${v.dm}` : `Message #${v.name}. Type @Kaju to hand it work.`} aria-label={`Message ${label}`} maxLength={8000} />
              <div className="nx-compose-f">
                {v.dm ? null : <button type="button" className="nx-ib" aria-label="Mention Kaju" onClick={() => setText((t) => (t ? `${t} @Kaju ` : "@Kaju turn these updates into tasks"))}><AtSign size={15} /></button>}
                <small className="nx-hide-s">Enter to send</small>
                <button type="submit" className="nx-btn is-sm" style={{ marginLeft: "auto" }} disabled={!text.trim()}><Send size={12} />Send</button>
              </div>
            </form>
          </> : null}

          {tab === "Work" ? <div className="nx-msgs">{v.work.length ? <ul className="nx-table">{v.work.map(task)}</ul> : <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No work linked to this channel.</b> Ask @Kaju to turn updates into tasks.</p>}</div> : null}
          {tab === "Records" ? <div className="nx-msgs">{v.records.length ? <ul className="nx-table">{v.records.map((r) => <li key={r} className="nx-tr" style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}><ArrowUpRight size={14} style={{ color: "var(--ink-3)" }} /><span>{r}</span></li>)}</ul> : <p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No records shared here yet.</b></p>}</div> : null}
          {tab === "Files" ? <div className="nx-msgs"><p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No files in this channel yet.</b> Files attached to a message appear here.</p></div> : null}
        </div>

        {parent ? (
          <aside className="nx-ch-side nx-thread-p" aria-label={`Thread: ${parent.who}`}>
            <div className="nx-thread-h"><b>Thread</b><span>{label}</span><button type="button" className="nx-ib" style={{ marginLeft: "auto" }} onClick={() => setThread(null)} aria-label="Close thread"><X size={16} /></button></div>
            <div className="nx-thread-b">
              {bubble(parent, true)}
              <p className="nx-day"><span>{tcount ? `${tcount} ${tcount === 1 ? "reply" : "replies"}` : "No replies yet"}</span></p>
              <AnimatePresence initial={false}>{repliesOf(parent.id).map((m) => bubble(m, true))}</AnimatePresence>
              <div ref={tend} />
            </div>
            <form className="nx-compose" style={{ margin: "6px 0 0" }} onSubmit={(e) => { e.preventDefault(); sendReply(); }}>
              <textarea rows={1} value={reply} autoFocus onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendReply(); } }} placeholder="Reply in thread" aria-label="Reply in thread" maxLength={8000} />
              <div className="nx-compose-f"><small>Enter to send</small><button type="submit" className="nx-btn is-sm" style={{ marginLeft: "auto" }} disabled={!reply.trim()}><Send size={12} />Reply</button></div>
            </form>
          </aside>
        ) : v.dm ? <aside className="nx-ch-side" aria-label="About this conversation">
          <h3 className="nx-h3">Private</h3>
          <p className="nx-foot" style={{ marginTop: 0 }}>Only you and {v.dm} can read this conversation. Kaju is not part of direct messages, and nothing here becomes a task unless one of you creates it.</p>
        </aside> : <aside className="nx-ch-side" aria-label="About this channel">
          <h3 className="nx-h3">Linked work <span className="nx-count">{open}</span></h3>
          {open ? <ul className="nx-feed">{v.work.filter((w) => !w.done).slice(0, 4).map((w) => <li key={w.id} style={{ gridTemplateColumns: "16px minmax(0,1fr)" }}><span className="nx-check" aria-hidden /><div><b>{w.title}</b><small>{w.note}</small></div></li>)}</ul> : <p className="nx-foot" style={{ marginTop: 0 }}>Nothing open.</p>}
          {v.records.length ? <><h3 className="nx-h3">Shared records</h3><div className="nx-rel">{v.records.map((r) => <a key={r} href="#"><ArrowUpRight size={13} /><span>{r}</span></a>)}</div></> : null}
          {v.people.length ? <><h3 className="nx-h3">People</h3><div className="nx-people">{v.people.map((p) => <Chip key={p} bare>{p}</Chip>)}</div></> : null}
          <h3 className="nx-h3">Kaju here</h3>
          <p className="nx-foot" style={{ marginTop: 0 }}>Kaju reads only what you can see in this channel, quotes messages as written, and asks before anything is created.</p>
        </aside>}
      </div>
    </Shell>
  );
}

const clock = (iso?: string) => (iso ? new Date(iso) : new Date()).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();

/** Every other sample channel and direct message: a short conversation of its own. */
function SampleChat({ name }: { name: string }) {
  const chat = SAMPLE_CHATS[name];
  const calm = useReducedMotion();
  const [msgs, setMsgs] = useState<VMsg[]>((chat?.msgs ?? []).map((m) => ({ ...m, parent: m.parent ?? null })));
  const onSend = (t: string, parent?: string) => {
    setMsgs((m) => [...m, { id: `u${Date.now()}`, who: "You", when: clock(), text: t, parent: parent ?? null }]);
    if (!chat?.dm && !parent && /@kaju/i.test(t)) window.setTimeout(() => setMsgs((m) => [...m, { id: `k${Date.now()}`, who: "Kaju", kaju: true, when: clock(), text: `I read the ${Math.min(3, chat?.msgs.length ?? 0)} latest messages here. Nothing is created until someone in this channel asks and accepts.` }]), calm ? 0 : 650);
  };
  return <ChannelView name={name} sample dm={chat?.dm ?? null} sub={chat?.sub ?? "Sample channel"} msgs={msgs} work={[]} records={[]} people={chat?.people ?? []} accepted={() => false} onSend={onSend} onAccept={() => {}} />;
}

function SampleChannel({ name }: { name: string }) {
  const [msgs, setMsgs] = useState<VMsg[]>([...MESSAGES.map((m) => ({ id: m.id, who: m.who, when: m.when, text: m.text, record: m.record })),
    { id: "r1", parent: "m3", who: "Field team A", when: "10:15 am", text: "We can have the van at the centre by 11:30." },
    { id: "r2", parent: "m3", who: "Dr. Arun K.", when: "10:18 am", text: "Good. I will keep the slot open until noon." }]);
  const [work, setWork] = useState<VTask[]>(CH_WORK.map((w, i) => ({ id: `s${i}`, title: w.title, note: w.note, done: false })));
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const calm = useReducedMotion();
  const onSend = (t: string, parent?: string) => {
    setMsgs((m) => [...m, { id: `u${Date.now()}`, who: "You", when: clock(), text: t, parent: parent ?? null }]);
    if (!parent && /@kaju/i.test(t)) window.setTimeout(() => setMsgs((m) => [...m, { id: `k${Date.now()}`, who: "Kaju", kaju: true, when: clock(), text: /task/i.test(t) ? "From this morning's messages I can prepare two return visits. Nothing is created until you accept." : "I read the last three messages. Two dogs were missed in Ward 12, 17 photos were added to the drive, and the clinical follow-up depends on transport before noon.", tasks: /task/i.test(t) ? KAJU_TASKS : null }]), calm ? 0 : 650);
  };
  const onAccept = (m: VMsg) => { if (accepted.has(m.id) || !m.tasks) return; setAccepted((a) => new Set(a).add(m.id)); setWork((w) => [...m.tasks!.map((x, i) => ({ id: `${m.id}-${i}`, title: x, note: "From this channel · Field team A", done: false })), ...w]); };
  return <ChannelView name={name} sample sub={`Vaccination drive · Ward 12 · ${CH_PEOPLE.length} members`} msgs={msgs} work={work} records={CH_RECORDS} people={CH_PEOPLE} accepted={(m) => accepted.has(m.id)} onSend={onSend} onAccept={onAccept} onToggle={(t) => setWork((w) => w.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />;
}

function LiveChannel({ name }: { name: string }) {
  const { org, userId, userName } = useLive();
  const channels = useChannels(org!.org_id);
  const ch = channels.rows?.find((c) => c.name === name) ?? null;
  const messages = useMessages(ch?.id ?? null);
  const dms = useDms(ch?.kind === "dm" ? org!.org_id : null);
  const dm = ch?.kind === "dm" ? dms.rows?.find((d) => d.channel_id === ch.id)?.other_name ?? "Direct message" : null;
  const seen = messages.rows?.length ?? 0;
  useEffect(() => { if (ch) void markRead(ch.id); }, [ch, seen]);
  const tasks = useTasks(org!.org_id, ch?.id ?? null);
  const [note, setNote] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const { setRows } = messages;
  const done = useMemo(() => new Set((tasks.rows ?? []).map((t) => t.source_message_id).filter(Boolean) as string[]), [tasks.rows]);

  if (channels.rows && !ch) {
    return (
      <Shell crumb={["Channels", name]}>
        <div className="nx-page"><h1 className="nx-h1">#{name} does not exist yet</h1><p className="nx-sub">Create it for {org!.name}. Everyone in the organisation can read and post.</p>
          <p style={{ marginTop: 16 }}><button type="button" className="nx-btn" disabled={making} onClick={async () => { setMaking(true); const r = await createChannel(org!.org_id, name, ""); setMaking(false); if (r.error) setNote(r.error.message); else channels.reload(); }}>{making ? "Creating…" : `Create #${name}`}</button></p>
          {note ? <p className="nx-foot" role="alert">{note}</p> : null}</div>
      </Shell>
    );
  }
  const onSend = async (t: string, parent?: string) => {
    if (!ch) return;
    setNote(null);
    const r = await postMessage(ch.id, t, userName, parent);
    if (r.error) { setNote(`Not sent: ${r.error.message}`); return; }
    setRows((rows) => (rows && !rows.some((x) => x.id === r.data.id) ? [...rows, r.data] : rows));
    if (!parent && ch.kind !== "dm" && /@kaju\b/i.test(t)) { const k = await askKaju(ch.id, t); if (!k.ok) setNote(k.error ?? null); else messages.reload(); }
  };
  const onAccept = async (m: VMsg) => { if (!ch || !m.tasks) return; const r = await addTasks(org!.org_id, m.tasks, { messageId: m.id, channelId: ch.id }); if (r.error) setNote(`Tasks not created: ${r.error.message}`); else tasks.reload(); };
  const msgs: VMsg[] | null = messages.rows ? messages.rows.map((m) => ({ id: m.id, who: m.author_kind === "kaju" ? "Kaju" : m.author_id === userId ? "You" : m.author_name ?? "Member", kaju: m.author_kind === "kaju", when: clock(m.created_at), text: m.body, record: m.record_label, tasks: m.proposal?.tasks ?? null, parent: m.parent_id })) : null;
  const work: VTask[] = (tasks.rows ?? []).map((t) => ({ id: t.id, title: t.title, note: t.source_kind === "kaju" ? "Proposed by Kaju, accepted here" : t.assignee_name ?? "Unassigned", done: t.state === "done" }));
  return <ChannelView name={name} sample={false} dm={dm} sub={dm ? "Direct message" : `${ch?.topic || org!.name}`} msgs={ch ? msgs : null} work={work} records={[]} people={[]} accepted={(m) => done.has(m.id)} onSend={onSend} onAccept={onAccept} note={note ?? messages.error ?? tasks.error}
    onToggle={async (t) => { const r = await setTaskDone(t.id, !t.done, userId); if (r.error) setNote(r.error.message); else tasks.reload(); }} />;
}

export function Channel({ name }: { name: string }) {
  const live = useLive();
  if (!live.ready) return <Shell crumb={["Channels", name]}><div className="nx-page"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveChannel name={name} /> : name === "abc-ward-12" ? <SampleChannel name={name} /> : <SampleChat name={name} />;
}
