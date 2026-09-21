"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LOCALES, LOCALE_KEYS, type Locale } from "@/lib/i18n/locales";

/* The language control.

   Each option is written in its own script, because somebody looking for
   Tamil scans for தமிழ், not for the word "Tamil" in English. The trigger
   shows the short form so it survives 320px beside the rest of the header. */
export function LanguageSwitcher() {
  const { locale, t, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="lang" ref={wrap}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.language.choose}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={14} aria-hidden />
        <span>{LOCALES[locale].short}</span>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t.language.label}>
          {LOCALE_KEYS.map((key) => (
            <li key={key}>
              <button
                type="button"
                role="option"
                aria-selected={key === locale}
                lang={LOCALES[key].htmlLang}
                onClick={() => choose(key)}
              >
                <span>{LOCALES[key].native}</span>
                {key === locale && <Check size={13} aria-hidden />}
              </button>
            </li>
          ))}
          <li className="lang-note">{t.language.partial}</li>
        </ul>
      )}
    </div>
  );
}
