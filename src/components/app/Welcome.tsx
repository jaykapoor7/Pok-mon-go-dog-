"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Coins,
  MapPin,
  Radio,
  ScanSearch,
  Users,
  X,
} from "lucide-react";
import { ROLE_META, ROLES, readStoredRole, storeRole, type Role } from "@/lib/roles";

/* ════════════════════════════════════════════════════════════════════
   First run: who are you, then a three-card tour.

   Shown once, skippable at every step, and never blocking — the console
   is fully usable behind it. The role only decides what gets surfaced
   first; nothing here gates access.
   ════════════════════════════════════════════════════════════════════ */

const TOUR_KEY = "straypaw.tour.v1";

const ROLE_ICON: Record<Role, typeof Users> = {
  individual: Users,
  ngo: Building2,
  funder: Coins,
};

/* Kept to three: the loop the whole product runs on, no more. */
const TOUR = [
  {
    Icon: MapPin,
    title: "The map is the record",
    body: "Every sighting, study and intervention sits on one shared map. Zoom from a state to a street and see what is known — and what nobody has looked at yet.",
  },
  {
    Icon: Radio,
    title: "Anyone can add a signal",
    body: "A photo and a location is enough. Reports from residents and field teams land in the same place, so one animal keeps one history.",
  },
  {
    Icon: ScanSearch,
    title: "Gaps are the point",
    body: "A district with no data is not a district without need. StrayPaw shows absence as clearly as presence, because that is where work gets scoped.",
  },
];

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
      seen = true; // storage blocked — do not nag on every load
    }
    if (!seen && !readStoredRole()) setStep(0);
  }, [onReportFlow]);

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

  const card = step > 0 ? TOUR[step - 1] : null;
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
                {step} of {TOUR.length}
              </span>
              <div className="wc-icon">
                <card.Icon size={22} />
              </div>
              <h2 className="wc-title">{card.title}</h2>
              <p className="wc-lede">{card.body}</p>

              <div className="wc-dots" aria-hidden="true">
                {TOUR.map((_, i) => (
                  <span key={i} className={i + 1 === step ? "on" : ""} />
                ))}
              </div>

              <div className="wc-actions">
                {step < TOUR.length ? (
                  <button
                    className="spa-cta"
                    onClick={() => setStep(step + 1)}
                  >
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="spa-cta"
                    onClick={() => finish(meta?.home)}
                  >
                    {meta ? `Go to ${meta.home === "/map" ? "the map" : "your workspace"}` : "Start"}{" "}
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
