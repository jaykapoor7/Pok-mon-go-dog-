import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TILE: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};
const WORD: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

let uid = 0;

/** StrayPaw mark — a heart holding a white dog head, in the blue brand palette.
 *  (Heart concept kept from the brand artwork; recoloured to match the app.)
 *  Inline SVG so it stays crisp at any size. */
export function AnimalMark({ className }: { className?: string }) {
  const id = `sp-mark-${(uid = (uid + 1) % 100000)}`;
  const eye = "#123a86";
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="8" y1="8" x2="92" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8fbcff" />
          <stop offset="50%" stopColor="#3b7de6" />
          <stop offset="100%" stopColor="#1e50b0" />
        </linearGradient>
      </defs>
      {/* Heart */}
      <path
        d="M50 88 C 19 65 5 45 5 28.5 C 5 15.5 16 7 27.5 7 C 37.5 7 45.5 14 50 23.5 C 54.5 14 62.5 7 72.5 7 C 84 7 95 15.5 95 28.5 C 95 45 81 65 50 88 Z"
        fill={`url(#${id})`}
      />
      {/* White dog head, scaled into the heart */}
      <g transform="translate(27 20) scale(0.46)">
        <path d="M 33 34 C 16 30 11 44 13 58 C 14 70 24 74 33 68 C 30 58 30 44 33 34 Z" fill="white" />
        <path d="M 67 34 C 84 30 89 44 87 58 C 86 70 76 74 67 68 C 70 58 70 44 67 34 Z" fill="white" />
        <circle cx="50" cy="54" r="25" fill="white" />
        <ellipse cx="50" cy="70" rx="15" ry="12" fill="white" />
        <ellipse cx="41" cy="50" rx="3.6" ry="4.2" fill={eye} />
        <ellipse cx="59" cy="50" rx="3.6" ry="4.2" fill={eye} />
        <ellipse cx="50" cy="66" rx="4.4" ry="3.4" fill={eye} />
        <path d="M 50 69 L 50 74 M 50 74 C 47 78 43 77 42 74 M 50 74 C 53 78 57 77 58 74" stroke={eye} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

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
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("shrink-0", TILE[size])}>
        <AnimalMark className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className={cn("font-display tracking-tight", WORD[size])}>
          <span className="font-semibold text-bark-900 dark:text-white">Stray</span><span className="font-extrabold text-paw-600 dark:text-paw-400">Paw</span>
        </span>
      )}
    </span>
  );
}
