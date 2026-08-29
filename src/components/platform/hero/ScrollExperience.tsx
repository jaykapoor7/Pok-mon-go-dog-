"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroCanvas } from "./HeroCanvas";

/* ------------------------------------------------------------------ */
/*  Full-page scroll-driven hero experience.                          */
/*  Sticky 3D canvas + text panels that scroll over it.               */
/* ------------------------------------------------------------------ */

interface Stage {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
}

const STAGES: Stage[] = [
  {
    id: "hero",
    eyebrow: "Street-animal infrastructure for India",
    headline: "See the street.\nChange the system.",
    body: "StrayPaw collects, connects, and presents the fragmented ecosystem around India's street animals, so the right people can act.",
  },
  {
    id: "problem",
    eyebrow: "The problem",
    headline: "The help exists.\nIt's just disconnected.",
    body: "Citizens notice. NGOs work. Vets treat. Volunteers show up. But none of them share the same picture. Every observation stays in someone's phone. Every effort starts from zero.",
  },
  {
    id: "notice",
    eyebrow: "01 / Notice",
    headline: "It starts with\nsomeone noticing.",
    body: "A street dog on a corner. A limp. A litter under a parked car. Every act of care begins here, with one person paying attention.",
  },
  {
    id: "report",
    eyebrow: "02 / Report",
    headline: "One tap turns a\nprivate moment into data.",
    body: "A photo, a location, a condition. StrayPaw captures the sighting as a shared record in the time it takes to send a text.",
  },
  {
    id: "understand",
    eyebrow: "03 / Understand",
    headline: "The dog becomes\na real animal on record.",
    body: "Sightings from strangers, feeders, and rescuers add up. Same dog. Different eyes. One living profile that grows over time.",
  },
  {
    id: "connect",
    eyebrow: "04 / Connect",
    headline: "The right people find\neach other.",
    body: "The person who reported. An NGO working the area. A vet who can treat. A volunteer who can transport. One connected thread instead of a WhatsApp forward chain.",
  },
  {
    id: "act",
    eyebrow: "05 / Act",
    headline: "Treatment. Vaccination.\nFollow-up. One thread.",
    body: "Every intervention attaches to the same record. Nothing is lost, nothing is repeated. Anyone helping later starts where the last person stopped.",
  },
  {
    id: "scale",
    eyebrow: "06 / Scale",
    headline: "One dog is one node\nin a living network.",
    body: "Multiply this by every street in India. StrayPaw is the shared surface that makes each animal visible and adds up to a picture worth acting on.",
  },
];

// Per-stage scroll height: 65vh on mobile (<lg), 100vh on desktop.
// Defined in CSS so there's no hydration mismatch from JS window checks.
const N = STAGES.length;

function StagePanel({
  stage,
  index,
  isActive,
}: {
  stage: Stage;
  index: number;
  isActive: boolean;
}) {
  const isHero = index === 0;

  return (
    // min-h matches --stage-h defined in <style> below
    <div className={`scroll-stage flex items-center ${isHero ? "pt-16" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-lg"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 rounded-full bg-paw-400" />
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-paw-400">
            {stage.eyebrow}
          </p>
        </div>
        <h2
          className={`mt-4 font-display font-extrabold leading-[1.05] tracking-tight text-white ${
            isHero
              ? "text-5xl sm:text-6xl lg:text-[4rem]"
              : "text-4xl sm:text-5xl lg:text-[3rem]"
          }`}
          style={{ whiteSpace: "pre-line" }}
        >
          {stage.headline}
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-[17px]">
          {stage.body}
        </p>
        {isHero && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-paw-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-paw-600"
            >
              Open the community app <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-base font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              Explore the data
            </Link>
          </div>
        )}
        {stage.id === "scale" && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-bark-900 transition-colors hover:bg-bark-100"
            >
              Open the community app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ScrollExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setProgress(v);
    setActiveStage(Math.min(N - 1, Math.floor(v * N)));
  });

  return (
    <>
      {/* CSS: per-stage height responsive without JS hydration mismatch */}
      <style>{`
        .scroll-exp { height: calc(65vh * ${N}); }
        .scroll-stage { min-height: 65vh; }
        @media (min-width: 1024px) {
          .scroll-exp { height: calc(100vh * ${N}); }
          .scroll-stage { min-height: 100vh; }
        }
      `}</style>

      <div ref={containerRef} className="scroll-exp relative bg-ink">
        {/* Sticky 3D canvas */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Dark gradient overlay for text readability */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent lg:via-ink/20" />

          {/* Canvas */}
          {!isMobile && (
            <HeroCanvas
              scrollProgress={progress}
              className="absolute inset-0 h-full w-full"
            />
          )}

          {/* Mobile: large data figure as visual weight */}
          {isMobile && (
            <div className="absolute inset-0 flex items-end justify-end pb-12 pr-4">
              <div className="select-none text-right">
                <p
                  className="font-display font-black leading-none text-white opacity-[0.08]"
                  style={{ fontSize: "clamp(80px, 28vw, 140px)" }}
                >
                  35M
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-white/20">
                  street dogs in India
                </p>
              </div>
            </div>
          )}

          {/* Stage indicator dots */}
          <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2.5 sm:right-6">
            {STAGES.map((s, i) => (
              <div
                key={s.id}
                className={`rounded-full transition-all duration-300 ${
                  i === activeStage
                    ? "h-4 w-1.5 bg-paw-400"
                    : i < activeStage
                      ? "h-1.5 w-1.5 bg-white/40"
                      : "h-1.5 w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scrolling text panels */}
        <div className="absolute inset-0 z-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
            {STAGES.map((stage, i) => (
              <StagePanel
                key={stage.id}
                stage={stage}
                index={i}
                isActive={i === activeStage}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
