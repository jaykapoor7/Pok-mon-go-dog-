"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, AtSign, Check as Tick, Hash, Paperclip, Send, Settings2, Smile, Sparkles } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample, initials } from "../ui";
import { CH_PEOPLE, CH_RECORDS, CH_WORK, KAJU_TASKS, MESSAGES, type Msg } from "../fixtures";

type Tab = "Messages" | "Work" | "Records" | "Files";

/** A channel: people talking, with the work and records the talk is about one tab away.
    Asking Kaju for tasks gets a proposal; nothing is created until a person accepts it. */
export function Channel() {
  const [tab, setTab] = useState<Tab>("Messages");
  const [msgs, setMsgs] = useState<Msg[]>(MESSAGES);
  const [work, setWork] = useState(CH_WORK);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const calm = useReducedMotion();
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: calm ? "auto" : "smooth" }); }, [msgs.length, calm]);

  const now = () => new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const send = () => {
    const t = text.trim(); if (!t) return;
    const mine: Msg = { id: `u${Date.now()}`, who: "You", when: now(), text: t };
    setMsgs((m) => [...m, mine]); setText("");
    if (/@kaju/i.test(t)) window.setTimeout(() => setMsgs((m) => [...m, { id: `k${Date.now()}`, who: "Kaju", when: now(), text: /task/i.test(t) ? "From this morning's messages I can prepare two return visits. Nothing is created until you accept." : "I read the last three messages. Two dogs were missed in Ward 12, 17 photos were added to the drive, and the clinical follow-up depends on transport before noon.", kaju: /task/i.test(t) ? { tasks: KAJU_TASKS } : undefined }]), calm ? 0 : 650);
  };
  const accept = (id: string, tasks: string[]) => { if (accepted.has(id)) return; setAccepted((a) => new Set(a).add(id)); setWork((w) => [...tasks.map((x) => ({ title: x, note: "From this channel · Field team A" })), ...w]); };

  const tabs: [Tab, number?][] = [["Messages"], ["Work", work.length], ["Records", CH_RECORDS.length], ["Files"]];
  return (
    <Shell crumb={["Channels", "abc-ward-12"]} flush>
      <div className="nx-ch">
        <div className="nx-ch-main">
          <div className="nx-ch-h"><div><h1><Hash size={16} style={{ verticalAlign: "-2px", color: "var(--ink-3)" }} /> abc-ward-12<Sample /></h1><p>Vaccination drive · Ward 12 · {CH_PEOPLE.length} members</p></div><button type="button" className="nx-btn is-quiet is-sm" style={{ marginLeft: "auto" }}><Settings2 size={13} />Details</button></div>
          <div className="nx-tabs" role="tablist" aria-label="Channel sections">
            {tabs.map(([t, n]) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`nx-tab ${tab === t ? "is-on" : ""}`} onClick={() => setTab(t)}>{t}{n ? <span className="nx-count">{n}</span> : null}{tab === t ? <motion.span layoutId="nx-ch-tab" className="nx-tab-line" transition={calm ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 46 }} /> : null}</button>)}
          </div>

          {tab === "Messages" ? <>
            <div className="nx-msgs" role="log" aria-label="Messages">
              <p className="nx-day"><span>Today</span></p>
              <AnimatePresence initial={false}>
                {msgs.map((m) => (
                  <motion.div key={m.id} className="nx-msg" initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
                    <span className={`nx-msg-f ${m.who === "Kaju" ? "is-kaju" : ""}`}>{m.who === "Kaju" ? <Sparkles size={14} /> : initials(m.who)}</span>
                    <div>
                      <b>{m.who}</b><time>{m.when}</time>
                      <p>{m.text}</p>
                      {m.record ? <div className="nx-msg-x"><span className="nx-reclink"><ArrowUpRight size={12} />{m.record}</span></div> : null}
                      {m.replies ? <div className="nx-msg-x"><button type="button" className="nx-thread">{m.replies} replies</button></div> : null}
                      {m.kaju ? (
                        <div className="nx-prop">
                          <ul>{m.kaju.tasks.map((t) => <li key={t}><span className={`nx-check ${accepted.has(m.id) ? "is-done" : ""}`} aria-hidden><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.4 5 8.8 9.6 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{t}</li>)}</ul>
                          <div className="nx-prop-f">{accepted.has(m.id) ? <><Tick size={13} style={{ color: "var(--ok)" }} />Added to Work. <button type="button" className="nx-thread" onClick={() => setTab("Work")}>Open Work</button></> : <><button type="button" className="nx-btn is-sm" onClick={() => accept(m.id, m.kaju!.tasks)}>Create {m.kaju.tasks.length} tasks</button><span>Proposed from 2 messages above</span></>}</div>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={end} />
            </div>
            <form className="nx-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} placeholder="Message #abc-ward-12. Type @Kaju to hand it work." aria-label="Message #abc-ward-12" />
              <div className="nx-compose-f">
                <button type="button" className="nx-ib" aria-label="Attach a file"><Paperclip size={15} /></button>
                <button type="button" className="nx-ib" aria-label="Mention Kaju" onClick={() => setText((t) => (t ? `${t} @Kaju ` : "@Kaju turn these updates into tasks"))}><AtSign size={15} /></button>
                <button type="button" className="nx-ib" aria-label="Add a reaction"><Smile size={15} /></button>
                <small className="nx-hide-s">Enter to send</small>
                <button type="submit" className="nx-btn is-sm" style={{ marginLeft: "auto" }} disabled={!text.trim()}><Send size={12} />Send</button>
              </div>
            </form>
          </> : null}

          {tab === "Work" ? <div className="nx-msgs"><ul className="nx-table">{work.map((w) => <li key={w.title} className="nx-tr" style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}><span className="nx-check" aria-hidden /><span className="nx-cell-main"><span><b>{w.title}</b><small>{w.note}</small></span></span></li>)}</ul></div> : null}
          {tab === "Records" ? <div className="nx-msgs"><ul className="nx-table">{CH_RECORDS.map((r) => <li key={r} className="nx-tr" style={{ gridTemplateColumns: "22px minmax(0,1fr)" }}><ArrowUpRight size={14} style={{ color: "var(--ink-3)" }} /><span>{r}</span></li>)}</ul></div> : null}
          {tab === "Files" ? <div className="nx-msgs"><p className="nx-sub" style={{ padding: "24px 0" }}><b style={{ color: "var(--ink)" }}>No files in this channel yet.</b> Files attached to a message appear here.</p></div> : null}
        </div>

        <aside className="nx-ch-side" aria-label="About this channel">
          <h3 className="nx-h3">Linked work <span className="nx-count">{work.length}</span></h3>
          <ul className="nx-feed">{work.slice(0, 4).map((w) => <li key={w.title} style={{ gridTemplateColumns: "16px minmax(0,1fr)" }}><span className="nx-check" aria-hidden /><div><b>{w.title}</b><small>{w.note}</small></div></li>)}</ul>
          <h3 className="nx-h3">Shared records</h3>
          <div className="nx-rel">{CH_RECORDS.map((r) => <a key={r} href="#"><ArrowUpRight size={13} /><span>{r}</span></a>)}</div>
          <h3 className="nx-h3">People</h3>
          <div className="nx-people">{CH_PEOPLE.map((p) => <Chip key={p} bare>{p}</Chip>)}</div>
          <h3 className="nx-h3">Kaju here</h3>
          <p className="nx-foot" style={{ marginTop: 0 }}>Kaju reads only what members of this channel can see, and asks before it creates or sends anything.</p>
        </aside>
      </div>
    </Shell>
  );
}
