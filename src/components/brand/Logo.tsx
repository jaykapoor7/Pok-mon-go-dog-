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

/** StrayPaw "Badge" mark (Figma Direction 01) — a warm gradient tile (gold →
 *  orange → rust) wrapping a bold white animal head: rounded ears, a soft muzzle,
 *  and expressive eyes that reveal the gradient through the head. Inline SVG, so
 *  it stays crisp at any size. */
export function AnimalMark({ className }: { className?: string }) {
  const id = `sp-mark-${(uid = (uid + 1) % 100000)}`;
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFCC00" />
          <stop offset="42%" stopColor="#FF7234" />
          <stop offset="100%" stopColor="#C0321A" />
        </linearGradient>
      </defs>
      {/* Tile */}
      <rect width="100" height="100" rx="23" fill={`url(#${id})`} />
      {/* Inner ring */}
      <rect x="6" y="6" width="88" height="88" rx="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.22" fill="none" />
      {/* Ears */}
      <path d="M 20 56 L 31 15 Q 34 10 38 14 L 49 42" fill="white" />
      <path d="M 80 56 L 69 15 Q 66 10 62 14 L 51 42" fill="white" />
      {/* Head */}
      <circle cx="50" cy="63" r="28" fill="white" />
      {/* Muzzle — semi-transparent so the gradient warms through */}
      <ellipse cx="50" cy="77" rx="13.5" ry="9.5" fill="white" fillOpacity="0.42" />
      {/* Eyes reveal the gradient through the white head */}
      <circle cx="41" cy="58" r="3.5" fill={`url(#${id})`} />
      <circle cx="59" cy="58" r="3.5" fill={`url(#${id})`} />
      <circle cx="42.5" cy="56.5" r="1.2" fill="white" fillOpacity="0.85" />
      <circle cx="60.5" cy="56.5" r="1.2" fill="white" fillOpacity="0.85" />
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
