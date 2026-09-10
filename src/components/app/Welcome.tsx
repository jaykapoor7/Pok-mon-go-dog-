"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Building2,
  Calculator,
  Coins,
  KeyRound,
  LayoutGrid,
  MapPin,
  Radio,
  ScanSearch,
  ShieldCheck,
  Utensils,
  Users,
} from "lucide-react";
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

/* ════════════════════════════════════════════════════════════════════
   First run: who are you, then a three-card tour.

   Shown once, skippable at every step, and never blocking, the console
   is fully usable behind it. The role only decides what gets surfaced
   first; nothing here gates access.
   ════════════════════════════════════════════════════════════════════ */

const TOUR_KEY = "straypaw.tour.v1";
/* Reopening the tour from anywhere. A window event rather than context,
   because the button lives in the side nav and the tour lives in the shell,
   and threading state between them buys nothing. */
export const TOUR_EVENT = "straypaw:tour";

export function openTour() {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT));
}

const ROLE_ICON: Record<Role, typeof Users> = {
  individual: Users,
  feeder: Utensils,
  ngo: Building2,
  funder: Coins,
};
const ENTRY_ROLES: Role[] = ["individual", "feeder", "ngo"];

/* What comes after the role question depends on the answer.

   The three audiences do not get in the same way, so one shared tour spent
   its three cards on the parts each of them did not need. A resident needs
   to know they can report without an account. Somebody from an
   organisation needs to know their six characters are the sign-in. A funder
   needs pointing at the costing work, and nothing about accounts at all. */
type Card = {
  Icon: typeof MapPin;
  title: string;
  body: string;
};

const TOURS: Record<Role, Card[]> = {
  individual: [
    {
      Icon: Radio,
      title: "Reporting takes a photo and a spot on the map",
      body: "No account, no sign-up. Add the dog's ear notch or collar if you can see them, and skip anything you are not sure about. Not knowing is a real answer here.",
    },
    {
      Icon: MapPin,
      title: "The map is where it lands",
      body: "Every sighting sits on one shared map alongside the studies and the work being done. Zoom from a state to a street to see what is known nearby, and what nobody has looked at.",
    },
    {
      Icon: Bookmark,
      title: "An account only buys you one thing",
      body: "Following. Make one and the dogs you report stay on your Following page, so you find out what happened to them. Everything else on StrayPaw works signed out.",
    },
  ],
  feeder: [
    {
      Icon: Utensils,
      title: "Your feeding route can have a shared record",
      body: "Sign in to keep the zones you cover, regular days, and check-ins available from any phone. No organisation membership is required.",
    },
    {
      Icon: MapPin,
      title: "Put your patch on the map",
      body: "Add the places you already feed, or join an existing rotation. A zone gives other feeders and nearby organisations a dependable place to begin.",
    },
    {
      Icon: Bookmark,
      title: "Give the dogs you know a history",
      body: "Report a sighting when you recognise a dog. Note an ear notch, collar, or known care status, then save the record so the next visit starts with context.",
    },
  ],
  ngo: [
    {
      Icon: KeyRound,
      title: "Your six characters are the sign-in",
      body: "Whoever added your organisation sent you a code. Choose \u201cI have a code\u201d, type it, and you are in. There is no password and no account to create, and the same code works every time, so keep it.",
    },
    {
      Icon: LayoutGrid,
      title: "The dashboard opens on your two numbers",
      body: "Sterilisation and rabies coverage across the animals you have recorded, with unknowns counted separately rather than folded in as negatives. Every figure links to the list behind it.",
    },
    {
      Icon: Users,
      title: "If you are the team lead, you add your own people",
      body: "Team takes a name, an email and a role, and issues that person their own code by email. Staff codes open the dashboard; volunteer codes only let somebody file sightings under your name.",
    },
  ],
  funder: [
    {
      Icon: Calculator,
      title: "Start with what it would take",
      body: "Pick an area and the costing works from its real numbers: how many animals, how much coverage, what a programme would run to. Where the data is thin it says so instead of estimating over it.",
    },
    {
      Icon: ScanSearch,
      title: "The gaps are the argument",
      body: "A district with no data is not a district without need. StrayPaw shows absence as clearly as presence, which is usually where a programme should be scoped.",
    },
    {
      Icon: ShieldCheck,
      title: "Outcomes carry their proof",
      body: "Work that an organisation reports as done is recorded against the animal it was done to, with the before and after. That is what you would be checking a grant against.",
    },
  ],
};

export function Welcome() {
  /* Never interrupt a report. Someone who opened this flow is standing in
     front of an animal; asking them what kind of user they are first is how
     an observation gets lost. They can pick a role any time afterwards. */
  const pathname = usePathname();
  const onReportFlow = pathname?.startsWith("/report") ?? false;

  const router = useRouter();
  /* -1 = closed, 0 = role picker, 1..3 = tour cards */
  const [step, setStep] = useState(-1);
  const [role, setRole] = useState<Role | null>(null);

  /* “Open app” always arrives with choose=1. A direct community-home visit
     also asks once when no role has been chosen, but a report never does. */
  useEffect(() => {
    if (onReportFlow) return;
    const requestedChoice = new URLSearchParams(window.location.search).get("choose") === "1";
    if (requestedChoice || (pathname === "/app" && !readStoredRole())) {
      setRole(null);
      setStep(0);
    }
  }, [onReportFlow, pathname]);

  /* Asked for by name. Starts at the role question, because somebody
     reopening it may well have picked the wrong one the first time. */
  useEffect(() => {
    const open = () => {
      setRole(null);
      setStep(0);
    };
    window.addEventListener(TOUR_EVENT, open);
    return () => window.removeEventListener(TOUR_EVENT, open);
  }, []);

  function finish(go?: string) {
    try {
      window.localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* nothing to persist to; the tour simply may reappear */
    }
    setStep(-1);
    if (go) router.push(go);
  }

  function pick(r: Role) {
    setRole(r);
    storeRole(r);
    if (r === "ngo") {
      finish("/partner");
      return;
    }
    setStep(1);
  }

  if (step < 0 || onReportFlow) return null;

  const tour = role ? TOURS[role] : TOURS.individual;
  const card = step > 0 ? tour[step - 1] : null;
  const meta = role ? ROLE_META[role] : null;

  return (
    /* Was a hand-rolled div with role="dialog" and aria-modal, which is the
       label for a modal without any of the behaviour: no focus trap, no
       Escape, no scroll lock, no focus returned to whatever opened it, and a
       scrim that could not be clicked away. Radix's Dialog under shadcn's
       wrapper does all of that. The panel keeps its own .wc-* type and
       spacing so it still looks like StrayPaw's onboarding rather than a
       default dialog. */
    <Dialog open={step >= 0} onOpenChange={(o) => { if (!o) finish(); }}>
      {/* Deliberately not carrying the old .wc class: it sets position:relative,
          which overrode DialogContent's fixed centring and dropped the panel to
          the bottom of the screen. DialogContent already provides the surface,
          border, shadow and radius; only the size and the scroll cap are ours. */}
      {/* wc-panel pins the light ground. The console is light in both themes,
          but this content renders in a portal outside .spa, so it cannot
          inherit that and has to say so itself. */}
      <DialogContent className="spa-scope wc-panel flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-[520px]">
        {step === 0 ? (
          <>
            <DialogHeader className="space-y-0 text-left">
              <span className="spa-mono wc-kicker">Welcome to StrayPaw</span>
              <DialogTitle className="wc-title font-normal">
                How will you use StrayPaw?
              </DialogTitle>
              <DialogDescription className="wc-lede">
                Choose the space built for the work you are here to do.
              </DialogDescription>
            </DialogHeader>
            <div className="wc-roles">
              {ENTRY_ROLES.map((r) => {
                const m = ROLE_META[r];
                const Icon = ROLE_ICON[r];
                return (
                  <button key={r} className="wc-role" onClick={() => pick(r)}>
                    <Icon size={18} />
                    <b>{m.label}</b>
                    <span>{m.blurb}</span>
                  </button>
                );
              })}
            </div>
            {/* An explicit way past the question, rather than only the X. */}
            <div className="wc-actions justify-start">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Skip for now</Button>
              </DialogClose>
            </div>
          </>
        ) : (
          card && (
            <>
              <DialogHeader className="space-y-0 text-left">
                <span className="spa-mono wc-kicker">
                  {step} of {tour.length}
                </span>
                <div className="wc-tour-photo" aria-hidden="true">
                  <img src="/dog-anchor.webp" alt="" />
                </div>
                <div className="wc-icon">
                  <card.Icon size={22} />
                </div>
                <DialogTitle className="wc-title font-normal">
                  {card.title}
                </DialogTitle>
                <DialogDescription className="wc-lede">
                  {card.body}
                </DialogDescription>
              </DialogHeader>

              <div className="wc-dots" aria-hidden="true">
                {tour.map((_, i) => (
                  <span key={i} className={i + 1 === step ? "on" : ""} />
                ))}
              </div>

              <div className="wc-actions">
                {step < tour.length ? (
                  <Button onClick={() => setStep(step + 1)}>
                    Next <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button
                    onClick={() => finish(role === "ngo" ? "/join" : meta?.home)}
                  >
                    {role === "ngo"
                      ? "Enter my code"
                      : role === "feeder"
                        ? "Open my patch"
                      : role === "funder"
                        ? "See what it would take"
                        : "Open the map"}{" "}
                    <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
