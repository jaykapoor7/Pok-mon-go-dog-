"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   The way back.

   Every screen you can get pushed into needs one, and it needs to still be
   there once you have scrolled: on a phone, the browser's back gesture is
   not something everyone knows, and a control that scrolls off the top is
   a control that exists for two seconds.

   So it sticks to the top of the content column rather than floating over
   it. A floating pill lands on top of whatever you were reading; this
   keeps its own line and pushes the page down by its own height, which is
   the difference between out of the way and in the way.

   `to` gives it a fixed destination. Without one it goes back through
   history, falling through to `fallback` when there is nothing behind it,
   which is what happens when somebody opens a link from an email.
   ════════════════════════════════════════════════════════════════════ */

export function BackLink({
  label = "Back",
  to,
  fallback = "/app",
}: {
  label?: string;
  to?: string;
  fallback?: string;
}) {
  const router = useRouter();

  return (
    <div className="backbar">
      <button
        type="button"
        className="backbtn"
        onClick={() => {
          if (to) {
            router.push(to);
            return;
          }
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
          }
          router.push(fallback);
        }}
      >
        <ArrowLeft size={15} />
        {label}
      </button>
    </div>
  );
}
