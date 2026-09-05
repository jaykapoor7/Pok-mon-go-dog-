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
  Users,
  X,
} from "lucide-react";
import { ROLE_META, ROLES, readStoredRole, storeRole, type Role } from "@/lib/roles";

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
  ngo: Building2,
  funder: Coins,
};

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

  useEffect(() => {
    if (onReportFlow) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(TOUR_KEY) === "1";
    } catch {
      seen = true; // storage blocked, do not nag on every load
    }
    if (!seen && !readStoredRole()) setStep(0);
  }, [onReportFlow]);

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
    setStep(1);
  }

  if (step < 0 || onReportFlow) return null;

  const tour = role ? TOURS[role] : TOURS.individual;
  const card = step > 0 ? tour[step - 1] : null;
  const meta = role ? ROLE_META[role] : null;

  return (
    <div
      className="wc-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to StrayPaw"
    >
      <div className="wc">
        <button
          className="wc-skip"
          onClick={() => finish()}
          aria-label="Skip introduction"
        >
          Skip <X size={13} />
        </button>

        {step === 0 ? (
          <>
            <span className="spa-mono wc-kicker">Welcome to StrayPaw</span>
            <h2 className="wc-title">Which of these is you?</h2>
            <p className="wc-lede">
              This only decides what we put in front of you first. Everything
              stays visible either way.
            </p>
            <div className="wc-roles">
              {ROLES.map((r) => {
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
          </>
        ) : (
          card && (
            <>
              <span className="spa-mono wc-kicker">
                {step} of {tour.length}
              </span>
              <div className="wc-icon">
                <card.Icon size={22} />
              </div>
              <h2 className="wc-title">{card.title}</h2>
              <p className="wc-lede">{card.body}</p>

              <div className="wc-dots" aria-hidden="true">
                {tour.map((_, i) => (
                  <span key={i} className={i + 1 === step ? "on" : ""} />
                ))}
              </div>

              <div className="wc-actions">
                {step < tour.length ? (
                  <button
                    className="spa-cta"
                    onClick={() => setStep(step + 1)}
                  >
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="spa-cta"
                    onClick={() =>
                      finish(role === "ngo" ? "/join" : meta?.home)
                    }
                  >
                    {role === "ngo"
                      ? "Enter my code"
                      : role === "funder"
                        ? "See what it would take"
                        : "Open the map"}{" "}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
