"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "straypaw-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Subtle, dismissible "Add to Home Screen" prompt.
 * - Chromium/Android: uses the native `beforeinstallprompt` flow.
 * - iOS Safari (no such event): shows the manual Share → Add to Home Screen hint.
 * Hidden once installed (display-mode: standalone) or after the user dismisses it.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (dismissed || standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires beforeinstallprompt — detect it and show the manual hint.
    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-[5.5rem] z-[55] mx-auto max-w-md lg:bottom-6 lg:left-64 lg:right-auto lg:mx-0">
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-paper/95 p-3 shadow-pop backdrop-blur-xl dark:border-white/10 dark:bg-ink/95">
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add StrayPaw to your home screen</p>
          {iosHint ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-bark-500">
              Tap <Share className="inline h-3.5 w-3.5" /> then “Add to Home Screen”.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-bark-500">Open it like an app — one tap away.</p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-paw-500 px-3.5 py-2 text-xs font-bold text-white"
          >
            <Download className="h-3.5 w-3.5" /> Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-bark-400 hover:bg-black/[0.05] dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
