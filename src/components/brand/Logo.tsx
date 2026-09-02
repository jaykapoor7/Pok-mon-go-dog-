import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TILE: Record<Size, string> = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
const WORD: Record<Size, string> = { sm: "text-base", md: "text-xl", lg: "text-2xl" };

const C = {
  bg: "#1a3d8a",
  circle: "#7bc8f6",
  dog: "#1f48a0",
  white: "#ffffff",
  accent: "#9dd4f8",
};

/**
 * Compact circular mark — the dog-face badge without arced text.
 * Crisp at any size, used in navbars, tabs, small chips.
 */
export function AnimalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill={C.bg} />
      {/* Inner light-blue circle */}
      <circle cx="50" cy="57" r="34" fill={C.circle} />
      {/* Left ear */}
      <ellipse cx="23" cy="44" rx="11" ry="18" fill={C.dog} transform="rotate(-15 23 44)" />
      {/* Right ear */}
      <ellipse cx="77" cy="44" rx="11" ry="18" fill={C.dog} transform="rotate(15 77 44)" />
      {/* Head */}
      <ellipse cx="50" cy="42" rx="25" ry="21" fill={C.dog} />
      {/* Left eye — closed happy squint */}
      <path d="M 38,39 Q 43,33 48,39" stroke={C.white} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Right eye */}
      <path d="M 52,39 Q 57,33 62,39" stroke={C.white} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <path d="M 47,51 L 50,47 L 53,51 Z" fill={C.white} />
      {/* Left paw */}
      <rect x="33" y="75" width="13" height="9" rx="4.5" fill={C.dog} />
      {/* Right paw */}
      <rect x="54" y="75" width="13" height="9" rx="4.5" fill={C.dog} />
    </svg>
  );
}

/**
 * Full circular badge — STRAYPAW / dog / SEE. CARE. ACT.
 * Use at 120px+ so the arced text stays legible.
 */
export function StrayPawBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" role="img" aria-label="StrayPaw — See. Care. Act.">
      <defs>
        <path id="sp-up" d="M 12,100 A 88,88 0 0,1 188,100" />
        <path id="sp-dn" d="M 32,116 A 74,74 0 0,0 168,116" />
      </defs>

      {/* Badge background */}
      <circle cx="100" cy="100" r="98" fill={C.bg} />

      {/* Light-blue circle (the "window") */}
      <circle cx="100" cy="108" r="60" fill={C.circle} />

      {/* Left ear */}
      <ellipse cx="61" cy="88" rx="17" ry="23" fill={C.dog} transform="rotate(-14 61 88)" />
      {/* Right ear */}
      <ellipse cx="139" cy="88" rx="17" ry="23" fill={C.dog} transform="rotate(14 139 88)" />
      {/* Head */}
      <ellipse cx="100" cy="86" rx="38" ry="32" fill={C.dog} />

      {/* Left eye */}
      <path d="M 81,81 Q 88,73 95,81" stroke={C.white} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Right eye */}
      <path d="M 105,81 Q 112,73 119,81" stroke={C.white} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <path d="M 96,101 L 100,96 L 104,101 Z" fill={C.white} />
      {/* Subtle smile lines */}
      <path d="M 100,101 Q 95,107 90,104" stroke={C.white} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M 100,101 Q 105,107 110,104" stroke={C.white} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />

      {/* Left paw */}
      <rect x="71" y="134" width="19" height="12" rx="6" fill={C.dog} />
      {/* Right paw */}
      <rect x="110" y="134" width="19" height="12" rx="6" fill={C.dog} />

      {/* Arced "STRAYPAW" */}
      <text
        fill={C.white}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI Rounded', 'Segoe UI', system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="4"
      >
        <textPath href="#sp-up" startOffset="50%" textAnchor="middle">
          STRAYPAW
        </textPath>
      </text>

      {/* Arced "SEE. CARE. ACT." */}
      <text
        fill={C.accent}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI Rounded', 'Segoe UI', system-ui, sans-serif"
        fontWeight="700"
        fontSize="11"
        letterSpacing="2.5"
      >
        <textPath href="#sp-dn" startOffset="50%" textAnchor="middle">
          SEE. CARE. ACT.
        </textPath>
      </text>
    </svg>
  );
}

/**
 * Wordmark — compact mark + "StrayPaw" text, used in nav rails and top bars.
 */
export function Logo({
  className,
  size = "md",
  showWordmark = true,
}: {
  className?: string;
  size?: Size;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("shrink-0", TILE[size])}>
        <AnimalMark className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className={cn("font-display tracking-tight", WORD[size])}>
          <span className="font-semibold text-bark-900 dark:text-white">Stray</span>
          <span className="font-extrabold text-paw-600 dark:text-paw-400">Paw</span>
        </span>
      )}
    </span>
  );
}
