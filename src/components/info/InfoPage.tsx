import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function InfoPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      {updated && (
        <p className="mt-1 text-xs text-bark-400">Last updated {updated}</p>
      )}
      <div className="prose-straypaw mt-6 space-y-4 text-[15px] leading-relaxed text-bark-700 dark:text-bark-200">
        {children}
      </div>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-bold text-bark-900 dark:text-bark-50">
      {children}
    </h2>
  );
}
