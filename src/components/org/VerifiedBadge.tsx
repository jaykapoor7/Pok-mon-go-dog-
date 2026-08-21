import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trust badge for an organization. Shows "Verified partner" ONLY when the
 * backend actually flags the org verified — otherwise it states, plainly, that
 * verification is pending. We never imply trust the data doesn't support.
 */
export function VerifiedBadge({
  verified,
  size = "md",
  className,
}: {
  verified: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (verified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-paw-500 font-bold text-white",
          pad,
          className
        )}
      >
        <ShieldCheck className={icon} /> Verified partner
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-bark-200 bg-bark-50 font-semibold text-bark-500 dark:border-bark-700 dark:bg-bark-800 dark:text-bark-300",
        pad,
        className
      )}
    >
      <ShieldQuestion className={icon} /> Verification pending
    </span>
  );
}
