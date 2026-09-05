import Image from "next/image";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TILE: Record<Size, string> = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
const WORD: Record<Size, string> = { sm: "text-base", md: "text-xl", lg: "text-2xl" };

/**
 * Compact mark, the circular StrayPaw badge.
 * Crisp at any size, used in navbars, tabs, small chips.
 */
export function AnimalMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/straypaw-logo.svg"
        alt="StrayPaw"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/**
 * Full badge, larger display size, hero / CTA sections.
 */
export function StrayPawBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/straypaw-logo.svg"
        alt="StrayPaw, See. Care. Act."
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/**
 * Wordmark, compact mark + "StrayPaw" text, used in nav rails and top bars.
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
      <AnimalMark className={cn("shrink-0", TILE[size])} />
      {showWordmark && (
        <span className={cn("font-display tracking-tight", WORD[size])}>
          <span className="font-semibold text-bark-900 dark:text-white">Stray</span>
          <span className="font-extrabold text-paw-600 dark:text-paw-400">Paw</span>
        </span>
      )}
    </span>
  );
}
