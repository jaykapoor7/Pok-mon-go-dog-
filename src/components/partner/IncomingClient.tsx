"use client";

import { Fragment, useEffect, useState } from "react";
import { HeartPulse, Inbox, Loader2, MapPin } from "lucide-react";
import {
  fileToCampaign,
  orgCampaigns,
  orgIncoming,
  KIND_LABEL,
  type CampaignStats,
  type Incoming,
} from "@/lib/campaigns";
import { timeAgo } from "@/lib/utils";
import { HairlineFigure } from "@/components/hairline/HairlineFigure";

/* ════════════════════════════════════════════════════════════════════
   Incoming.

   Nothing reaches the dashboard on its own. Two lists, kept apart because
   they need different decisions:

     Your team   a volunteer holding your code filed it. It is yours
                 already; somebody has to say which drive it belongs to.
     Community   nobody owns it. Taking it on is a choice, so it is a
                 separate list and a separate button that says so.

   Filing is what puts an animal on your register and starts it counting.
   Selection is explicit and the button says how many: bulk-claiming a
   whole community list by accident is the one expensive mistake here.
   ════════════════════════════════════════════════════════════════════ */

const STER_LABEL: Record<string, string> = {
  sterilised: "Sterilised",
  not_sterilised: "Not sterilised",
  unknown: "Sterilisation unknown",
};
const VACC_LABEL: Record<string, string> = {
  vaccinated: "Vaccinated",
  not_vaccinated: "Not vaccinated",
  unknown: "Vaccination unknown",
};
function careNeed(tags: string[] | null) {
  if (tags?.includes("injured")) return "Hurt or sick";
  if (tags?.includes("hungry")) return "Thin or hungry";
  if (tags?.includes("puppies")) return "Puppies nearby";
  return null;
}

export function IncomingClient() {
  const [source, setSource] = useState<"ours" | "community">("ours");
  const [rows, setRows] = useState<Incoming[] | null>(null);
  const [drives, setDrives] = useState<CampaignStats[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [driveId, setDriveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const [r, d] = await Promise.all([orgIncoming(source), orgCampaigns(false)]);
    setRows(r);
    setDrives(d);
    setPicked(new Set());
    if (!driveId && d.length) setDriveId(d[0].id);
  }

  useEffect(() => {
    setRows(null);
    load().catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setPicked((prev) =>
      prev.size === (rows?.length ?? 0)
        ? new Set()
        : new Set((rows ?? []).map((r) => r.id))
    );
  }

  async function file() {
    if (!driveId || picked.size === 0) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await fileToCampaign(
        [...picked],
        driveId,
        source === "community"
      );
      setNote(
        source === "community"
          ? `${r.filed} community ${r.filed === 1 ? "report is" : "reports are"} now in your team's work for ${drive?.name ?? "this drive"}. ${r.registered} ${r.registered === 1 ? "animal is" : "animals are"} now on your register.`
          : `${r.filed} filed. ${r.registered} ${r.registered === 1 ? "animal is" : "animals are"} now on your register and counting towards this drive.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not file them.");
    } finally {
      setBusy(false);
    }
  }

  const drive = drives.find((d) => d.id === driveId);
  const careRows = source === "community" ? (rows ?? []).filter((r) => Boolean(careNeed(r.mood_tags))) : [];
  const observationRows = source === "community" ? (rows ?? []).filter((r) => !careNeed(r.mood_tags)) : (rows ?? []);
  const orderedRows = source === "community" ? [...careRows, ...observationRows] : observationRows;

  return (
    <>
      <div className="inc-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={source === "ours"}
          className={source === "ours" ? "on" : ""}
          onClick={() => setSource("ours")}
        >
          From your team
        </button>
        <button
          role="tab"
          aria-selected={source === "community"}
          className={source === "community" ? "on" : ""}
          onClick={() => setSource("community")}
        >
          Community sightings
        </button>
      </div>

      <p className="inc-lede">
        {source === "ours"
          ? "Filed by somebody using one of your codes. Choose which drive each belongs to and they join your register."
          : "Reports from people on the street. Take one on only when your team can own the next step; filing it starts a traceable record in the right drive."}
      </p>

      {source === "community" && rows !== null && (
        <section className="inc-intake" aria-label="Community report overview">
          <div><HeartPulse size={18} aria-hidden /><span>Needs a first look</span></div>
          <b>{careRows.length}</b>
          <p>{careRows.length === 1 ? "One report carries a care signal." : `${careRows.length} reports carry care signals.`} Claiming makes the next step your team&apos;s responsibility.</p>
        </section>
      )}

      {drives.length === 0 ? (
        <div className="spa-empty">
          <Inbox size={40} strokeWidth={1.25} />
          <h2>Make a drive first</h2>
          <p>
            Observations get filed against a drive, so there has to be one to
            file them into. Create it on the Drives page, then come back.
          </p>
        </div>
      ) : (
        <div className="inc-bar">
          <label>
            File into
            <select value={driveId} onChange={(e) => setDriveId(e.target.value)}>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {KIND_LABEL[d.kind]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="spa-cta"
            onClick={file}
            disabled={busy || picked.size === 0 || !driveId}
          >
            {busy ? <Loader2 size={14} className="imp-spin" /> : null}
            {source === "community" ? "Take on and file" : "File"} {picked.size}
            {picked.size === 1 ? " report" : " reports"}
            {drive ? ` into ${drive.name}` : ""}
          </button>
        </div>
      )}

      {error && <p className="res-error">{error}</p>}
      {note && <p className="inc-note">{note}</p>}

      {rows === null ? (
        <div className="spa-empty">
          <Loader2 size={26} className="imp-spin" />
          <p>Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="spa-empty">
          <HairlineFigure kind="empty" className="spa-empty-figure" label="An open, empty case drawer: no reports are waiting to be filed." />
          <h2>No reports waiting to be filed</h2>
          <p>
            {source === "ours"
              ? "Everything your team has sent in has been filed."
              : "No unclaimed community sightings right now."}
          </p>
        </div>
      ) : (
        <>
          <button type="button" className="inc-all" onClick={toggleAll}>
            {picked.size === rows.length ? "Clear selection" : `Select all ${rows.length}`}
          </button>
          <ul className="inc-list">
            {orderedRows.map((r, index) => {
              const on = picked.has(r.id);
              const need = careNeed(r.mood_tags);
              const groupStart = source === "community" && (
                (index === 0 && careRows.length > 0) ||
                (index === careRows.length && observationRows.length > 0)
              );
              return (
                <Fragment key={r.id}>
                  {groupStart && <li className="inc-group">{index === 0 ? "Care requests" : "Other community reports"}</li>}
                  <li className={`${on ? "on" : ""}${need ? " is-care" : ""}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(r.id)}
                      />
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photo_url} alt="" loading="lazy" />
                      ) : (
                        <span className="inc-nophoto" aria-hidden />
                      )}
                      <span className="inc-body">
                        <b>{r.nickname || "Unnamed"}</b>
                        <span className="inc-meta">
                          {r.zone && (
                            <>
                              <MapPin size={12} /> {r.zone} ·{" "}
                            </>
                          )}
                          {r.reported_by} · {timeAgo(r.created_at)}
                        </span>
                        {need && <span className="inc-care"><HeartPulse size={12} /> {need}</span>}
                        <span className="inc-tags">
                          <i className={r.sterilisation_status ?? "unknown"}>
                            {STER_LABEL[r.sterilisation_status ?? "unknown"]}
                          </i>
                          <i className={r.vaccination_status ?? "unknown"}>
                            {VACC_LABEL[r.vaccination_status ?? "unknown"]}
                          </i>
                        </span>
                        {r.notes && <span className="inc-notes">{r.notes}</span>}
                      </span>
                    </label>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
