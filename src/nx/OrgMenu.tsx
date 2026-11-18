"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LogOut, Plus, UserRound } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Field, Modal, toast } from "./kit";
import { useAuth } from "@/components/auth/AuthProvider";
import { useLive, type Workspace } from "./live";
import { WS_LABEL, homeOf } from "./nav";
import "./orgmenu.css";

/* The organisation at the top of the sidebar opens a menu of every workspace the person belongs to. It used to cycle
   to the next organisation on each click, with no menu, so people clicked again and again and could not tell where a
   click would take them, or get back. Signed out, it lists the sample workspaces, each labelled as a sample. */

type Shown = { name: string; short: string; kind: string };
const initials = (name: string) => {
  const w = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return (w.length > 1 ? w.map((x) => x[0]).join("") : (w[0] ?? "").slice(0, 2)).slice(0, 2).toUpperCase();
};
const ORDER = ["ngo", "government", "healthcare", "research"] as const;
const SAMPLES: { href: string; name: string; label: string; ws: string }[] = [
  { href: "/ngo/today", name: "Kind Hour", label: "NGO workspace", ws: "ngo" },
  { href: "/gov/overview", name: "Bengaluru programme", label: "Government & Programmes", ws: "gov" },
  { href: "/health/today", name: "Ward 12 Health Centre", label: "Healthcare", ws: "health" },
  { href: "/research/datasets", name: "Programme Epidemiology Unit", label: "Research", ws: "research" },
];
const ROLE: Record<string, string> = { admin: "Admin", lead: "Lead", coordinator: "Coordinator", member: "Member", veterinarian: "Veterinarian", field_worker: "Field worker", clinician: "Clinician", nurse: "Nurse", lab_scientist: "Laboratory scientist", analyst: "Analyst", reviewer: "Reviewer", field: "Field team" };

export function OrgMenu({ shown, ws, current }: { shown: Shown; ws: string; current: Workspace | null }) {
  const live = useLive();
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [going, setGoing] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const first = box.current?.querySelector<HTMLElement>('[role="menuitemradio"],[role="menuitem"]');
    first?.focus();
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"],[role="menuitem"]') ?? [])];
      const at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      e.preventDefault();
    };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", keys); };
  }, [open]);
  /* The page changed: whatever was chosen has arrived. */
  useEffect(() => { setGoing(null); setOpen(false); }, [current?.org_id, ws]);

  const go = (o: Workspace) => {
    if (o.org_id === current?.org_id) { setOpen(false); return; }
    setGoing(o.org_id);
    live.pick(o.org_id);
    router.push(homeOf(o.workspace, o.org_id));
  };
  /* The person's own name, as colleagues see it in messages, tasks and people lists. Nothing else in the app asked for it,
     so people were shown by their email or as "A colleague". */
  const [naming, setNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const saveName = async () => {
    const name = nameDraft.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!name) return;
    setSavingName(true);
    const r = await getSupabase()?.auth.updateUser({ data: { display_name: name, name } });
    setSavingName(false);
    if (!r || r.error) { toast({ text: "Your name could not be saved just now. Try again in a moment.", tone: "bad" }); return; }
    setNaming(false);
    toast({ text: `Colleagues now see you as ${name}.`, tone: "ok" });
    window.dispatchEvent(new Event("nx:dms")); window.dispatchEvent(new Event("nx:channels"));
  };
  const groups = ORDER.map((w) => ({ w, list: live.orgs.filter((o) => o.workspace === w) })).filter((g) => g.list.length);

  return (
    <div className="nx-om">
      <button ref={btn} type="button" className="nx-org" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)} title="Change workspace">
        <span className="nx-org-l">{shown.short}</span>
        <span><b>{shown.name}</b><small>{going ? "Opening…" : shown.kind}</small></span>
        <ChevronsUpDown size={14} aria-hidden />
      </button>
      {open ? (
        <div ref={box} id={id} className="nx-om-menu" role="menu" aria-label="Workspaces">
          {live.org ? (
            <>
              {groups.map((g) => (
                <div key={g.w} className="nx-om-g" role="group" aria-label={WS_LABEL[g.w]}>
                  <div className="nx-om-h">{WS_LABEL[g.w]}</div>
                  {g.list.map((o) => {
                    const on = o.org_id === current?.org_id;
                    return (
                      <button key={o.org_id} type="button" role="menuitemradio" aria-checked={on} className={`nx-om-i${on ? " is-on" : ""}`} onClick={() => go(o)} disabled={!!going}>
                        <span className="nx-org-l">{initials(o.short_name ?? o.name)}</span>
                        <span className="nx-om-t"><b>{o.name}</b><small>{going === o.org_id ? "Opening…" : `${ROLE[o.role] ?? o.role}${o.sample ? " · sample" : ""}`}</small></span>
                        {on ? <Check size={15} aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="nx-om-sep" role="separator" />
              <button type="button" role="menuitem" className="nx-om-i is-plain" onClick={() => { setOpen(false); router.push("/start"); }}><Plus size={15} aria-hidden /><span className="nx-om-t"><b>Join or add an organisation</b></span></button>
              <button type="button" role="menuitem" className="nx-om-i is-plain" onClick={() => { setOpen(false); setNameDraft(live.userName ?? ""); setNaming(true); }}><UserRound size={15} aria-hidden /><span className="nx-om-t"><b>Your name</b><small>{live.userName ?? "Not added yet"}</small></span></button>
              <button type="button" role="menuitem" className="nx-om-i is-plain" onClick={() => { setOpen(false); signOut(); }}><LogOut size={15} aria-hidden /><span className="nx-om-t"><b>Sign out</b></span></button>
            </>
          ) : (
            <div className="nx-om-g" role="group" aria-label="Sample workspaces">
              <div className="nx-om-h">Sample workspaces</div>
              {SAMPLES.map((s) => {
                const on = s.ws === ws;
                return (
                  <button key={s.href} type="button" role="menuitemradio" aria-checked={on} className={`nx-om-i${on ? " is-on" : ""}`} onClick={() => { setOpen(false); if (!on) router.push(s.href); }}>
                    <span className="nx-org-l">{initials(s.name)}</span>
                    <span className="nx-om-t"><b>{s.name}</b><small>{s.label} · sample</small></span>
                    {on ? <Check size={15} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      {naming ? (
        <Modal title="Your name" onClose={() => setNaming(false)} foot={<><button type="button" className="nx-btn is-quiet" onClick={() => setNaming(false)}>Cancel</button><button type="button" className="nx-btn" disabled={savingName || !nameDraft.trim()} onClick={() => void saveName()}>{savingName ? "Saving…" : "Save"}</button></>}>
          <form onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
            <Field label="Name colleagues see" hint="Shown in messages, tasks and people lists in your organisations.">
              <input autoFocus value={nameDraft} maxLength={80} autoComplete="name" enterKeyHint="done" onChange={(e) => setNameDraft(e.target.value)} />
            </Field>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
