import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TILE: Record<Size, string> = {
  sm: "h-7 w-7 rounded-[0.55rem]",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-2xl",
};
const WORD: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

let uid = 0;

/** StrayPaw "Badge" mark — a light-blue gradient tile wrapping a bold white
 *  DOG head: a rounded face, two floppy ears hanging at the sides, a snout with
 *  a nose, and expressive eyes that reveal the gradient through the head. Inline
 *  SVG, so it stays crisp at any size. */
export function AnimalMark({ className }: { className?: string }) {
  const id = `sp-mark-${(uid = (uid + 1) % 100000)}`;
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c1fd" />
          <stop offset="45%" stopColor="#3b7de6" />
          <stop offset="100%" stopColor="#1e50b0" />
        </linearGradient>
      </defs>
      {/* Tile */}
      <rect width="100" height="100" rx="23" fill={`url(#${id})`} />
      {/* Inner ring */}
      <rect x="6" y="6" width="88" height="88" rx="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
      {/* Floppy ears — drawn first so the head tucks over their tops (drop down
          the sides, unmistakably a dog, not tall rabbit ears) */}
      <path d="M 33 34 C 16 30 11 44 13 58 C 14 70 24 74 33 68 C 30 58 30 44 33 34 Z" fill="white" />
      <path d="M 67 34 C 84 30 89 44 87 58 C 86 70 76 74 67 68 C 70 58 70 44 67 34 Z" fill="white" />
      {/* Head */}
      <circle cx="50" cy="54" r="25" fill="white" />
      {/* Snout — a rounded muzzle protruding at the bottom of the face */}
      <ellipse cx="50" cy="70" rx="15" ry="12" fill="white" />
      {/* Eyes reveal the gradient through the white head */}
      <ellipse cx="41" cy="50" rx="3.4" ry="4" fill={`url(#${id})`} />
      <ellipse cx="59" cy="50" rx="3.4" ry="4" fill={`url(#${id})`} />
      <circle cx="42.2" cy="48.6" r="1.15" fill="white" fillOpacity="0.9" />
      <circle cx="60.2" cy="48.6" r="1.15" fill="white" fillOpacity="0.9" />
      {/* Nose + snout crease */}
      <ellipse cx="50" cy="66" rx="4.2" ry="3.2" fill={`url(#${id})`} />
      <path d="M 50 69 L 50 74 M 50 74 C 47 78 43 77 42 74 M 50 74 C 53 78 57 77 58 74" stroke={`url(#${id})`} strokeWidth="1.6" strokeLinecap="round" fill="none" />
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("shrink-0 overflow-hidden shadow-warm", TILE[size])}>
        <AnimalMark className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className={cn("font-display tracking-tight text-bark-900 dark:text-bark-50", WORD[size])}>
          <span className="font-light">Stray</span><span className="font-extrabold">Paw</span>
        </span>
      )}
    </span>
  );
}
