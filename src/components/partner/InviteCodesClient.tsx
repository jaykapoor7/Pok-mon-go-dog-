"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plus, Users } from "lucide-react";
import {
  createInviteCode,
  myInviteCodes,
  revokeInviteCode,
  orgReportingVolunteers,
  type InviteCode,
} from "@/lib/programme";

/* ════════════════════════════════════════════════════════════════════
   Volunteer codes.

   A volunteer types one of these plus their name, once, and everything
   they file afterwards is attributed to this organisation and to them. No
   account, no password, no email round trip: the people doing fieldwork
   are standing outside with one hand free.

   A code is a credential, so it is revocable and its use is counted. Mint
   one per drive or per team and turn it off when that work ends, rather
   than running one code forever.
   ════════════════════════════════════════════════════════════════════ */

export function InviteCodesClient() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null);
  const [people, setPeople] = useState<
    { volunteer_name: string; reports: number; last_report: string }[]
  >([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const [c, p] = await Promise.all([
      myInviteCodes(),
      orgReportingVolunteers().catch(() => []),
    ]);
    setCodes(c);
    setPeople(p);
  }

  useEffect(() => {
    load().catch(() => setCodes([]));
  }, []);

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      await createInviteCode(label);
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a code.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await revokeInviteCode(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke that code.");
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

  return (
    <>
      <div className="imp-drop">
        <KeyRound size={26} strokeWidth={1.3} />
        <div>
          <b>Create a volunteer code</b>
          <span>
            Share it with your field team. They enter it once with their name,
            and everything they report comes to this dashboard.
          </span>
        </div>
        <div className="res-controls">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What it is for (optional)"
            aria-label="Code label"
            disabled={busy}
          />
          <button type="button" className="spa-cta" onClick={mint} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={14} className="imp-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus size={14} /> New code
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className="res-error">{error}</p>}

      {codes === null ? (
        <div className="spa-empty">
          <Loader2 size={26} className="imp-spin" />
          <p>Loading…</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="spa-empty">
          <KeyRound size={40} strokeWidth={1.25} />
          <h2>No volunteer codes yet</h2>
          <p>
            Create one and give it to your field team. They will not need
            accounts, and their reports will still be attributed to them by
            name.
          </p>
        </div>
      ) : (
        <ul className="code-list">
          {codes.map((c) => (
            <li key={c.id} className={`code-row ${c.active ? "" : "off"}`}>
              <div className="code-main">
                <button
                  type="button"
                  className="code-value"
                  onClick={() => copy(c.code)}
                  title="Copy this code"
                >
                  {c.code}
                  {copied === c.code ? <Check size={13} /> : <Copy size={13} />}
                </button>
                {c.label && <span className="code-label">{c.label}</span>}
              </div>
              <span className="code-meta">
                {c.reports} report{c.reports === 1 ? "" : "s"}
                {c.volunteers > 0 && ` · ${c.volunteers} volunteer${c.volunteers === 1 ? "" : "s"}`}
                {!c.active && " · turned off"}
              </span>
              {c.active && (
                <button
                  type="button"
                  className="res-editbtn"
                  onClick={() => revoke(c.id)}
                >
                  Turn off
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
