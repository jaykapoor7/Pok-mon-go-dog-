"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Building2, GraduationCap, KeyRound, MapPin, Radio, Users, Utensils } from "lucide-react";
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

/* How many Welcome dialogs are mounted. RoleSwitchFallback reads this so it
   only takes over when there is no in-place picker to open: both listen to
   the same event, and without this the fallback's hard navigation reloaded
   the page out from under the dialog every time, so the in-place picker
   never actually ran. */
let mountedTours = 0;
export function tourIsMounted() {
  return mountedTours > 0;
}

export function openTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}

type EntryRole = "individual" | "feeder" | "educator" | "ngo";
type Card = { Icon: typeof MapPin; title: string; body: string };

const ENTRY_ROLES: EntryRole[] = ["individual", "feeder", "educator", "ngo"];
const ROLE_ICON: Record<EntryRole, typeof Users> = {
  individual: Users,
  feeder: Utensils,
  educator: GraduationCap,
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
  feeder: [
    {
      Icon: Utensils,
      title: "Your route, on the record",
      body: "Add the spots you feed at. Each one keeps the animals you see there and when you last went.",
    },
    {
      Icon: Radio,
      title: "Notice something, add it",
      body: "An injury, a new dog, a dog gone missing: one sighting reaches the organisations working nearby.",
    },
  ],
  educator: [
    {
      Icon: BookOpen,
      title: "Lessons built on real records",
      body: "Short, sourced material on living alongside street animals, for a class or a community session.",
    },
    {
      Icon: MapPin,
      title: "Show your own streets",
      body: "Open the map and the figures for the place you teach in, so the lesson is about somewhere people know.",
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
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    if (onReportFlow) return;
    const requestedChoice = new URLSearchParams(window.location.search).get("choose") === "1";
    if (requestedChoice || (pathname === "/app" && !readStoredRole())) {
      setRole(null);
      setStep(0);
    }
    /* The flag asks for the picker once. Left in the address, every Back to
       this page asked again, and the picker reopened over the page. */
    if (requestedChoice) {
      const url = new URL(window.location.href);
      url.searchParams.delete("choose");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [onReportFlow, pathname]);

  /* Whichever space is picked, its home is already on the way. */
  useEffect(() => {
    if (step !== 0) return;
    for (const r of ENTRY_ROLES) router.prefetch(ROLE_META[r].home);
  }, [step, router]);

  useEffect(() => {
    mountedTours += 1;
    const open = () => { setRole(null); setStep(0); };
    window.addEventListener(TOUR_EVENT, open);
    return () => {
      mountedTours -= 1;
      window.removeEventListener(TOUR_EVENT, open);
    };
  }, []);

  /* Dismiss once the router has arrived where finish() sent it. A push to a
     different route usually unmounts this first and the effect never runs;
     a push to the route we are already on does not, and this is what closes
     the tour in that case. */
  useEffect(() => {
    if (leaving && pathname === leaving) setStep(-1);
  }, [leaving, pathname]);

  function finish(go?: string) {
    try { window.localStorage.setItem(TOUR_KEY, "1"); } catch {}
    /* Navigate first, and never close in the same breath. Closing the dialog
       synchronously races the push: the tour unmounts, the component
       re-renders, and the navigation occasionally never commits, stranding
       an organisation on /app instead of /partner.

       Leaving it to the route change to unmount the tour is not enough
       either. A community visitor picks their role at /app?choose=1 and
       "Begin" sends them to /app, which is the route they are already on:
       the push still clears the query, but nothing unmounts, and they were
       left stuck behind a dialog with no step remaining.

       So record where we are going, push, and let the effect below dismiss
       the tour once the router has actually arrived. Nothing closes before
       the push has been dispatched, and a same-route push still closes. */
    if (go) {
      setLeaving(go);
      router.push(go);
      return;
    }
    setStep(-1);
  }

  /* The cards explain a space the first time. Someone switching back to a
     space they already know goes straight there. */
  function pick(next: EntryRole) {
    setRole(next);
    storeRole(next as Role);
    let seen = false;
    try { seen = window.localStorage.getItem(TOUR_KEY) === "1"; } catch {}
    if (seen) return finish(ROLE_META[next].home);
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
              <DialogDescription className="wc-lede">Pick a space. You can switch at any time.</DialogDescription>
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
