"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

/**
 * Route-level error boundary. Without this, a render error anywhere in the app
 * falls through to Next's default screen, which leaks a stack trace in dev and
 * shows an unbranded page in production.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack in production.
    console.error("Route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-vermilion">
        Error / this view failed to render
      </p>
      <h1 className="mt-3 font-display text-4xl leading-none tracking-tight">
        Something broke here.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-bark-600">
        This page hit an error. Your data is unaffected, nothing was written.
        Try again, and if it keeps happening the rest of the console still works.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-[11px] text-bark-400">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <button onClick={reset} className="btn-primary px-5 py-3">
          <RotateCw className="h-4 w-4" /> Try again
        </button>
        <Link href="/app" className="btn-ghost px-5 py-3">
          Console home
        </Link>
      </div>
    </div>
  );
}
