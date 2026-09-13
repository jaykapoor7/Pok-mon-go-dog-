"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/* ════════════════════════════════════════════════════════════════════
   One view, counted on every route.

   Analytics was wired into two pages out of eighty-two: the landing page
   and an animal record. Everything else — the evidence pages a funder
   reads, the education pages a school reads, the console an NGO works in
   — was invisible, so there was no way to answer "which pages do people
   actually open" during a pilot.

   This sits in the root layout and fires once per path, including on a
   client-side navigation, which the per-page component could not do
   because the layout never unmounts.

   IT COUNTS A PATH, NOT A PERSON. The path is normalised before it is
   sent: an id inside a URL is replaced with :id, so a record view is
   recorded as /dog/:id rather than as the identifier of the animal
   somebody was looking at. Opt-out is honoured inside track() itself,
   and nothing here runs before that check.
   ════════════════════════════════════════════════════════════════════ */

function normalise(path: string) {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")   // uuid
    .replace(/\/\d+(?=\/|$)/g, "/:id")                    // numeric id
    .slice(0, 120);
}

/* track()'s own `once` is keyed by event name, which would have counted
   one page_view per session and nothing after it. Deduping belongs here,
   per path, so a person who opens six pages is six views and a page
   re-rendered twice is still one. */
const seen = new Set<string>();

export function RouteViews() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const path = normalise(pathname);
    if (seen.has(path)) return;
    seen.add(path);
    track("page_view", { path });
  }, [pathname]);
  return null;
}
