import type { Dictionary } from "./en";

/* Telugu, plain official register. Interface chrome only. Awaiting
   native-speaker review; see docs/i18n-review-checklist.md. */
export const te: Dictionary = {
  nav: {
    home: "ముఖపేజీ",
    map: "పటం",
    report: "తెలియజేయండి",
    stories: "వివరాలు",
    organisations: "సంస్థలు",
    evidence: "ఆధారాలు",
    mission: "లక్ష్యం",
    forNgos: "స్వచ్ఛంద సంస్థల కోసం",
    forGovernments: "మునిసిపల్ సంస్థల కోసం",
    about: "మా గురించి",
    help: "సహాయం",
    resources: "వనరులు",
    menu: "మెనూ",
    close: "మూసివేయి",
  },
  actions: {
    reportAnimal: "జంతువు గురించి తెలియజేయండి",
    reportSighting: "కనిపించిన జంతువును తెలియజేయండి",
    openMap: "పటం తెరవండి",
    findAnimal: "జంతువును వెతకండి",
    seeAll: "అన్నీ చూడండి",
    back: "వెనుకకు",
    next: "తరువాత",
    skipForNow: "ఇప్పుడు వదిలేయండి",
    signIn: "సైన్ ఇన్",
    signOut: "సైన్ అవుట్",
    retry: "మళ్లీ ప్రయత్నించండి",
  },
  language: {
    label: "భాష",
    choose: "భాషను ఎంచుకోండి",
    partial: "కొన్ని పేజీలు ఇంకా ఆంగ్లంలో ఉన్నాయి.",
  },
  status: {
    reported: "తెలియజేయబడింది",
    underReview: "సమీక్షలో",
    verified: "ధృవీకరించబడింది",
    inCare: "సంరక్షణలో",
    resolved: "పూర్తయింది",
    needsHelp: "సహాయం కావాలి",
    locationPending: "స్థలం నమోదు కాలేదు",
  },
  common: {
    loading: "లోడ్ అవుతోంది",
    offline: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు",
    noResults: "ఇక్కడ ఇంకా రికార్డు లేదు",
  },
};
