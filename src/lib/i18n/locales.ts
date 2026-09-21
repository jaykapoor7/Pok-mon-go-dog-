/* The languages StrayPaw ships in.

   Adding one is meant to be a config change: append an entry here, add a
   dictionary file with the same key, and the switcher, the <html lang>, the
   cookie and the font stack all follow. Nothing else needs editing.

   `native` is what the switcher shows, because a reader looking for their
   own language scans for their own script, not for an English exonym.
   `short` is the 320px label. */
export const LOCALES = {
  en: { native: "English", short: "EN", htmlLang: "en", script: "latin" },
  hi: { native: "हिन्दी", short: "हिं", htmlLang: "hi", script: "devanagari" },
  ta: { native: "தமிழ்", short: "தமி", htmlLang: "ta", script: "tamil" },
  te: { native: "తెలుగు", short: "తెలు", htmlLang: "te", script: "telugu" },
  kn: { native: "ಕನ್ನಡ", short: "ಕನ್ನ", htmlLang: "kn", script: "kannada" },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_KEYS = Object.keys(LOCALES) as Locale[];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "straypaw.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALE_KEYS as string[]).includes(value);
}

/* An explicit choice always wins over a browser header: somebody who has
   picked a language has told us more than their device configuration has.
   Only when no choice exists is Accept-Language consulted, and only for its
   primary subtag, so "ta-IN" matches Tamil without needing a region table. */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  for (const part of String(acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    const primary = tag?.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
