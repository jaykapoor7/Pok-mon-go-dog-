"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Loader2, Mail, Plus, Trash2 } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   Creating an organisation and giving people access to it.

   Access is granted to an email address, not to an account, so the order
   never matters: invite first and they are joined the moment they sign up
   with that address, or invite someone who already has an account and they
   are joined immediately. Nobody has to sign up, tell you, and wait for a
   second step.

   Each grant sends them an email through StrayPaw's own sending domain
   with a link into the dashboard.
   ════════════════════════════════════════════════════════════════════ */

type Invite = { email: string; role: string; accepted: boolean };
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
};

export function OrgSetup({ secret }: { secret: string }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [emailFor, setEmailFor] = useState<Record<string, string>>({});

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
    if (!email) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await call({
        method: "POST",
        body: JSON.stringify({ action: "invite", ngoId, email, role }),
      });
      setEmailFor((m) => ({ ...m, [ngoId]: "" }));
      setNote(
        r.emailed
          ? `${email} now has access and has been emailed a link.`
          : `${email} now has access. No email was sent: RESEND_API_KEY is not set, so tell them directly.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not grant access.");
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

      {orgs === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-paw-500" />
        </div>
      ) : orgs.length === 0 ? (
        <p className="card p-8 text-center text-sm text-bark-400">
          No organisations yet.
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
              <span className="text-[12px] text-bark-400">
                {o.members} with access &middot; {o.animals} animals &middot;{" "}
                {o.active_codes} volunteer code{o.active_codes === 1 ? "" : "s"}
              </span>
            </div>

            {o.invites.length > 0 && (
              <ul className="mb-3 divide-y divide-black/[0.06] border-y border-black/[0.06] dark:divide-white/[0.08] dark:border-white/[0.08]">
                {o.invites.map((i) => (
                  <li
                    key={i.email}
                    className="flex items-center justify-between gap-3 py-2 text-[13px]"
                  >
                    <span className="min-w-0 truncate">
                      {i.email}
                      <span className="ml-2 text-[11.5px] uppercase tracking-wide text-bark-400">
                        {i.role}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {i.accepted ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-status-safe">
                          <Check className="h-3.5 w-3.5" /> signed in
                        </span>
                      ) : (
                        <span className="text-[12px] text-bark-400">
                          waiting for first sign-in
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
            )}

            <div className="flex flex-wrap gap-2">
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
                <Mail className="h-4 w-4" /> Give admin access
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
              They do not need an account yet. Access is attached to the address
              and applies the first time they sign in with it.
            </p>
          </div>
        ))
      )}
    </div>
  );
}
