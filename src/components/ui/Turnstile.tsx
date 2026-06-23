"use client";

import { useCallback, useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const HAS_TURNSTILE = !!TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile checkbox. Renders nothing if no site key is configured,
 * so the form still works during local development / before keys are added.
 * Emits the verification token (or null when it expires / errors).
 */
export function Turnstile({
  onVerify,
}: {
  onVerify: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const render = useCallback(() => {
    if (!window.turnstile || !ref.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      callback: (token: string) => onVerify(token),
      "expired-callback": () => onVerify(null),
      "error-callback": () => onVerify(null),
    });
  }, [onVerify]);

  useEffect(() => {
    if (!HAS_TURNSTILE) return;

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          render();
        }
      }, 200);
      return () => clearInterval(t);
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
        widgetId.current = null;
      }
    };
  }, [render]);

  if (!HAS_TURNSTILE) return null;
  return <div ref={ref} className="flex justify-center" />;
}
