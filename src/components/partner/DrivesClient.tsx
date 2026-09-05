"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, CalendarRange, Loader2, MapPin, Plus, Users } from "lucide-react";
import {
  archiveCampaign,
  createCampaign,
  orgCampaigns,
  KIND_LABEL,
  type CampaignKind,
  type CampaignStats,
} from "@/lib/campaigns";

/* ════════════════════════════════════════════════════════════════════
   Drives.

   A sterilisation rate across everything an organisation has ever
   recorded is not a number anybody funds or reports against. What gets
   reported is a drive: three days in one ward, a census, a rabies round.
   Each one carries its own coverage figure here.

   Two percentages on every card, deliberately. Coverage of the animals
   whose status was actually established is the honest number; coverage of
   everything recorded is the one that gets quoted. Showing both, labelled,
   is what stops the unknowns from quietly becoming negatives.
   ════════════════════════════════════════════════════════════════════ */

const KINDS: CampaignKind[] = [
  "sterilisation",
  "vaccination",
  "census",
  "treatment",
  "other",
];

function pct(n: number | null) {
  return n === null ? "—" : `${n}%`;
}

function dates(c: CampaignStats) {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (c.starts_on && c.ends_on && c.starts_on !== c.ends_on)
    return `${fmt(c.starts_on)} to ${fmt(c.ends_on)}`;
  if (c.starts_on) return fmt(c.starts_on);
  return "No dates set";
}

export function DrivesClient() {
  const [rows, setRows] = useState<CampaignStats[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CampaignKind>("sterilisation");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [zone, setZone] = useState("");

  async function load() {
    setRows(await orgCampaigns(showArchived));
  }

  useEffect(() => {
    load().catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  async function add() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await createCampaign({ name, kind, startsOn, endsOn, zone });
      setName("");
      setStartsOn("");
      setEndsOn("");
      setZone("");
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create it.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(c: CampaignStats) {
    try {
      await archiveCampaign(c.id, !c.archived);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change it.");
    }
  }

  return (
    <>
      <div className="dr-head">
        <button
          type="button"
          className="spa-cta"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus size={15} /> New drive
        </button>
        <label className="dr-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show finished drives
        </label>
      </div>

      {adding && (
        <div className="dr-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What this drive is called, for example Kotturpuram round 1"
            aria-label="Drive name"
          />
          <div className="dr-form-row">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CampaignKind)}
              aria-label="Kind of work"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ward or area"
              aria-label="Ward or area"
            />
          </div>
          <div className="dr-form-row">
            <label>
              Starts
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </label>
            <label>
              Ends
              <input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="spa-cta"
            onClick={add}
            disabled={busy || name.trim().length < 2}
          >
            {busy ? <Loader2 size={14} className="imp-spin" /> : <Plus size={14} />}
            Create drive
          </button>
        </div>
      )}

      {error && <p className="res-error">{error}</p>}

      {rows === null ? (
        <div className="spa-empty">
          <Loader2 size={26} className="imp-spin" />
          <p>Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="spa-empty">
          <CalendarRange size={40} strokeWidth={1.25} />
          <h2>No drives yet</h2>
          <p>
            Create one for the next piece of work: a ward census, a
            sterilisation round, a rabies drive. Then file what your team
            reports against it, and it gets a coverage figure of its own.
          </p>
        </div>
      ) : (
        <div className="dr-grid">
          {rows.map((c) => (
            <div key={c.id} className={`dr-card ${c.archived ? "off" : ""}`}>
              <div className="dr-card-top">
                <Link href={`/partner/drives/${c.id}`} className="dr-name">
                  {c.name}
                </Link>
                <span className="dr-kind">{KIND_LABEL[c.kind]}</span>
              </div>

              <p className="dr-meta">
                <CalendarRange size={13} /> {dates(c)}
                {c.zone && (
                  <>
                    {" · "}
                    <MapPin size={13} /> {c.zone}
                  </>
                )}
              </p>

              <div className="dr-figures">
                <span>
                  <b>{c.total}</b> animals
                </span>
                <span>
                  <b className="good">{c.sterilised}</b> sterilised
                </span>
                <span>
                  <b className="warn">{c.not_sterilised}</b> not
                </span>
                <span>
                  <b className="muted">{c.ster_unknown}</b> unknown
                </span>
              </div>

              <p className="dr-rate">
                <b>{pct(c.ster_pct_of_known)}</b> of the animals whose status
                you established are sterilised
                {c.ster_unknown > 0 && (
                  <>
                    , <b>{pct(c.ster_pct_of_all)}</b> of everything recorded in
                    this drive
                  </>
                )}
                .
              </p>

              <div className="dr-figures">
                <span>
                  <b className="good">{c.vaccinated}</b> vaccinated
                </span>
                <span>
                  <b className="warn">{c.not_vaccinated}</b> not
                </span>
                <span>
                  <b className="muted">{c.vacc_unknown}</b> unknown
                </span>
                <span>
                  <b>{pct(c.vacc_pct_of_known)}</b> of those checked
                </span>
              </div>

              <p className="dr-foot">
                <span>
                  {c.observations} observation{c.observations === 1 ? "" : "s"}
                </span>
                {c.people > 0 && (
                  <span>
                    <Users size={12} /> {c.people}{" "}
                    {c.people === 1 ? "person" : "people"}
                  </span>
                )}
                <Link href={`/partner/drives/${c.id}`}>Open</Link>
                <button type="button" onClick={() => toggleArchive(c)}>
                  <Archive size={12} /> {c.archived ? "Reopen" : "Mark finished"}
                </button>
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
