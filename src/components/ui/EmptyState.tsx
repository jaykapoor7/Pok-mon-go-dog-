import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * The shared empty state: an icon, a line of type and, when there is one,
 * the next step. Unboxed, so an empty page reads as quiet space on the
 * sheet rather than a card inside a card.
 *
 * Six surfaces render this one component — Cases, Feed, Account, Fundraisers,
 * Feeding, News — so an empty page is the same shape everywhere.
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
    <div className="es">
      <span className="es-icon" aria-hidden>{icon}</span>
      <h2 className="es-title">{title}</h2>
      {description && <p className="es-text">{description}</p>}
      {action && (
        <Button asChild className="es-act">
          <Link href={action.href}>
            {action.icon}
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  );
}
