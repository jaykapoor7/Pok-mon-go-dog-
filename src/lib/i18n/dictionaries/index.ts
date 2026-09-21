import type { Locale } from "../locales";
import type { Dictionary } from "./en";
import { en } from "./en";
import { hi } from "./hi";
import { ta } from "./ta";
import { te } from "./te";
import { kn } from "./kn";

/* One record, keyed by locale. Adding a language means adding a file and a
   line here; the switcher, the cookie and the font stack read from
   LOCALES and need no edit. */
export const DICTIONARIES: Record<Locale, Dictionary> = { en, hi, ta, te, kn };
export type { Dictionary };
