import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * The shared empty state, now composed from shadcn's Card and Button instead
 * of a `.card` div and a `.btn-primary` anchor.
 *
 * Six surfaces render this one component — Cases, Feed, Account, Fundraisers,
 * Feeding, News — so an empty page is the same shape everywhere. That was
 * already true; what changes is that the heading is a real CardTitle, the
 * description a CardDescription, and the action a Button, so this state
 * inherits the same type scale, spacing and focus behaviour as the rest of
 * the interface rather than approximating them.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { href: string; label: string; icon?: ReactNode };
}) {
  return (
    <Card className="text-center">
      <CardHeader className="items-center gap-0 pb-2">
        <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded bg-accent text-accent-foreground">
          {icon}
        </span>
        <CardTitle className="font-display text-lg font-normal">{title}</CardTitle>
        {description && (
          <CardDescription className="mx-auto max-w-xs">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      {/* CardContent carries the block's lower padding when there is no
          action, so an empty state without a CTA is not bottom-heavy. */}
      {action ? (
        <CardFooter className="justify-center pb-6">
          <Button asChild>
            <Link href={action.href}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        </CardFooter>
      ) : (
        <CardContent className="pb-6" />
      )}
    </Card>
  );
}
