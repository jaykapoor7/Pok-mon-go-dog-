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
import { Plus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrgMembers, type OrgMember } from "@/lib/team-actions";
import { orgTeamCodes, type TeamCode } from "@/lib/programme";
import { Btn, Head, Lanes, Page, Panel, Section, Split, Table, Tag, type Col } from "@/ws/kit";
import { useMembership } from "../shell/Shell";
import { Ack, day, n } from "../ui";
import { Reading } from "../ui/Reading";
import { changeRole, inviteTeam, removeMember, revokeCode, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./org.k.css";

const ROLE: Record<string, string> = { admin: "Lead", lead: "Lead", coordinator: "Coordinator", veterinarian: "Veterinarian", member: "Member", field_worker: "Field worker", volunteer: "Volunteer" };
/* Roles a lead can give an existing member. The database accepts exactly these. */
const ASSIGNABLE = ["admin", "coordinator", "veterinarian", "member", "field_worker"] as const;
const CAN: { role: string; can: string[] }[] = [
  { role: "Lead", can: ["Everything a coordinator can", "Add people and change roles", "Revoke codes, remove members", "Import registers"] },
  { role: "Coordinator", can: ["Review ABC evidence, approve or return it", "Prepare and submit report packages", "Answer reviewer queries"] },
  { role: "Veterinarian", can: ["Authorise ABC procedures in their own name", "Cannot review evidence they signed"] },
  { role: "Member / field worker", can: ["Read and act on the organisation's cases", "Add evidence, record care and follow-ups"] },
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
  const [inviting, setInviting] = useState(false);
  const unused = codes.filter((c) => c.active && !c.accepted).length;

  const memberCols: Col<OrgMember>[] = [
    { key: "name", label: "Name", width: "minmax(0, 1.4fr)", render: (p) => <span className="og-cell"><span className="og-av" aria-hidden>{p.name.slice(0, 1).toUpperCase()}</span><span>{p.name}{p.user_id === user?.id ? " (you)" : ""}</span></span> },
    { key: "role", label: "Role", width: "minmax(144px, 1fr)", keep: true, render: (p) => (lead && p.user_id !== user?.id
      ? <select className="og-in is-s" value={p.role} aria-label={`Role for ${p.name}`} onChange={async (e) => after(await changeRole(p.user_id, e.target.value))}>{ASSIGNABLE.map((k) => <option key={k} value={k}>{ROLE[k]}</option>)}{!(ASSIGNABLE as readonly string[]).includes(p.role) && <option value={p.role}>{ROLE[p.role] ?? p.role}</option>}</select>
      : ROLE[p.role] ?? p.role) },
    ...(lead ? [{ key: "acts", label: "", width: "auto", align: "end", render: (p) => (p.user_id !== user?.id ? <Btn small variant="quiet" onClick={async () => { if (window.confirm(`Remove ${p.name} from the organisation? They lose access to its records at once.`)) await after(await removeMember(p.user_id)); }}>Remove</Btn> : null) } satisfies Col<OrgMember>] : []),
  ];
  const codeCols: Col<TeamCode>[] = [
    { key: "who", label: "For", width: "minmax(0, 1.4fr)", render: (c) => <>{c.person_name ?? c.email ?? "Unnamed"}<span className="og-tail">{c.kind === "volunteer" ? "volunteer code" : "staff code"}</span></> },
    { key: "role", label: "Role", width: "96px", render: (c) => ROLE[c.role] ?? c.role },
    { key: "state", label: "Status", width: "112px", keep: true, render: (c) => <Tag tone={c.accepted ? "green" : c.active ? "amber" : "plain"}>{c.accepted ? "Joined" : c.active ? "Not yet used" : "Revoked"}</Tag> },
    { key: "at", label: "Created", width: "104px", render: (c) => day(c.created_at) },
    { key: "reports", label: "Reports", width: "64px", align: "end", render: (c) => (c.reports ? n(c.reports) : "") },
    { key: "code", label: "Code", width: "minmax(0, 1fr)", render: (c) => (c.code && c.active ? <code className="og-code">{c.code}</code> : null) },
    ...(lead ? [{ key: "acts", label: "", width: "auto", align: "end", render: (c) => (c.active ? <Btn small variant="quiet" onClick={async () => after(await revokeCode(c.id))}>Revoke</Btn> : null) } satisfies Col<TeamCode>] : []),
  ];

  return (
    <NgoGate title="Team" lede="Who belongs to your organisation and what each person can do.">
      <Page>
        <Head title="Team"
          sum={<>{people ? <><b>{n(people.length)}</b> member{people.length === 1 ? "" : "s"}, <b>{n(unused)}</b> code{unused === 1 ? "" : "s"} not yet used. </> : <><Reading>Reading your team</Reading>{" "}</>}{lead ? "You are a lead." : "Only leads can add people or change who has access; the database refuses it for anyone else."}</>}
          actions={lead ? <Btn variant={inviting ? "plain" : "primary"} icon={<Plus size={14} />} aria-expanded={inviting} onClick={() => setInviting((v) => !v)}>Add someone</Btn> : undefined} />
        <div aria-live="polite" className="og-receipt">{r && (r.ok ? <Ack state="saved">{r.what}</Ack> : <Ack state="failed">Not changed: {r.error}</Ack>)}</div>
        {inviting && lead && <Panel pad><Invite onDone={after} onClose={() => setInviting(false)} /></Panel>}
        <Split side={
          <Section title="What each role can do" fold="roles">
            <dl className="tm-roles">{CAN.map((c) => <div key={c.role}><dt>{c.role}</dt><dd>{c.can.join(". ")}.</dd></div>)}</dl>
          </Section>}>
          <Section title="Members">
            {people === null ? <div className="og-skel" aria-busy="true"><i /><i /><i /></div> : <Panel><Table label="Members" cols={memberCols} rows={people} rowKey={(p) => p.user_id} /></Panel>}
          </Section>
          {codes.length > 0 && (
            <Section title="Codes" fold="codes">
              <Panel><Table label="Codes" cols={codeCols} rows={codes} rowKey={(c) => c.id} /></Panel>
            </Section>
          )}
        </Split>
      </Page>
    </NgoGate>
  );
}

function Invite({ onDone, onClose }: { onDone: (r: Receipt) => Promise<void>; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"lead" | "member" | "volunteer">("member");
  const [busy, setBusy] = useState(false);
  return (
    <form className="og-form" aria-label="Add someone" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const x = await inviteTeam(email, name, role); setBusy(false); if (x.ok) { setEmail(""); setName(""); } await onDone(x); }}>
      <div className="og-two">
        <div className="og-f"><label htmlFor="tm-n">Name</label><input id="tm-n" className="og-in" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="og-f"><label htmlFor="tm-e">Email</label><input id="tm-e" type="email" className="og-in" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      </div>
      <div className="og-f"><span className="og-l">Role</span><Lanes label="Role" value={role} onChange={setRole} lanes={(["member", "lead", "volunteer"] as const).map((k) => ({ id: k, label: ROLE[k] }))} /></div>
      <div className="og-go"><Btn type="submit" variant="primary" disabled={busy}>{busy ? "Sending…" : "Add and send their code"}</Btn>{(email || name) && <Btn disabled={busy} onClick={() => { setEmail(""); setName(""); }}>Clear</Btn>}<Btn variant="quiet" disabled={busy} onClick={onClose}>Close</Btn></div>
      <p className="og-hint">They get a personal code by email. If the email cannot be sent, the code is shown here for you to pass on.</p>
    </form>
  );
}
