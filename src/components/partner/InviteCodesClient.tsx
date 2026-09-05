"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, UserPlus, Users } from "lucide-react";
import {
  createTeamCode,
  myProfile,
  orgTeamCodes,
  orgReportingVolunteers,
  revokeTeamCode,
  type Profile,
  type TeamCode,
} from "@/lib/programme";

/* ════════════════════════════════════════════════════════════════════
   The people in this organisation, and the code each of them holds.

   Adding someone takes a name, an email and a role, and produces six
   characters. They type those on StrayPaw and they are in. Nobody creates
   an account, chooses a password, or waits for a link to arrive.

   The role decides what the code opens, and the difference matters:

     Team lead      the dashboard, and the ability to add people
     Team member    the dashboard
     Volunteer      reporting only, attributed to their name

   A staff code works once and then stops, because using it opens a
   session. A volunteer's code keeps working, because a phone that is
   wiped mid-drive has to be able to type it again.
   ════════════════════════════════════════════════════════════════════ */

type Role = "lead" | "member" | "volunteer";

const ROLE_COPY: Record<Role, { label: string; note: string }> = {
  lead: { label: "Team lead", note: "Full dashboard, and can add people." },
  member: { label: "Team member", note: "Full dashboard." },
  volunteer: { label: "Volunteer", note: "Reporting only, no dashboard." },
};

export function InviteCodesClient() {
  const [rows, setRows] = useState<TeamCode[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [people, setPeople] = useState<
    { volunteer_name: string; reports: number; last_report: string }[]
  >([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("volunteer");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ code: string; name: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const [t, p, v] = await Promise.all([
      orgTeamCodes(),
      myProfile(),
      orgReportingVolunteers().catch(() => []),
    ]);
    setRows(t);
    setProfile(p);
    setPeople(v);
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  async function add() {
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createTeamCode(email, name, role);
      setFresh({ code: r.code, name: name.trim() });
      setName("");
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add them.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await revokeTeamCode(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn that off.");
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* Clipboard blocked. The code is on screen to read out anyway. */
    }
  }

  const canAddStaff = profile?.is_lead !== false;

  return (
    <>
      <div className="imp-drop">
        <UserPlus size={26} strokeWidth={1.3} />
        <div>
          <b>Add someone to {profile?.org_name ?? "your organisation"}</b>
          <span>
            Their name, their email, and what they do. StrayPaw gives you six
            characters to pass on. They type those and they are in.
          </span>
        </div>

        <div className="team-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            disabled={busy}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@organisation.org"
            aria-label="Email address"
            type="email"
            autoComplete="off"
            disabled={busy}
          />
          <div className="team-roles" role="group" aria-label="What they do">
            {(Object.keys(ROLE_COPY) as Role[]).map((r) => {
              const disabled = r !== "volunteer" && !canAddStaff;
              return (
                <button
                  key={r}
                  type="button"
                  className={role === r ? "on" : ""}
                  aria-pressed={role === r}
                  disabled={busy || disabled}
                  title={disabled ? "Only a team lead can do this" : ROLE_COPY[r].note}
                  onClick={() => setRole(r)}
                >
                  {ROLE_COPY[r].label}
                </button>
              );
            })}
          </div>
          <p className="team-rolenote">{ROLE_COPY[role].note}</p>
          <button
            type="button"
            className="spa-cta"
            onClick={add}
            disabled={busy || !name.trim() || !email.trim()}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="imp-spin" /> Creating a code…
              </>
            ) : (
              <>
                <KeyRound size={14} /> Create their code
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className="res-error">{error}</p>}

      {fresh && (
        <div className="team-fresh">
          <p>
            <b>{fresh.name}</b>&rsquo;s code
          </p>
          <button type="button" className="team-freshcode" onClick={() => copy(fresh.code)}>
            {fresh.code}
            {copied === fresh.code ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <p className="team-freshnote">
            Send it to them however you already talk to them. They open
            straypaw.org, choose &ldquo;I have a code&rdquo;, and type it in.
          </p>
        </div>
      )}

      {rows === null ? (
        <div className="spa-empty">
          <Loader2 size={26} className="imp-spin" />
          <p>Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="spa-empty">
          <Users size={40} strokeWidth={1.25} />
          <h2>Nobody added yet</h2>
          <p>
            Add your first person above. Field volunteers need nothing but the
            code and their own phone.
          </p>
        </div>
      ) : (
        <ul className="code-list">
          {rows.map((r) => (
            <li key={r.id} className={`code-row ${r.active ? "" : "off"}`}>
              <div className="code-main">
                <span className="code-person">
                  {r.person_name || "Unnamed code"}
                  <small>{r.email ?? ROLE_COPY[r.role].label}</small>
                </span>
                {r.code ? (
                  <button
                    type="button"
                    className="code-value"
                    onClick={() => copy(r.code as string)}
                    title="Copy this code"
                  >
                    {r.code}
                    {copied === r.code ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                ) : (
                  <span className="code-used">code used</span>
                )}
              </div>
              <span className="code-meta">
                {ROLE_COPY[r.role].label}
                {r.kind === "volunteer" &&
                  ` · ${r.reports} report${r.reports === 1 ? "" : "s"}`}
                {r.kind === "staff" && r.accepted && " · signed in"}
                {!r.active && r.kind === "volunteer" && " · turned off"}
              </span>
              {(r.active || r.accepted) && (
                <button type="button" className="res-editbtn" onClick={() => revoke(r.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {people.length > 0 && (
        <section className="code-people">
          <h2>
            <Users size={15} /> Who has been reporting
          </h2>
          <ul>
            {people.map((p) => (
              <li key={p.volunteer_name}>
                <b>{p.volunteer_name}</b>
                <span>
                  {p.reports} report{p.reports === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
