"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICTIONARIES, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "./locales";

type Ctx = { locale: Locale; t: Dictionary; setLocale: (next: Locale) => void };

const LocaleContext = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  t: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
});

function readCookie(name: string): string | null {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

/* Language is resolved on the client, after hydration, and never during the
   server render. The alternative is varying the HTML by Accept-Language,
   which breaks static generation and full-page caching for every visitor to
   give a minority a first paint in their language.

   The cost is honest and small: the first frame is English, then the chosen
   language applies. The benefit is that nothing about the existing routing,
   caching or URLs changes, so no page can break by being translated.

   A choice is stored in a first-party cookie, not localStorage, so a future
   server-side render can read it without another round trip. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = readCookie(LOCALE_COOKIE);
    if (isLocale(stored)) {
      setLocaleState(stored);
      return;
    }
    /* No explicit choice yet, so fall back to what the device asks for.
       Only the primary subtag matters: "ta-IN" is Tamil. */
    try {
      for (const tag of navigator.languages ?? [navigator.language]) {
        const primary = String(tag).split("-")[0]?.toLowerCase();
        if (isLocale(primary)) {
          setLocaleState(primary);
          return;
        }
      }
    } catch {
      /* Locale detection is a convenience; English is a working default. */
    }
  }, []);

  useEffect(() => {
    /* Keep the document in step so screen readers announce the right
       language and the browser picks the right font and hyphenation.

       Written only when it would actually change. The server already
       renders lang="en" and data-locale="en", so an English visitor -- the
       default, and every visitor's first paint -- gets no write at all.
       Touching <html> immediately after hydration was surfacing an
       intermittent hydration error on /report. */
    try {
      const root = document.documentElement;
      const next = LOCALES[locale].htmlLang;
      if (root.lang !== next) root.lang = next;
      if (root.getAttribute("data-locale") !== locale) {
        root.setAttribute("data-locale", locale);
      }
    } catch {
      /* Nothing to do if the document is unavailable. */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      /* A year, first-party, lax: it is a display preference, not a
         tracking identifier, and it must survive a return visit. */
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* The choice still applies for this session. */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
