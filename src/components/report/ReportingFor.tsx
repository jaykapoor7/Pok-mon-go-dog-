"use client";

import { useState } from "react";
import { Building2, Check, Loader2, User, X } from "lucide-react";
import {
  clearVolunteer,
  saveVolunteer,
  verifyCode,
  type VolunteerSession,
} from "@/lib/volunteer";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════
   Who this report is being filed by.

   Two paths, and the public one is the default because most people
   reporting a dog are not attached to anything. Nobody is asked to create
   an account either way.

   The organisation path costs a code and a name, once, and both are then
   remembered on the device. The code is what decides the organisation:
   it is checked against the server here so the volunteer sees the
   organisation's real name before they file anything, and it is checked
   again on every submission.
   ════════════════════════════════════════════════════════════════════ */

export function ReportingFor({
  volunteer,
  onChange,
}: {
  volunteer: VolunteerSession | null;
  onChange: (v: VolunteerSession | null) => void;
}) {
  const [opening, setOpening] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkCode() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const r = await verifyCode(trimmed);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setOrgName(null);
      return;
    }
    setOrgName(r.orgName);
    /* A code cut for one person already knows who they are. Filling it in
       beats asking them to type a name the organisation has on file. */
    if (r.volunteerName && !name.trim()) setName(r.volunteerName);
  }

  function confirm() {
    const n = name.trim();
    if (!orgName || n.length < 2) return;
    const session = { code: code.trim().toUpperCase(), name: n, orgName };
    saveVolunteer(session);
    onChange(session);
    setOpening(false);
    setCode("");
    setName("");
    setOrgName(null);
  }

  /* Already set up: one line confirming where the report is going, and a
     way out. Nothing here should nag someone who has done this before. */
  if (volunteer) {
    return (
      <div className="flex items-center gap-3 rounded border border-paw-300 bg-paw-50 px-3.5 py-3 dark:border-paw-500/40 dark:bg-paw-500/10">
        <Building2 className="h-4 w-4 shrink-0 text-paw-600 dark:text-paw-300" />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">
          Reporting for <b>{volunteer.orgName}</b> as{" "}
          <b>{volunteer.name}</b>
        </p>
        <button
          type="button"
          onClick={() => {
            clearVolunteer();
            onChange(null);
          }}
          className="shrink-0 rounded px-2 py-2 text-xs font-semibold text-bark-500 hover:text-bark-800 dark:hover:text-bark-100"
        >
          Switch
        </button>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded border border-bark-200 px-3.5 py-3 dark:border-white/10">
        <User className="h-4 w-4 shrink-0 text-bark-400" />
        <p className="min-w-0 flex-1 text-[13px] text-bark-500">
          Reporting as a member of the public. No account needed.
        </p>
        <button
          type="button"
          onClick={() => setOpening(true)}
          className="shrink-0 rounded border border-bark-200 px-3 py-2 text-xs font-semibold hover:border-paw-300 dark:border-white/10"
        >
          Reporting for an NGO?
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded border border-bark-200 p-3.5 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <b className="text-sm">Report for an organisation</b>
          <p className="mt-0.5 text-xs text-bark-400">
            Enter the code your organisation gave you. No account, no password.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpening(false);
            setError(null);
            setOrgName(null);
          }}
          aria-label="Close"
          className="rounded p-2 text-bark-400 hover:text-bark-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold" htmlFor="vol-code">
          Organisation code
        </label>
        <div className="flex gap-2">
          <input
            id="vol-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setOrgName(null);
              setError(null);
            }}
            placeholder="PAWS-7K2M"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[46px] flex-1 rounded border border-bark-200 bg-white px-3 font-mono text-sm uppercase tracking-wider outline-none focus:border-paw-400 dark:border-white/10 dark:bg-bark-900"
          />
          <button
            type="button"
            onClick={checkCode}
            disabled={busy || code.trim().length < 3}
            className="min-h-[46px] shrink-0 rounded bg-paw-500 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs font-medium text-status-injured">{error}</p>}
      </div>

      {orgName && (
        <>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-status-safe">
            <Check className="h-3.5 w-3.5" /> {orgName}
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="vol-name">
              Your name
            </label>
            <input
              id="vol-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="So your team knows who recorded it"
              autoComplete="name"
              className="min-h-[46px] w-full rounded border border-bark-200 bg-white px-3 text-sm outline-none focus:border-paw-400 dark:border-white/10 dark:bg-bark-900"
            />
            <p className="mt-1 text-xs text-bark-400">
              Asked once. This device will remember it.
            </p>
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={name.trim().length < 2}
            className={cn(
              "min-h-[46px] w-full rounded bg-paw-500 text-sm font-semibold text-white",
              name.trim().length < 2 && "opacity-40"
            )}
          >
            Report for {orgName}
          </button>
        </>
      )}
    </div>
  );
}
