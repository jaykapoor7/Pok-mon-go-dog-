"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Loader2, Mail, Plus, Trash2 } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   Creating an organisation and giving its team lead a way in.

   Adding someone mints six characters bound to their name, their email
   and this organisation, and emails it to them. They type it on StrayPaw
   and they are in: no account to create, no password, nothing to wait for.

   From there the lead adds their own people the same way, so this page is
   only ever used once per organisation.

   The code is shown here as well as emailed, because the most common
   failure is an email that never lands and somebody who then has no way
   in at all. Read it out if you have to.

   Every code an organisation holds is listed, including the ones its own
   lead cut for their team and their volunteers. Without that, this page
   answers "who can get in" wrongly the moment an organisation starts
   running itself.
   ════════════════════════════════════════════════════════════════════ */

type Invite = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  code: string | null;
  accepted: boolean;
  revoked: boolean;
  /** How many times this code has been used to sign in. */
  uses: number;
  /** True when the organisation's own lead added them, not this page. */
  by_org: boolean;
};

type VolunteerCode = {
  id: string;
  email: string | null;
  name: string | null;
  code: string;
  active: boolean;
  reports: number;
};
type Org = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  verified: boolean;
  members: number;
  animals: number;
  active_codes: number;
  invites: Invite[];
  volunteer_codes: VolunteerCode[];
};

export function OrgSetup({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [emailFor, setEmailFor] = useState<Record<string, string>>({});
  const [nameFor, setNameFor] = useState<Record<string, string>>({});
  const [minted, setMinted] = useState<{ code: string; email: string } | null>(null);

  const call = useCallback(
    async (init?: RequestInit) => {
      const res = await fetch("/api/admin/orgs", {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      return data;
    },
    [secret]
  );

  const load = useCallback(async () => {
    try {
      const data = await call();
      setOrgs(data.orgs ?? []);
      setError(null);
    } catch (e) {
      setOrgs([]);
      setError(e instanceof Error ? e.message : "Could not load organisations.");
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  async function createOrg() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ action: "create", name, city }),
      });
      setName("");
      setCity("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create it.");
    } finally {
      setBusy(false);
    }
  }

  async function invite(ngoId: string, role: "lead" | "member") {
    const email = (emailFor[ngoId] ?? "").trim();
    const personName = (nameFor[ngoId] ?? "").trim();
    if (!email || !personName) {
      setError("Both a name and an email address are needed.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    setMinted(null);
    try {
      const r = await call({
        method: "POST",
        body: JSON.stringify({ action: "invite", ngoId, email, personName, role }),
      });
      setEmailFor((m) => ({ ...m, [ngoId]: "" }));
      setNameFor((m) => ({ ...m, [ngoId]: "" }));
      if (r.code) setMinted({ code: r.code, email });
      setNote(
        r.emailed
          ? `${personName} has a code, and it has been emailed to ${email}.`
          : `${personName} has a code. No email was sent: RESEND_API_KEY is not set, so pass it on yourself.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not grant access.");
    } finally {
      setBusy(false);
    }
  }

  async function retire(ngoId: string, orgName: string) {
    if (
      !confirm(
        `Delete ${orgName}?\n\nIt disappears from this page and everyone loses access. Any animals, cases and documents it recorded are kept, but they will belong to nobody.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    setMinted(null);
    try {
      const r = await call({
        method: "POST",
        body: JSON.stringify({ action: "retire", ngoId }),
      });
      setNote(r.message ?? `${orgName} removed.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove it.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeCode(id: string) {
    setBusy(true);
    setError(null);
    try {
      await call({ method: "POST", body: JSON.stringify({ action: "revokeCode", id }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn that code off.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(ngoId: string, email: string) {
    setBusy(true);
    try {
      await call({
        method: "POST",
        body: JSON.stringify({ action: "remove", ngoId, email }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove them.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "min-h-[40px] rounded-md border border-black/[0.12] bg-white px-3 text-sm outline-none focus:border-paw-400 dark:border-white/[0.14] dark:bg-bark-900";

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg">
          <Building2 className="h-4 w-4" /> New organisation
        </h2>
        <p className="mb-3 text-[13px] text-bark-500">
          Creates it as verified, ready for you to give someone access below.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organisation name"
            className={`${input} min-w-[200px] flex-1`}
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className={`${input} w-40`}
          />
          <button
            onClick={createOrg}
            disabled={busy || name.trim().length < 2}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-paw-500 px-3 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded bg-status-injured/10 px-4 py-3 text-sm font-medium text-status-injured">
          {error}
        </p>
      )}
      {note && (
        <p className="rounded bg-status-safe/10 px-4 py-3 text-sm font-medium text-status-safe">
          {note}
        </p>
      )}
      {minted && (
        <div className="card p-4 text-center">
          <p className="text-[13px] text-bark-500">
            Code for {minted.email}
          </p>
          <p className="my-1.5 font-mono text-3xl font-bold tracking-[0.18em]">
            {minted.code}
          </p>
          <p className="text-[12.5px] leading-relaxed text-bark-400">
            They enter it at straypaw.org/join. This is how they sign in every
            time, so it keeps working until you turn it off.
          </p>
        </div>
      )}

      {orgs === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-paw-500" />
        </div>
      ) : orgs.length === 0 ? (
        <p className="card p-8 text-center text-sm text-bark-400">
          No organisations created yet.
        </p>
      ) : (
        orgs.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg">
                {o.name}
                {o.city && (
                  <span className="ml-2 text-[13px] font-normal text-bark-400">
                    {o.city}
                  </span>
                )}
              </h3>
              <span className="flex items-center gap-3 text-[12px] text-bark-400">
                <span>
                  {o.members} with access &middot; {o.animals} animals &middot;{" "}
                  {o.active_codes} volunteer code{o.active_codes === 1 ? "" : "s"}
                </span>
                {!o.verified && (
                  <span className="rounded bg-black/[0.06] px-1.5 py-0.5 font-semibold dark:bg-white/[0.09]">
                    retired
                  </span>
                )}
                <button
                  onClick={() => retire(o.id, o.name)}
                  disabled={busy}
                  className="font-semibold text-status-injured hover:underline disabled:opacity-40"
                >
                  Delete organisation
                </button>
              </span>
            </div>

            {/* Both lists tolerate an older admin_list_orgs, from a project
                where the access-code migration has not been run yet. */}
            {(o.invites ?? []).length > 0 && (
              <>
                <h4 className="mb-1 mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-bark-400">
                  Dashboard access
                </h4>
                <ul className="mb-3 divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
                  {(o.invites ?? []).map((i) => (
                    <li
                      key={i.email}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-[13px]"
                    >
                      <span className="min-w-0">
                        <b className="font-semibold">{i.name ?? i.email}</b>
                        {i.name && (
                          <span className="ml-2 text-bark-400">{i.email}</span>
                        )}
                        <span className="ml-2 text-[11.5px] uppercase tracking-wide text-bark-400">
                          {i.role}
                        </span>
                        {i.by_org && (
                          <span className="ml-2 text-[11.5px] text-bark-400">
                            added by the organisation
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {i.code && (
                          <code className="rounded bg-black/[0.05] px-2 py-0.5 font-mono text-[13px] font-semibold tracking-[0.12em] dark:bg-white/[0.08]">
                            {i.code}
                          </code>
                        )}
                        {i.revoked ? (
                          <span className="text-[12px] text-bark-400">removed</span>
                        ) : i.accepted ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-status-safe">
                            <Check className="h-3.5 w-3.5" /> signed in
                            {i.uses > 1 ? ` ${i.uses}\u00d7` : ""}
                          </span>
                        ) : (
                          <span className="text-[12px] text-bark-400">
                            not signed in yet
                          </span>
                        )}
                        <button
                          onClick={() => remove(o.id, i.email)}
                          aria-label={`Remove ${i.email}`}
                          className="rounded p-1.5 text-bark-400 hover:text-status-injured"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(o.volunteer_codes ?? []).length > 0 && (
              <>
                <h4 className="mb-1 mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-bark-400">
                  Volunteer reporting codes
                </h4>
                <ul className="mb-3 divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
                  {(o.volunteer_codes ?? []).map((c) => (
                    <li
                      key={c.id}
                      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-[13px] ${
                        c.active ? "" : "opacity-55"
                      }`}
                    >
                      <span className="min-w-0">
                        <b className="font-semibold">{c.name ?? "Unnamed code"}</b>
                        {c.email && (
                          <span className="ml-2 text-bark-400">{c.email}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <code className="rounded bg-black/[0.05] px-2 py-0.5 font-mono text-[13px] font-semibold tracking-[0.12em] dark:bg-white/[0.08]">
                          {c.code}
                        </code>
                        <span className="text-[12px] text-bark-400">
                          {c.reports} report{c.reports === 1 ? "" : "s"}
                          {!c.active && " \u00b7 turned off"}
                        </span>
                        {c.active && (
                          <button
                            onClick={() => revokeCode(c.id)}
                            aria-label={`Turn off ${c.code}`}
                            className="rounded p-1.5 text-bark-400 hover:text-status-injured"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                value={nameFor[o.id] ?? ""}
                onChange={(e) =>
                  setNameFor((m) => ({ ...m, [o.id]: e.target.value }))
                }
                placeholder="Their full name"
                autoComplete="off"
                className={`${input} min-w-[160px] flex-1`}
              />
              <input
                value={emailFor[o.id] ?? ""}
                onChange={(e) =>
                  setEmailFor((m) => ({ ...m, [o.id]: e.target.value }))
                }
                placeholder="name@organisation.org"
                type="email"
                autoComplete="off"
                className={`${input} min-w-[200px] flex-1`}
              />
              <button
                onClick={() => invite(o.id, "lead")}
                disabled={busy}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-paw-500 px-3 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                <Mail className="h-4 w-4" /> Make team lead
              </button>
              <button
                onClick={() => invite(o.id, "member")}
                disabled={busy}
                className="min-h-[40px] rounded-md border border-black/[0.12] px-3 text-[13px] font-semibold disabled:opacity-40 dark:border-white/[0.14]"
              >
                Add as member
              </button>
            </div>
            <p className="mt-2 text-[12px] text-bark-400">
              A team lead can add the rest of their own team, so normally you
              only do this once per organisation. Every code stays listed
              above, including the ones they issue.
            </p>
          </div>
        ))
      )}
    </div>
  );
}
