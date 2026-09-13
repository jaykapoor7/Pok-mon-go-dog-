"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   The storage notice.

   Deliberately not a cookie banner, because StrayPaw sets no cookies and
   calls no third party. What it stores is one random value in
   localStorage so a repeat visit is not counted as a new person, and the
   events are written to StrayPaw's own database. No IP, no user agent,
   no fingerprinting, nothing shared with anybody.

   So this says that, in those words, and offers the one control that
   actually matters: turning it off. A generic "we value your privacy,
   Accept All" bar would be worse than useless here. It would describe
   something the product does not do, train the reader to dismiss
   notices without reading them, and take a tap to grant permission that
   was never needed.

   OPT-OUT, NOT OPT-IN, and that is a judgment worth stating plainly:
   first-party counts with no cross-site tracking are the case where
   opt-out is defensible. If StrayPaw ever adds a third-party tag, an
   advertising pixel, or anything that follows a person off this site,
   this has to become opt-in and blocking, and the analytics must not
   fire until a choice is made.

   It sits at the bottom above the phone's home indicator, dismisses to
   localStorage, and never returns once acknowledged.
   ════════════════════════════════════════════════════════════════════ */

const SEEN_KEY = "straypaw.notice.storage.v1";
const OPT_OUT_KEY = "straypaw.analytics.optout";

export function StorageNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* Every storage read is wrapped: it throws in private mode and under
       some enterprise policies, and a notice about storage must not be
       the thing that breaks the page when storage is unavailable. */
    try {
      if (!localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      /* No storage means nothing is being stored, so nothing to notice. */
    }
  }, []);

  const close = (optOut: boolean) => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
      if (optOut) localStorage.setItem(OPT_OUT_KEY, "1");
    } catch {
      /* Dismissal simply will not persist; the notice is not blocking. */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside className="snotice" role="region" aria-label="How this site stores data">
      <p>
        StrayPaw keeps one random ID in your browser so return visits are not
        counted twice. No cookies, no tracking across other sites, and nothing
        shared with anyone else. <Link href="/cookies">What is stored</Link>.
      </p>
      <div className="snotice-actions">
        <button type="button" className="snotice-ok" onClick={() => close(false)}>
          Got it
        </button>
        <button type="button" className="snotice-off" onClick={() => close(true)}>
          Don&apos;t count my visits
        </button>
      </div>
    </aside>
  );
}
