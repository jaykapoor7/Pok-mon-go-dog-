"use client";

import { useState } from "react";
import { Mail, Phone, Plus } from "lucide-react";
import { useRead } from "@/oh/data";
import { invite, lead, read, readMembers, readTeamCodes, readVolunteers, removeMember, revokeCode, setRole, type Member, type TeamCode, type Volunteer } from "../../data/ngo-setup";
import { Confirm, Failed, Field, Modal, Skeleton, day, errText, useAct } from "../../kit";
import { Chip } from "../../ui";
import { Grid, Holding, TabbedPage, Tools, TryLink, useTab, useWho, type GCol } from "./parts";
import { S_CODES, S_MEMBERS, S_VOLUNTEERS } from "./sample";

/* Team: who belongs to the organisation and what each can do, the personal codes people join with, and the
   volunteers who offered to help. A lead adds people (each gets a code by email; the code is shown here too),
   changes roles, revokes codes and removes members. The database enforces who may; the page says so. */

const ROLE: Record<string, string> = { admin: "Lead", lead: "Lead", coordinator: "Coordinator", veterinarian: "Veterinarian", member: "Member", field_worker: "Field worker", volunteer: "Volunteer" };
/* Roles a lead can give an existing member. The database accepts exactly these. */
const ASSIGNABLE = ["admin", "coordinator", "veterinarian", "member", "field_worker"] as const;
const CAN: [string, string][] = [
  ["Lead", "Everything a coordinator can. Adds people and changes roles, revokes codes, removes members, imports registers."],
  ["Coordinator", "Reviews ABC evidence, approves or returns it, prepares and submits report packages, answers the reviewing office."],
  ["Veterinarian", "Authorises ABC procedures in their own name; cannot review evidence they signed."],
  ["Member, field worker", "Reads and acts on the organisation's cases, adds evidence, records care and follow-ups."],
  ["Volunteer", "Sends reports credited to the organisation; sees nothing private."],
];
const TABS = [{ slug: "members", label: "Members" }, { slug: "codes", label: "Codes" }, { slug: "volunteers", label: "Volunteers" }] as const;
type Tab = (typeof TABS)[number]["label"];
const CRUMB: [string, string] = ["NGO", "Team"];
type Data = { members: Member[]; codes: TeamCode[] | null };

export function Team({ tab: initial }: { tab?: string | null }) {
  const who = useWho();
  const [tab, setTab] = useTab(TABS, initial);
  const r = useRead<Data>(() => read(async () => { const [m, c] = await Promise.all([readMembers(), readTeamCodes().catch(() => null)]); return { members: m, codes: c }; }), "ns:team", !who.sample && !!who.ngo);
  const vols = useRead<Volunteer[]>(() => read(readVolunteers), "ns:volunteers", !who.sample && !!who.ngo && tab === "Volunteers");
  const [inviting, setInviting] = useState(false);
  if (!who.ready) return <Holding crumb={CRUMB} text="Opening…" />;
  if (who.notNgo) return <Holding crumb={CRUMB} title="Team" text="Your account is not part of an NGO. People in your organisation are managed by its administrator." />;
  const d: Data | null = who.sample ? { members: S_MEMBERS, codes: S_CODES } : r.data;
  const me = d?.members.find((m) => m.user_id === (who.sample ? "u1" : who.userId));
  const isLead = who.sample || lead(me?.role ?? who.role);
  const unused = d?.codes?.filter((c) => c.active && !c.accepted).length ?? 0;
  return (
    <TabbedPage id="team" crumb={CRUMB} title="Team" eyebrow={who.ngo?.name ?? "Kind Hour"} sample={who.sample}
      sub={d ? <><b className="num">{d.members.length}</b> {d.members.length === 1 ? "member" : "members"}{d.codes ? <>, <b className="num">{unused}</b> {unused === 1 ? "code" : "codes"} not yet used</> : null}. {isLead ? "You are a lead." : "Only leads can add people or change access; the database refuses it for anyone else."}</> : "Reading your team…"}
      tabs={TABS.map((t) => t.label) as Tab[]} tab={tab} onTab={setTab}>
      {tab === "Volunteers" ? <Volunteers sample={who.sample} r={vols} />
        : !who.sample && r.loading && !r.data ? <Skeleton rows={5} label="Reading your team" />
        : !who.sample && r.error && !r.data ? <Failed error={errText(r.error)} retry={r.reload} />
        : tab === "Members" ? <Members sample={who.sample} members={d!.members} meId={who.sample ? "u1" : who.userId} isLead={isLead} onInvite={() => setInviting(true)} reload={r.reload} />
        : <Codes sample={who.sample} codes={d!.codes} isLead={isLead} onInvite={() => setInviting(true)} reload={r.reload} />}
      {inviting ? <Invite onClose={() => setInviting(false)} onDone={() => { r.reload(); }} /> : null}
    </TabbedPage>
  );
}

function Members({ sample, members, meId, isLead, onInvite, reload }: { sample: boolean; members: Member[]; meId: string | null; isLead: boolean; onInvite: () => void; reload: () => void }) {
  const { busy, run } = useAct();
  const [change, setChange] = useState<{ m: Member; role: string } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const doRole = () => { if (!change) return; const { m, role } = change; void run(`role:${m.user_id}`, () => setRole(m.user_id, role), { ok: `${m.name} is now ${ROLE[role] ?? role}.`, undo: async () => { await setRole(m.user_id, m.role); reload(); } }).then((x) => { setChange(null); if (x.ok) reload(); }); };
  const doRemove = () => { if (!removing) return; const m = removing; void run(`rm:${m.user_id}`, () => removeMember(m.user_id), { ok: `${m.name} was removed from the organisation.` }).then((x) => { setRemoving(null); if (x.ok) reload(); }); };
  const cols: GCol<Member>[] = [
    { label: "Name", width: "minmax(0, 1.4fr)", render: (m) => <span className="nx-cell-main"><span className="ns-av" aria-hidden>{m.name.slice(0, 1).toUpperCase()}</span><span><b>{m.name}{m.user_id === meId ? " (you)" : ""}</b><small className="nx-only-s">{ROLE[m.role] ?? m.role}</small></span></span> },
    { label: "Role", width: "200px", keep: true, render: (m) => (isLead && m.user_id !== meId ? (sample ? <Chip>{ROLE[m.role] ?? m.role}</Chip> : <select className="ns-sel" value={m.role} disabled={!!busy} aria-label={`Role for ${m.name}`} onChange={(e) => setChange({ m, role: e.target.value })}>{ASSIGNABLE.map((k) => <option key={k} value={k}>{ROLE[k]}</option>)}{!(ASSIGNABLE as readonly string[]).includes(m.role) ? <option value={m.role}>{ROLE[m.role] ?? m.role}</option> : null}</select>) : <Chip>{ROLE[m.role] ?? m.role}</Chip>) },
    { label: "", width: "110px", render: (m) => (isLead && m.user_id !== meId ? (sample ? <TryLink quiet small>Remove</TryLink> : <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setRemoving(m)}>Remove</button>) : null) },
  ];
  return (
    <>
      <Tools end={sample ? <TryLink small><Plus size={13} />Add someone</TryLink> : isLead ? <button type="button" className="nx-btn is-sm" onClick={onInvite}><Plus size={13} />Add someone</button> : null}>
        <span className="ns-sum">Each person&apos;s role decides what they can do. The database checks it on every action.</span>
      </Tools>
      <Grid label="Members" cols={cols} rows={members} rowKey={(m) => m.user_id} empty={<b>No members read.</b>} />
      <section className="ns-sec"><div className="nx-sec-h"><h2>What each role can do</h2></div>
        <dl className="nx-props" style={{ marginTop: 6 }}>{CAN.map(([k, v]) => <div key={k} style={{ gridTemplateColumns: "150px minmax(0, 1fr)", alignItems: "start", padding: "6px" }}><dt>{k}</dt><dd style={{ fontWeight: 400 }}>{v}</dd></div>)}</dl>
      </section>
      {change ? <Confirm title="Change this role" confirm="Change role" busy={busy === `role:${change.m.user_id}`} onClose={() => setChange(null)} onConfirm={doRole}><p>{change.m.name} goes from {ROLE[change.m.role] ?? change.m.role} to {ROLE[change.role] ?? change.role}. What they can see and do changes at once.</p></Confirm> : null}
      {removing ? <Confirm danger title="Remove from the organisation" confirm="Remove" busy={busy === `rm:${removing.user_id}`} onClose={() => setRemoving(null)} onConfirm={doRemove}><p>{removing.name} loses access to the organisation&apos;s records at once. Their past work stays recorded in their name. To bring them back, add them again.</p></Confirm> : null}
    </>
  );
}

function Codes({ sample, codes, isLead, onInvite, reload }: { sample: boolean; codes: TeamCode[] | null; isLead: boolean; onInvite: () => void; reload: () => void }) {
  const { busy, run } = useAct();
  const [revoking, setRevoking] = useState<TeamCode | null>(null);
  const doRevoke = () => { if (!revoking) return; const c = revoking; void run(`rv:${c.id}`, () => revokeCode(c.id), { ok: "Code revoked. It can no longer be used to join." }).then((x) => { setRevoking(null); if (x.ok) reload(); }); };
  if (codes === null) return <Failed error="The organisation's codes could not be read. Only leads can see them." retry={reload} />;
  const cols: GCol<TeamCode>[] = [
    { label: "For", width: "minmax(0, 1.4fr)", render: (c) => <span className="nx-cell-main"><span><b>{c.person_name ?? c.email ?? "Unnamed"}</b><small>{c.kind === "volunteer" ? "Volunteer code" : "Staff code"} · {ROLE[c.role] ?? c.role}{c.email && c.person_name ? ` · ${c.email}` : ""}</small></span></span> },
    { label: "Code", width: "140px", render: (c) => (c.code && c.active ? <code className="ns-code">{c.code}</code> : <span className="nx-t3">—</span>) },
    { label: "Created", width: "110px", render: (c) => <span className="nx-t3">{day(c.created_at)}</span> },
    { label: "Reports", width: "80px", render: (c) => <span className="num nx-t2">{c.reports || ""}</span> },
    { label: "Status", width: "120px", keep: true, render: (c) => <Chip tone={c.accepted ? "ok" : c.active ? "warn" : "plain"}>{c.accepted ? "Joined" : c.active ? "Not yet used" : "Revoked"}</Chip> },
    { label: "", width: "100px", render: (c) => (isLead && c.active ? (sample ? <TryLink quiet small>Revoke</TryLink> : <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => setRevoking(c)}>Revoke</button>) : null) },
  ];
  return (
    <>
      <Tools end={sample ? <TryLink small><Plus size={13} />Add someone</TryLink> : isLead ? <button type="button" className="nx-btn is-sm" onClick={onInvite}><Plus size={13} />Add someone</button> : null}>
        <span className="ns-sum">A personal code joins one person to the organisation with the role it names.</span>
      </Tools>
      <Grid label="Codes" cols={cols} rows={codes} rowKey={(c) => c.id} empty={<><b>No codes yet</b><p>Add someone and their personal code appears here.</p></>} />
      {revoking ? <Confirm danger title="Revoke this code" confirm="Revoke" busy={busy === `rv:${revoking.id}`} onClose={() => setRevoking(null)} onConfirm={doRevoke}><p>The code for {revoking.person_name ?? revoking.email ?? "this person"} stops working. Anyone who already joined with it stays a member.</p></Confirm> : null}
    </>
  );
}

function Volunteers({ sample, r }: { sample: boolean; r: { data: Volunteer[] | null; error: string | null; loading: boolean; reload: () => void } }) {
  if (!sample && r.loading && !r.data) return <Skeleton rows={4} label="Reading sign-ups" />;
  if (!sample && r.error && !r.data) return <Failed error={`Sign-ups could not be read. ${errText(r.error)} This is not the same as no sign-ups.`} retry={r.reload} />;
  const rows = sample ? S_VOLUNTEERS : r.data!;
  const email = (c: string) => c.includes("@");
  const cols: GCol<Volunteer>[] = [
    { label: "Name", width: "minmax(0, 1fr)", render: (v) => <span className="nx-cell-main"><span><b>{v.name}</b><small>{v.zone || "No locality given"}</small></span></span> },
    { label: "Message", width: "minmax(0, 2fr)", render: (v) => <span className="nx-t2 ns-cell" title={v.message ?? undefined}>{v.message || "No message"}</span> },
    { label: "Signed up", width: "110px", render: (v) => <span className="nx-t3">{day(v.created_at)}</span> },
    { label: "Contact", width: "minmax(140px, 220px)", keep: true, render: (v) => <a className="ns-link" style={{ display: "inline-flex", gap: 6, alignItems: "center", minHeight: 32 }} href={email(v.contact) ? `mailto:${v.contact}` : `tel:${v.contact.replace(/\s+/g, "")}`}>{email(v.contact) ? <Mail size={13} /> : <Phone size={13} />}<span className="ns-cell">{v.contact}</span></a> },
  ];
  return (
    <>
      <Tools><span className="ns-sum"><b>{rows.length}</b> {rows.length === 1 ? "sign-up" : "sign-ups"}, newest first. They offered to help through StrayPaw; they are not on your team and see nothing. To have someone report for you, add them under Members.</span></Tools>
      <Grid label="Volunteer sign-ups" cols={cols} rows={rows} rowKey={(v) => v.id} empty={<><b>No sign-ups yet</b><p>People who offer to help appear here.</p></>} />
    </>
  );
}

function Invite({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAct();
  const [f, setF] = useState({ name: "", email: "", role: "member" as "lead" | "member" | "volunteer" });
  const [asking, setAsking] = useState(false);
  const [got, setGot] = useState<{ code: string; emailed: boolean; name: string } | null>(null);
  const ok = !!f.name.trim() && /.+@.+\..+/.test(f.email.trim());
  const send = () => void run("invite", () => invite(f.email, f.name, f.role), { quiet: true }).then((x) => { setAsking(false); if (x.ok && x.result) { setGot({ code: x.result.code, emailed: x.result.emailed, name: f.name.trim() }); onDone(); } });
  if (got) return (
    <Modal title={`${got.name} is added`} onClose={onClose} foot={<button type="button" className="nx-btn" onClick={onClose}>Done</button>}>
      <p className="nx-sub">Their personal code:</p>
      <p><code className="ns-code" style={{ fontSize: 18, padding: "6px 10px" }}>{got.code}</code></p>
      <p className="nx-note"><span>{got.emailed ? "It was emailed to them. You can also pass it on yourself." : "The email could not be sent, so give them this code yourself."} They enter it after signing in to join.</span></p>
    </Modal>
  );
  if (asking) return <Confirm title="Add and send their code" confirm="Add and send" busy={busy === "invite"} onClose={() => setAsking(false)} onConfirm={send}><p>{f.name.trim()} ({f.email.trim()}) is added as {ROLE[f.role]}. StrayPaw emails them a personal code to join; you will also see the code here.</p></Confirm>;
  return (
    <Modal title="Add someone" onClose={onClose} foot={<><button type="button" className="nx-btn is-quiet" onClick={onClose}>Cancel</button><button type="button" className="nx-btn" disabled={!ok} onClick={() => setAsking(true)}>Review</button></>}>
      <div className="nx-fields">
        <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Role" wide><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })}><option value="member">Member</option><option value="lead">Lead</option><option value="volunteer">Volunteer</option></select></Field>
      </div>
      <p className="nx-sub">They get a personal code by email. If the email cannot be sent, the code is shown here for you to pass on. One code per person.</p>
    </Modal>
  );
}
