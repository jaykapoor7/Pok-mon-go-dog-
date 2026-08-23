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

/** StrayPaw animal-head mark — a rounded tile with a blue gradient and a white
 *  head whose eyes reveal the gradient through it. Inline SVG, so it stays
 *  crisp at any size and re-colours from the brand tokens. */
export function AnimalMark({ className }: { className?: string }) {
  const id = `sp-mark-${(uid = (uid + 1) % 100000)}`;
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b86f0" />
          <stop offset="1" stopColor="#2842a0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${id})`} />
      {/* white head: two pointed ears + a rounded face narrowing to a chin */}
      <path
        fill="#fff"
        d="M150 96 C158 168 176 196 205 214 C168 244 156 300 190 356 C214 396 254 420 256 420 C258 420 298 396 322 356 C356 300 344 244 307 214 C336 196 354 168 362 96 C318 118 282 150 262 176 C258 168 254 168 250 176 C230 150 194 118 150 96 Z"
      />
      {/* eyes reveal the gradient through the white head */}
      <g fill={`url(#${id})`}>
        <ellipse cx="221" cy="250" rx="15" ry="20" />
        <ellipse cx="291" cy="250" rx="15" ry="20" />
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("shrink-0 overflow-hidden shadow-warm", TILE[size])}>
        <AnimalMark className="h-full w-full" />
      </span>
      {showWordmark && (
        <span className={cn("font-display font-extrabold tracking-tightest text-bark-900 dark:text-bark-50", WORD[size])}>
          Stray<span className="text-paw-600 dark:text-paw-300">Paw</span>
        </span>
      )}
    </span>
  );
}
