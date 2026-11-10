"use client";

/* First time in a workspace: one sheet that says who you are here and the
   three things your role does, in order, on the record line. Each step is
   a real page; choosing one closes the sheet and takes you there.

   Shown once per person and workspace on this device (a browser note, not
   an account setting), never on the guided demo, and never to a browser
   that has already dismissed the earlier tour. It can be reopened from the
   account menu ("Welcome guide"). It reads nothing and grants nothing: the
   role shown is the one the server already reported to the shell. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { DEMO_SITE } from "@/lib/demo-site";
import "./firstrun.css";

type Role = "admin" | "coordinator" | "veterinarian" | "member" | null;
type Step = { href: string; title: string; body: string };
export const WELCOME_EVENT = "sp5:welcome";

const STEPS: Record<string, { as: string; steps: Step[] }> = {
  lead: { as: "coordinator", steps: [
    { href: "/ngo", title: "Start on Today", body: "Five stages, from intake to billing. Each number opens the records it counts." },
    { href: "/ngo/work", title: "Work the queue", body: "Open a case, give it to someone, and record what happened." },
    { href: "/ngo/packages", title: "Send the monthly package", body: "Approved records become the report your municipal office reviews." },
  ] },
  veterinarian: { as: "veterinarian", steps: [
    { href: "/ngo/verification?stage=vet", title: "Sign off procedures", body: "Each one is authorised in your own name. Nothing is signed for you." },
    { href: "/ngo/animals", title: "Find an animal", body: "Search by name, tag or place and read its full history." },
    { href: "/ngo/care", title: "Record care", body: "Vaccinations, treatment and follow-ups, on the animal's record." },
  ] },
  member: { as: "field team member", steps: [
    { href: "/ngo/field", title: "Open Field mode", body: "Made for one hand. It works without signal and syncs when you are back online." },
    { href: "/ngo/cases/new", title: "Open a new case", body: "What you saw, where, and a photo. It joins the queue as soon as it is saved." },
    { href: "/ngo/inbox", title: "Prepare incoming reports", body: "Reports from residents and your team, ready to turn into cases." },
  ] },
  reviewer: { as: "reviewer", steps: [
    { href: "/city/review", title: "Review submissions", body: "Monthly packages from operators, with the evidence behind every line." },
    { href: "/city/contracts", title: "Check contracts and rates", body: "The terms each claim is measured against." },
    { href: "/city", title: "See the wards", body: "Coverage and activity on the map, with what is recorded and what is not." },
  ] },
};

export function FirstRun({ user, org, role, reviewer, ws }: { user: { id: string; name: string }; org: string | null; role: Role; reviewer: boolean; ws: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const key = `sp5.welcome.${user.id}.${ws}`;
  const kind = ws === "city" ? (reviewer ? "reviewer" : null) : ws === "ngo" ? (role === "veterinarian" ? "veterinarian" : role === "member" ? "member" : role ? "lead" : null) : null;

  useEffect(() => {
    if (!kind || DEMO_SITE) return;
    try { if (!localStorage.getItem(key) && !localStorage.getItem("straypaw.tour.v2")) setOpen(true); } catch { /* storage blocked: stay out of the way */ }
  }, [key, kind]);
  useEffect(() => { const again = () => setOpen(true); window.addEventListener(WELCOME_EVENT, again); return () => window.removeEventListener(WELCOME_EVENT, again); }, []);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  const close = useCallback(() => { try { localStorage.setItem(key, "1"); } catch { /* fine */ } setOpen(false); }, [key]);

  if (!kind) return null;
  const { as, steps } = STEPS[kind];
  const first = user.name.trim().split(/\s+/).find((w) => !/^(dr|mr|mrs|ms|prof)\.?$/i.test(w)) || "there";
  const place = ws === "city" ? "your reviewing office" : org ?? "your organisation";
  return (
    <dialog ref={ref} className="fr" aria-labelledby="fr-h" onClose={close} onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div className="fr-in">
        <button type="button" className="fr-x" onClick={close} aria-label="Close the welcome guide"><X size={18} aria-hidden /></button>
        <span className="fr-kaju" aria-hidden><KajuFace size={44} /></span>
        <h2 id="fr-h">Welcome, {first}.</h2>
        <p className="fr-sub">You are signed in to <b>{place}</b> as {/^[aeiou]/i.test(role === "admin" && kind === "lead" ? "admin" : as) ? "an" : "a"} <b>{role === "admin" && kind === "lead" ? "admin" : as}</b>. Here is your work, in order.</p>
        <ol className="fr-steps">
          {steps.map((s, i) => (
            <li key={s.href} style={{ ["--i" as string]: i }}>
              <Link href={s.href} onClick={close}>
                <span className="fr-n" aria-hidden>{i + 1}</span>
                <span className="fr-t"><b>{s.title}</b><small>{s.body}</small></span>
                <ArrowRight size={16} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
        <p className="fr-note"><KajuFace size={18} /> Kaju is on every page. Ask in plain words; it prepares, you confirm.</p>
        <div className="fr-act">
          <Link href={steps[0].href} onClick={close} className="fr-go" autoFocus>{steps[0].title}<ArrowRight size={16} aria-hidden /></Link>
          <button type="button" className="fr-skip" onClick={close}>Look around first</button>
        </div>
      </div>
    </dialog>
  );
}
