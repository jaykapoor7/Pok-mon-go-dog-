"use client";

import { useState } from "react";
import { Share2, Check, Link2, MessageCircle } from "lucide-react";
import { haptic } from "@/lib/haptics";

/**
 * Share-a-dog card. Uses the native share sheet where available (mobile), and
 * always offers WhatsApp, X, and copy-link fallbacks. The shared URL renders a
 * rich preview card via the dog page's Open Graph image (its cover photo).
 */
export function ShareDog({
  dogId,
  label,
  zone,
}: {
  dogId: string;
  label: string;
  zone: string;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    (typeof window !== "undefined" ? window.location.origin : "https://straypaw.kapoorjay.com") +
    `/dog/${dogId}`;
  const text = `Meet ${label} near ${zone} on StrayPaw 🐾 Follow this street dog's care.`;

  async function nativeShare() {
    haptic("light");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${label} · StrayPaw`, text, url });
        return;
      } catch {
        /* user cancelled — fall through to inline options */
      }
    }
    copyLink();
  }

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      haptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Share2 className="h-4 w-4 text-paw-500" /> Share this dog
        </p>
        <p className="mt-0.5 text-xs text-bark-400">
          Help {label.toLowerCase().startsWith("dog") ? "this dog" : label} get spotted, fed and cared for.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic("light")}
          aria-label="Share on WhatsApp"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1da851] transition-transform active:scale-95"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic("light")}
          aria-label="Share on X"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-bark-700 transition-transform active:scale-95 dark:bg-white/10 dark:text-bark-100"
        >
          <XLogo className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={copyLink}
          aria-label="Copy link"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-bark-700 transition-transform active:scale-95 dark:bg-white/10 dark:text-bark-100"
        >
          {copied ? <Check className="h-4 w-4 text-status-friendly" /> : <Link2 className="h-4 w-4" />}
        </button>
        <button
          onClick={nativeShare}
          className="inline-flex items-center gap-1.5 rounded-full bg-paw-500 px-3.5 py-2 text-xs font-bold text-white transition-transform active:scale-95"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
