"use client";

import { useMemo, useState } from "react";
import { Hash, Loader2, Send, Share2 } from "lucide-react";
import { initials } from "./ui";
import { Empty, Modal, Skeleton, Field, toast } from "./kit";
import { useChannels, useLive, useOrgPeople } from "./live";
import { mentionsIn, sendMessage, useChannelMessages, useRecordChannel } from "./collab";
import "./css/channel.css";

/* The discussion attached to one record. It lives with the record, not in a channel of its own, and only the
   organisation's members (who can already read the record) can read it. "Share in a channel" posts a link to the
   record in a channel, where it also appears under Records. */

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function RecordThread({ kind, id, label }: { kind: "animal" | "case" | "package" | "programme" | "appointment" | "study"; id: string; label: string }) {
  const live = useLive();
  const org = live.org;
  const rc = useRecordChannel(org?.org_id ?? null);
  const msgs = useChannelMessages(rc.id, { kind, id });
  const people = useOrgPeople(org?.org_id ?? null);
  const chans = useChannels(org?.org_id ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const options = useMemo(() => (chans.rows ?? []).filter((c) => c.kind === "channel" || c.kind === "announcement"), [chans.rows]);
  if (!org) return <p className="nx-sub">Sign in to discuss this record with your organisation.</p>;
  if (rc.error) return <p className="nx-sub">Record discussions are not set up on this database yet.</p>;
  const post = async () => {
    const t = text.trim(); if (!t || !rc.id) return;
    setBusy(true);
    const r = await sendMessage(rc.id, t, { authorName: live.userName, mentions: mentionsIn(t, people.rows ?? []), record: { kind, id, label } });
    setBusy(false);
    if (r.error || !r.data) { toast({ text: `Not posted: ${r.error?.message ?? "try again"}. Your words are still in the box.`, tone: "bad" }); return; }
    setText(""); msgs.setRows((rows) => (rows && !rows.some((x) => x.id === r.data!.id) ? [...rows, r.data!] : rows));
  };
  const shareIt = async () => {
    const ch = options.find((c) => c.id === to); if (!ch) return;
    setBusy(true);
    const r = await sendMessage(ch.id, note.trim() || `Sharing ${label}`, { authorName: live.userName, mentions: mentionsIn(note, people.rows ?? []), record: { kind, id, label } });
    setBusy(false);
    if (r.error) { toast({ text: r.error.message, tone: "bad" }); return; }
    setShare(false); setNote(""); toast({ text: `Shared in #${ch.name}.`, tone: "ok", href: `/channels/${ch.name}`, hrefLabel: "Open" });
  };
  return (
    <div className="nx-rthread">
      <div className="nx-sec-h"><h2>Discussion</h2>{msgs.rows?.length ? <span className="nx-count">{msgs.rows.length}</span> : null}<button type="button" className="nx-btn is-quiet is-sm" style={{ marginLeft: "auto" }} onClick={() => setShare(true)}><Share2 size={12} />Share in a channel</button></div>
      {msgs.rows === null ? <Skeleton rows={2} /> : !msgs.rows.length ? <Empty title="No discussion yet" hint="Notes for colleagues about this record. Type @ and a name to bring someone in." /> : (
        <ol className="nx-rthread-l">{msgs.rows.map((m) => <li key={m.id} className={m.deleted_at ? "is-deleted" : undefined}><span className="nx-msg-f">{initials(m.author_name ?? "M")}</span><div><b>{m.author_id === live.userId ? "You" : m.author_name ?? "Member"}</b><time>{when(m.created_at)}</time><p>{m.body}</p></div></li>)}</ol>
      )}
      <form className="nx-compose" style={{ margin: "8px 0 0" }} onSubmit={(e) => { e.preventDefault(); void post(); }}>
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Write about ${label}`} aria-label={`Write about ${label}`} maxLength={8000} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void post(); } }} />
        <div className="nx-compose-f"><small>Visible to {org.name} only</small><button type="submit" className="nx-btn is-sm" style={{ marginLeft: "auto" }} disabled={!text.trim() || busy}>{busy ? <Loader2 size={12} className="nx-spin" /> : <Send size={12} />}Post</button></div>
      </form>
      {share ? <Modal title={`Share ${label} in a channel`} onClose={() => setShare(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setShare(false)}>Cancel</button><button type="button" className="nx-btn" disabled={!to || busy} onClick={() => void shareIt()}>Share</button></>}>
        <Field label="Channel"><select value={to} onChange={(e) => setTo(e.target.value)} autoFocus><option value="">Choose a channel</option>{options.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}</select></Field>
        <Field label="Message (optional)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should people know?" /></Field>
        <p className="nx-foot" style={{ marginTop: 0 }}><Hash size={12} /> People in that channel see a link. Opening it still needs access to the record.</p>
      </Modal> : null}
    </div>
  );
}
