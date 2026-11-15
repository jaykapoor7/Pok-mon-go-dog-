"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "../Shell";
import { Chip } from "../ui";
import { Denied, Empty, Field, Modal, Skeleton, dayTime, useAct } from "../kit";
import { useLive } from "../live";
import { getSupabase } from "@/lib/supabase";

/* People asking to join an organisation you lead. You decide, and you choose their role: roles with clinical,
   laboratory or government authority are given only here, by a lead, never chosen by the person asking. */

type Req = { id: string; org_id: string; org_kind: "ngo" | "oh"; user_id: string; display_name: string | null; note: string | null; status: string; role: string | null; created_at: string; decided_at: string | null };
const NGO_ROLES: [string, string][] = [["member", "Member"], ["field_worker", "Field worker"], ["coordinator", "Coordinator"], ["veterinarian", "Veterinarian"]];
const OH_ROLES: Record<string, [string, string][]> = {
  hospital: [["records", "Records"], ["nurse", "Nurse"], ["clinician", "Clinician"], ["coordinator", "Coordinator"]],
  clinic: [["records", "Records"], ["nurse", "Nurse"], ["clinician", "Clinician"], ["coordinator", "Coordinator"]],
  veterinary: [["records", "Front desk"], ["nurse", "Veterinary nurse"], ["clinician", "Veterinarian"], ["coordinator", "Coordinator"]],
  laboratory: [["records", "Records"], ["lab_scientist", "Laboratory scientist"], ["coordinator", "Coordinator"]],
  research: [["analyst", "Analyst"], ["coordinator", "Coordinator"]],
};

export function JoinRequests() {
  const live = useLive();
  const db = getSupabase();
  const [rows, setRows] = useState<Req[] | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const [deciding, setDeciding] = useState<Req | null>(null);
  const [role, setRole] = useState("member");
  const { busy, run } = useAct();
  useEffect(() => { if (!db || !live.signedIn) return; void db.from("nx_join_requests").select("id,org_id,org_kind,user_id,display_name,note,status,role,created_at,decided_at").neq("user_id", live.userId ?? "").order("created_at", { ascending: false }).limit(100).then(({ data, error }) => setRows(error ? [] : (data ?? []) as Req[])); }, [db, live.signedIn, live.userId, tick]);
  const orgOf = (id: string) => live.orgs.find((o) => o.org_id === id);
  const roles = (r: Req) => (r.org_kind === "ngo" ? NGO_ROLES : OH_ROLES[orgOf(r.org_id)?.kind ?? ""] ?? [["records", "Records"]]);
  const lead = live.orgs.some((o) => ["admin", "lead"].includes(o.role));
  return (
    <Shell crumb={["Organisation", "Requests to join"]}>
      <div className="nx-page" style={{ maxWidth: 860 }}>
        <div className="nx-head"><div><p className="nx-eyebrow">For leads</p><h1 className="nx-h1">Requests to join</h1><p className="nx-sub">People who found your organisation and asked to join. Nothing is shared with them until you accept, and you choose their role.</p></div></div>
        {!live.ready || rows === null ? <Skeleton /> : !live.signedIn || !lead ? <Denied what="Only an organisation's leads see requests to join" /> : !rows.length ? <Empty title="No requests" hint="When someone asks to join from the Start page, you are notified and they appear here." /> : (
          <ul className="nx-dreq">{rows.map((r) => <li key={r.id}>
            <div className="nx-dreq-h"><b>{r.display_name ?? "Someone"}</b><Chip tone={r.status === "requested" ? "warn" : r.status === "approved" ? "ok" : "plain"}>{r.status === "requested" ? "Waiting" : r.status === "approved" ? `Joined as ${r.role}` : r.status === "declined" ? "Declined" : "Withdrawn"}</Chip><small className="nx-t3">{orgOf(r.org_id)?.name ?? "Your organisation"} · {dayTime(r.created_at)}</small></div>
            {r.note ? <p>{r.note}</p> : null}
            {r.status === "requested" ? <div className="nx-run-act"><button type="button" className="nx-btn is-sm" onClick={() => { setRole(roles(r)[0][0]); setDeciding(r); }}>Accept…</button><button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void run(`d${r.id}`, async () => await db!.rpc("nx_decide_join", { p_request: r.id, p_decision: "decline" }), { ok: "Declined. They were told." }).then(reload)}>Decline</button></div> : null}
          </li>)}</ul>
        )}
      </div>
      {deciding ? <Modal title={`Accept ${deciding.display_name ?? "this person"}`} onClose={() => setDeciding(null)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setDeciding(null)}>Cancel</button><button type="button" className="nx-btn" disabled={!!busy} onClick={() => void run("acc", async () => await db!.rpc("nx_decide_join", { p_request: deciding.id, p_decision: "approve", p_role: role }), { ok: "Accepted. They can open the workspace now." }).then((x) => { if (x.ok) { setDeciding(null); reload(); } })}>Accept</button></>}>
        <Field label="Their role" hint="Choose the least that lets them do their work. You can change it later from the team page."><select value={role} onChange={(e) => setRole(e.target.value)} autoFocus>{roles(deciding).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </Modal> : null}
    </Shell>
  );
}
