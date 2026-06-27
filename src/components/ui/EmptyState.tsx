import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared, on-brand empty state: an olive icon medallion + title, with an
 * optional description and primary CTA. Keeps Account / Feed / Cases (etc.)
 * looking designed and consistent instead of a bare emoji.
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
    <div className="card p-10 text-center">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-paw-100 text-paw-600 dark:bg-bark-800 dark:text-paw-300">
        {icon}
      </span>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && (
        <p className="mx-auto mt-1 max-w-xs text-sm text-bark-500">{description}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-primary mt-5 px-5 py-2.5 text-sm">
          {action.icon}
          {action.label}
        </Link>
      )}
    </div>
  );
}
