import type { Dictionary } from "./en";

/* Hindi, plain official register -- the tone of a municipal notice, not of
   an advertisement and not Hinglish. Interface chrome only. Every string
   here is awaiting native-speaker review; see docs/i18n-review-checklist.md. */
export const hi: Dictionary = {
  nav: {
    home: "मुख्य पृष्ठ",
    map: "नक्शा",
    report: "सूचना दें",
    stories: "विवरण",
    organisations: "संस्थाएँ",
    evidence: "प्रमाण",
    mission: "उद्देश्य",
    forNgos: "स्वयंसेवी संस्थाओं के लिए",
    forGovernments: "नगर निकायों के लिए",
    about: "परिचय",
    help: "सहायता",
    resources: "संसाधन",
    menu: "मेन्यू",
    close: "बंद करें",
  },
  actions: {
    reportAnimal: "पशु की सूचना दें",
    reportSighting: "देखे गए पशु की सूचना दें",
    openMap: "नक्शा खोलें",
    findAnimal: "पशु खोजें",
    seeAll: "सभी देखें",
    back: "पीछे",
    next: "आगे",
    skipForNow: "अभी छोड़ें",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    retry: "पुनः प्रयास करें",
  },
  language: {
    label: "भाषा",
    choose: "भाषा चुनें",
    partial: "कुछ पृष्ठ अभी अंग्रेज़ी में हैं।",
  },
  status: {
    reported: "सूचित",
    underReview: "समीक्षाधीन",
    verified: "सत्यापित",
    inCare: "देखभाल में",
    resolved: "पूर्ण",
    needsHelp: "सहायता चाहिए",
    locationPending: "स्थान दर्ज नहीं",
  },
  common: {
    loading: "लोड हो रहा है",
    offline: "आप ऑफ़लाइन हैं",
    noResults: "यहाँ अभी कोई रिकॉर्ड नहीं है",
  },
};
