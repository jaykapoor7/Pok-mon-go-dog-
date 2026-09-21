"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Building2, KeyRound, MapPin, Radio, Users } from "lucide-react";
import { ROLE_META, readStoredRole, storeRole, type Role } from "@/lib/roles";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "straypaw.tour.v2";
export const TOUR_EVENT = "straypaw:tour";

export function openTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}

type EntryRole = "individual" | "ngo";
type Card = { Icon: typeof MapPin; title: string; body: string };

const ENTRY_ROLES: EntryRole[] = ["individual", "ngo"];
const ROLE_ICON: Record<EntryRole, typeof Users> = {
  individual: Users,
  ngo: Building2,
};

const TOURS: Record<EntryRole, Card[]> = {
  individual: [
    {
      Icon: Radio,
      title: "Report what you actually see",
      body: "Add a photo, location and only the details you are sure about. Reporting does not require an organisation account.",
    },
    {
      Icon: MapPin,
      title: "The record becomes useful on the map",
      body: "The map connects animals, urgency, care status and local patterns so a sighting can become part of a longer history instead of another isolated message.",
    },
  ],
  ngo: [
    {
      Icon: KeyRound,
      title: "Organisation records stay in a verified workspace",
      body: "Use the access code issued to your team. The private workspace holds cases, animal histories, imports, follow-ups, operations and reporting.",
    },
    {
      Icon: Building2,
      title: "Your existing records can come with you",
      body: "Bring spreadsheets and operational registers into StrayPaw, review how they map, then turn the same field record into searchable evidence and reports.",
    },
  ],
};

export function Welcome() {
  const pathname = usePathname();
  const router = useRouter();
  const onReportFlow = pathname?.startsWith("/report") ?? false;
  const [step, setStep] = useState(-1);
  const [role, setRole] = useState<EntryRole | null>(null);

  useEffect(() => {
    if (onReportFlow) return;
    const requestedChoice = new URLSearchParams(window.location.search).get("choose") === "1";
    if (requestedChoice || (pathname === "/app" && !readStoredRole())) {
      setRole(null);
      setStep(0);
    }
  }, [onReportFlow, pathname]);

  useEffect(() => {
    const open = () => { setRole(null); setStep(0); };
    window.addEventListener(TOUR_EVENT, open);
    return () => window.removeEventListener(TOUR_EVENT, open);
  }, []);

  function finish(go?: string) {
    try { window.localStorage.setItem(TOUR_KEY, "1"); } catch {}
    /* Navigate before closing the dialog. Closing first introduced a race where
       the tour unmounted/re-rendered but the workspace push occasionally never
       committed under concurrent rendering. */
    if (go) router.push(go);
    /* ...but close it either way. Relying on the route change to unmount the
       tour assumed the destination was somewhere else. "Begin" sends a
       community visitor to /app, and the tour opens at /app?choose=1, so that
       push is to the route they are already on: nothing unmounts, and they
       were left stuck behind a dialog with no remaining step. */
    setStep(-1);
  }

  function pick(next: EntryRole) {
    setRole(next);
    storeRole(next as Role);
    setStep(1);
  }

  if (step < 0 || onReportFlow) return null;
  const tour = role ? TOURS[role] : TOURS.individual;
  const card = step > 0 ? tour[step - 1] : null;

  return (
    <Dialog open={step >= 0} onOpenChange={(open) => { if (!open) finish(); }}>
      <DialogContent className="spa-scope wc-panel flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-[520px]">
        {step === 0 ? (
          <>
            <DialogHeader className="space-y-0 text-left">
              <span className="spa-mono wc-kicker">Welcome to StrayPaw</span>
              <DialogTitle className="wc-title font-normal">How will you use StrayPaw?</DialogTitle>
              <DialogDescription className="wc-lede">There are two spaces: the open community record and the verified organisation workspace.</DialogDescription>
            </DialogHeader>
            <div className="wc-roles">
              {ENTRY_ROLES.map((entry) => {
                const meta = ROLE_META[entry];
                const Icon = ROLE_ICON[entry];
                return (
                  <button key={entry} className="wc-role" onClick={() => pick(entry)}>
                    <Icon size={18} />
                    <b>{meta.label}</b>
                    <span>{meta.blurb}</span>
                  </button>
                );
              })}
            </div>
            <div className="wc-actions justify-start">
              <DialogClose asChild><Button variant="ghost" size="sm">Skip for now</Button></DialogClose>
            </div>
          </>
        ) : card ? (
          <>
            <DialogHeader className="space-y-0 text-left">
              <span className="spa-mono wc-kicker">{step} of {tour.length}</span>
              <div className="wc-icon"><card.Icon size={22} /></div>
              <DialogTitle className="wc-title font-normal">{card.title}</DialogTitle>
              <DialogDescription className="wc-lede">{card.body}</DialogDescription>
            </DialogHeader>
            <div className="wc-dots" aria-hidden="true">{tour.map((_, i) => <span key={i} className={i + 1 === step ? "on" : ""} />)}</div>
            <div className="wc-actions">
              {step < tour.length ? (
                <Button onClick={() => setStep(step + 1)}>Next <ArrowRight size={14} /></Button>
              ) : (
                <>
                  <Button onClick={() => finish(role ? ROLE_META[role].home : "/app")}>Begin <ArrowRight size={14} /></Button>
                  {role === "ngo" && <a className="btn-ghost px-3 py-2 text-xs" href="/join">Enter my code</a>}
                </>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
