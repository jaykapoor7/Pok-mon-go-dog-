/* The source of truth for every translatable string.

   Scope is deliberately narrow: interface chrome only -- navigation, the
   labels on controls, and the few sentences that frame a screen. It does
   NOT contain medical guidance, legal copy, or anything a reader could be
   harmed by misunderstanding. Those stay in English until a qualified human
   has signed off a translation; see docs/i18n-review-checklist.md.

   Never translated, in any language: record codes, organisation names,
   people's names, locality names, and numerals in data. Latin numerals are
   standard in Indian civic documents, and a record code that changes shape
   between languages stops being a shared identifier. */
export const en = {
  nav: {
    home: "Home",
    map: "Map",
    report: "Report",
    stories: "Stories",
    organisations: "Partner NGOs",
    evidence: "Evidence",
    mission: "Mission",
    forNgos: "For NGOs",
    forGovernments: "For municipal bodies",
    about: "About",
    help: "Help",
    resources: "Resources",
    menu: "Menu",
    close: "Close",
  },
  actions: {
    reportAnimal: "Report an animal",
    reportSighting: "Report a sighting",
    openMap: "Open the map",
    findAnimal: "Find an animal",
    seeAll: "See all",
    back: "Back",
    next: "Next",
    skipForNow: "Skip for now",
    signIn: "Sign in",
    signOut: "Sign out",
    retry: "Try again",
  },
  language: {
    label: "Language",
    choose: "Choose a language",
    /* Shown under the switcher wherever a page is only partly translated,
       so nobody mistakes English body text for a missing translation. */
    partial: "Some pages are still in English.",
  },
  status: {
    reported: "Reported",
    underReview: "Under review",
    verified: "Verified",
    inCare: "In care",
    resolved: "Resolved",
    needsHelp: "Needs help",
    locationPending: "Location pending",
  },
  common: {
    loading: "Loading",
    offline: "You are offline",
    noResults: "Nothing recorded here yet",
  },
} as const;

/* `as const` above keeps the English file readable as data, but it also
   types every value as its own literal, which would make a translation a
   type error rather than a translation. Widen the leaves to string while
   keeping the shape, so a missing or misspelled key is still caught. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof en>;
