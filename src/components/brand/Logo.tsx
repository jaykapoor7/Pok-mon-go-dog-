import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TILE: Record<Size, string> = {
  sm: "h-7 w-7 rounded-[0.55rem]",
  md: "h-9 w-9 rounded-xl",
  lg: "h-11 w-11 rounded-2xl",
};
const ICON: Record<Size, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};
const WORD: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * StrayPaw brand mark — an azure paw tile + wordmark. Inline SVG (via lucide),
 * so it stays crisp at any size, recolours with the theme, and never ships a
 * heavy raster. Use `showWordmark={false}` for a compact square mark.
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
      <span
        className={cn(
          "grid shrink-0 place-items-center bg-gradient-to-br from-paw-500 to-paw-700 text-white shadow-warm",
          TILE[size]
        )}
      >
        <PawPrint className={cn(ICON[size], "fill-white/90")} strokeWidth={2.25} />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-extrabold tracking-tightest text-bark-900 dark:text-bark-50",
            WORD[size]
          )}
        >
          Stray<span className="text-paw-600 dark:text-paw-300">Paw</span>
        </span>
      )}
    </span>
  );
}
