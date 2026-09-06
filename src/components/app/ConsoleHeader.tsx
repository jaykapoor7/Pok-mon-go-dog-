import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

/**
 * The masthead every console page shares.
 *
 * Half the console was already using this shape — a mono kicker, a 38px
 * Instrument Serif headline, a quiet line of description — and half was
 * using `text-xl font-semibold tracking-tight`, which is the header any
 * dashboard anywhere has. Two different ideas of what a page title is, in
 * one product. This is the first one, made into a component so there is
 * only one.
 *
 * The kicker matters more than it looks. It is the section a page belongs
 * to, set in the mono face at 11px, and it is what stops a 38px serif
 * headline from floating unanchored at the top of a wide screen. Editorial
 * pages have had a standfirst above the headline for two hundred years for
 * the same reason.
 */
export function ConsoleHeader({
  kicker,
  title,
  description,
  actions,
  /* Some pages carry their own filter row directly beneath the rule and
     supply their own spacing; they opt out of the bottom margin. */
  flush = false,
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
}) {
  return (
    <header className={flush ? undefined : "mb-7"}>
      <div className="spa-head">
        <div className="min-w-0">
          {kicker && <span className="spa-mono">{kicker}</span>}
          <h1>{title}</h1>
          {description && (
            <p className="mt-2.5 max-w-prose text-[13.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {/* A hairline, not a border on the header box: the rule belongs to the
          page, and it should run the full measure rather than stopping at
          whatever the title happens to be wrapped in. */}
      <Separator className="mt-5" />
    </header>
  );
}
