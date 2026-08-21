import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "./MarketingNav";

/** Bare marketing page (no app chrome) with the floating bubble nav. */
export function MarketingShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-paper text-bark-900 dark:bg-ink dark:text-bark-50">
      <MarketingNav />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-paw-100/60 to-transparent dark:from-paw-900/20"
      />
      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-28 sm:pt-32">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        {eyebrow && (
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-paw-600">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tightest sm:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 text-lg leading-relaxed text-bark-600 dark:text-bark-300">{intro}</p>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
