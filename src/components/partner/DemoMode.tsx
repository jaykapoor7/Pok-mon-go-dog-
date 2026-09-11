"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { myProfile } from "@/lib/programme";

/* ════════════════════════════════════════════════════════════════════
   Demo mode.

   An organisation trying StrayPaw wants to put a few invented animals and
   cases through it to see how the thing behaves, and that must not land in
   the public record — the map, the feed and every count on the landing
   page are supposed to be real.

   The switch itself lives on the organisation's row, and the stamping is
   done by a database trigger rather than by the code that inserts. That
   matters here: this component is a switch, not a gatekeeper. If it were
   the thing deciding what counts as demo data, every one of the dozen
   places an organisation can create something would have to remember to
   ask it, and one of them would not.

   Both calls go through the signed-in session rather than the server key,
   because the functions behind them decide what to allow from who is
   asking, and the server key is nobody.
   ════════════════════════════════════════════════════════════════════ */

type Counts = { dogs: number; cases: number; sightings: number };

export function DemoMode() {
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [busy, setBusy] = useState<"toggle" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (id: string) => {
    const supa = getSupabase();
    if (!supa) return;
    const [{ data: org }, dogs, cases, sightings] = await Promise.all([
      supa.from("ngos").select("demo_mode").eq("id", id).maybeSingle(),
      supa.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", id).eq("is_demo", true),
      supa.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", id).eq("is_demo", true),
      supa.from("sightings").select("id", { count: "exact", head: true }).eq("ngo_id", id).eq("is_demo", true),
    ]);
    setOn(Boolean(org?.demo_mode));
    setCounts({
      dogs: dogs.count ?? 0,
      cases: cases.count ?? 0,
      sightings: sightings.count ?? 0,
    });
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const profile = await myProfile();
      if (!live) return;
      if (!profile.ngo_id) { setReady(true); return; }
      setNgoId(profile.ngo_id);
      await load(profile.ngo_id);
      if (live) setReady(true);
    })();
    return () => { live = false; };
  }, [load]);

  async function toggle() {
    if (!ngoId) return;
    const supa = getSupabase();
    if (!supa) return;
    setBusy("toggle");
    setError(null);
    const next = !on;
    const { data, error: rpcError } = await supa.rpc("set_demo_mode", { p_ngo: ngoId, p_on: next });
    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (rpcError || !result.ok) {
      /* The function not being there is the migration case, and saying
         "something went wrong" would send somebody looking in the wrong
         place for an afternoon. */
      setError(
        /function|does not exist|schema cache/i.test(rpcError?.message ?? "")
          ? "Demo mode is not installed on this database yet. Run demo-mode.sql."
          : result.error ?? rpcError?.message ?? "Could not change demo mode."
      );
    } else {
      setOn(next);
    }
    setBusy(null);
  }

  async function clear() {
    if (!ngoId) return;
    const supa = getSupabase();
    if (!supa) return;
    setBusy("clear");
    setError(null);
    const { data, error: rpcError } = await supa.rpc("clear_demo_data", { p_ngo: ngoId });
    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (rpcError || !result.ok) {
      setError(result.error ?? rpcError?.message ?? "Could not clear the demo data.");
    } else {
      await load(ngoId);
    }
    setConfirming(false);
    setBusy(null);
  }

  if (!ready || !ngoId) return null;

  const total = counts ? counts.dogs + counts.cases + counts.sightings : 0;

  return (
    <section className="demo-mode" aria-labelledby="demo-mode-title">
      <div className="demo-mode-head">
        <FlaskConical size={18} aria-hidden />
        <div>
          <h2 id="demo-mode-title">Demo mode</h2>
          <p>
            Try the dashboard with invented animals and cases. While it is on,
            everything your team creates is marked as practice and stays out of
            the public map, the feed and every count on StrayPaw. Your own
            screens still show it.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Demo mode"
          className={`demo-switch${on ? " on" : ""}`}
          onClick={toggle}
          disabled={busy !== null}
        >
          <span className="demo-switch-knob">
            {busy === "toggle" && <Loader2 size={11} className="demo-spin" aria-hidden />}
          </span>
        </button>
      </div>

      <p className="demo-mode-state">
        {on
          ? "On. New records are practice data."
          : "Off. New records go on the real record."}
      </p>

      {total > 0 && (
        <div className="demo-mode-clear">
          <p>
            <b>{total} practice {total === 1 ? "record" : "records"}</b> on your
            dashboard: {counts?.dogs ?? 0} animals, {counts?.cases ?? 0} cases,{" "}
            {counts?.sightings ?? 0} sightings. Nobody outside your organisation
            can see them.
          </p>
          {confirming ? (
            <div className="demo-confirm">
              <span>Delete all {total}? This cannot be undone.</span>
              <button type="button" className="demo-danger" onClick={clear} disabled={busy !== null}>
                {busy === "clear" ? <Loader2 size={13} className="demo-spin" /> : <Trash2 size={13} />}
                Delete them
              </button>
              <button type="button" className="demo-cancel" onClick={() => setConfirming(false)} disabled={busy !== null}>
                Keep them
              </button>
            </div>
          ) : (
            <button type="button" className="demo-clear-btn" onClick={() => setConfirming(true)}>
              <Trash2 size={13} /> Clear practice data
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="demo-mode-error" role="alert">
          <AlertTriangle size={14} aria-hidden /> {error}
        </p>
      )}
    </section>
  );
}
