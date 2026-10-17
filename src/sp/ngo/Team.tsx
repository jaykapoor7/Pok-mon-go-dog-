"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Team & access (decisions 026, 043).

   Who belongs to the organisation and what each can do. Leads add people
   (each gets a personal code, emailed when the mail service accepts it,
   otherwise shown here to pass on), change roles, revoke codes and
   remove members. The database enforces who may do this; the page only
   says so and shows the answer.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { orgTeamCodes, type TeamCode } from "@/lib/programme";
import { useMembership } from "../shell/Shell";
import { Ack, day, n } from "../ui";
import { changeRole, inviteTeam, removeMember, revokeCode, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

const ROLE: Record<string, string> = { admin: "Lead", lead: "Lead", member: "Member", volunteer: "Volunteer" };
const CAN: { role: string; can: string[] }[] = [
  { role: "Lead", can: ["Everything a member can", "Add people and change roles", "Revoke codes, remove members", "Import registers"] },
  { role: "Member", can: ["Read and act on the organisation's cases", "Record care and follow-ups", "File reports into drives"] },
  { role: "Volunteer", can: ["Send reports credited to the organisation", "Sees nothing private"] },
];

export function Team() {
  const { user } = useAuth();
  const mem = useMembership();
  const [people, setPeople] = useState<OrgMember[] | null>(null);
  const [codes, setCodes] = useState<TeamCode[]>([]);
  const [r, setR] = useState<Receipt | null>(null);
  const load = useCallback(async () => { const [p, c] = await Promise.all([getMyOrgMembers().catch(() => []), orgTeamCodes().catch(() => [])]); setPeople(p); setCodes(c); }, []);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const me = people?.find((p) => p.user_id === user?.id);
  const lead = me?.role === "admin" || me?.role === "lead";
  const after = async (x: Receipt) => { setR(x); if (x.ok) await load(); };

  return (
    <NgoGate title="Team" lede="Who belongs to your organisation and what each person can do.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · access</p><h1 className="serif">Team</h1></div>
          <p className="ngo-sum">{people ? <><b>{n(people.length)}</b> member{people.length === 1 ? "" : "s"}, <b>{n(codes.filter((c) => c.active && !c.accepted).length)}</b> code{codes.filter((c) => c.active && !c.accepted).length === 1 ? "" : "s"} not yet used. </> : "Reading your team… "}{lead ? "You are a lead." : "Only leads can change who has access."}</p>
        </header>
        <div aria-live="polite" className="tm-receipt">{r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not changed: {r.error}</Ack>)}</div>
        <div className="tm-grid">
          <section>
            <h2 className="h3 tm-h">Members</h2>
            {people === null && <div className="skel" style={{ height: 160 }} />}
            <ul className="tm-list">
              {people?.map((p) => (
                <li key={p.user_id} className="tm-row">
                  <span className="tm-av" aria-hidden>{p.name.slice(0, 1).toUpperCase()}</span>
                  <span className="tm-who"><b>{p.name}{p.user_id === user?.id ? " (you)" : ""}</b><small>{ROLE[p.role] ?? p.role}</small></span>
                  {lead && p.user_id !== user?.id ? (
                    <span className="row" style={{ ["--g" as string]: "6px" }}>
                      <select className="select ngo-sel" value={p.role} aria-label={`Role for ${p.name}`} onChange={async (e) => after(await changeRole(p.user_id, e.target.value))}><option value="admin">Lead</option><option value="member">Member</option></select>
                      <button type="button" className="btn is-ghost is-s" onClick={async () => { if (window.confirm(`Remove ${p.name} from the organisation? They lose access to its records at once.`)) await after(await removeMember(p.user_id)); }}>Remove</button>
                    </span>
                  ) : <span />}
                </li>
              ))}
            </ul>
            {codes.length > 0 && <>
              <h2 className="h3 tm-h">Codes</h2>
              <ul className="tm-list">
                {codes.map((c) => (
                  <li key={c.id} className={`tm-row${c.active ? "" : " is-off"}`}>
                    <span className="tm-av is-code" aria-hidden>{c.kind === "volunteer" ? "V" : "S"}</span>
                    <span className="tm-who"><b>{c.person_name ?? c.email ?? "Unnamed"}</b><small>{ROLE[c.role] ?? c.role} · {c.accepted ? "joined" : c.active ? "not yet used" : "revoked"} · {day(c.created_at)}{c.reports ? ` · ${n(c.reports)} reports` : ""}</small></span>
                    <span className="row" style={{ ["--g" as string]: "6px" }}>{c.code && c.active && <code className="mono tm-code">{c.code}</code>}{lead && c.active && <button type="button" className="btn is-ghost is-s" onClick={async () => after(await revokeCode(c.id))}>Revoke</button>}</span>
                  </li>
                ))}
              </ul>
            </>}
          </section>
          <aside className="stack">
            {lead ? <Invite onDone={after} /> : <div className="cf-card"><h3 className="h3">Add someone</h3><p className="small">Ask a lead in your organisation. Leads add people and set roles; the database refuses it for anyone else.</p></div>}
            <div className="cf-card">
              <h3 className="h3">What each role can do</h3>
              <dl className="tm-roles">{CAN.map((c) => <div key={c.role}><dt>{c.role}</dt><dd><ul>{c.can.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>)}</dl>
            </div>
          </aside>
        </div>
      </div>
    </NgoGate>
  );
}

function Invite({ onDone }: { onDone: (r: Receipt) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"lead" | "member" | "volunteer">("member");
  const [busy, setBusy] = useState(false);
  return (
    <form className="cf-card" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const x = await inviteTeam(email, name, role); setBusy(false); if (x.ok) { setEmail(""); setName(""); } await onDone(x); }}>
      <h3 className="h3">Add someone</h3>
      <div className="field"><label htmlFor="tm-n">Name</label><input id="tm-n" className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="field"><label htmlFor="tm-e">Email</label><input id="tm-e" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="seg" role="group" aria-label="Role">{(["member", "lead", "volunteer"] as const).map((k) => <button key={k} type="button" aria-pressed={role === k} onClick={() => setRole(k)}>{ROLE[k]}</button>)}</div>
      <button type="submit" className="btn is-ink is-s" disabled={busy}>{busy ? "Sending…" : "Add and send their code"}</button>
      <p className="small">They get a personal code by email. If the email cannot be sent, the code is shown here for you to pass on.</p>
    </form>
  );
}
