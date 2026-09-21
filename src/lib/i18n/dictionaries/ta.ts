import type { Dictionary } from "./en";

/* Tamil, plain official register. Interface chrome only. Awaiting
   native-speaker review; see docs/i18n-review-checklist.md. */
export const ta: Dictionary = {
  nav: {
    home: "முகப்பு",
    map: "வரைபடம்",
    report: "தெரிவிக்க",
    stories: "விவரங்கள்",
    organisations: "அமைப்புகள்",
    evidence: "சான்றுகள்",
    mission: "நோக்கம்",
    forNgos: "தன்னார்வ அமைப்புகளுக்கு",
    forGovernments: "நகராட்சி அமைப்புகளுக்கு",
    about: "எங்களைப் பற்றி",
    help: "உதவி",
    resources: "வளங்கள்",
    menu: "பட்டி",
    close: "மூடு",
  },
  actions: {
    reportAnimal: "விலங்கைத் தெரிவிக்க",
    reportSighting: "கண்ட விலங்கைத் தெரிவிக்க",
    openMap: "வரைபடத்தைத் திற",
    findAnimal: "விலங்கைத் தேடு",
    seeAll: "அனைத்தையும் காண",
    back: "பின்",
    next: "அடுத்து",
    skipForNow: "இப்போது தவிர்",
    signIn: "உள்நுழை",
    signOut: "வெளியேறு",
    retry: "மீண்டும் முயற்சி",
  },
  language: {
    label: "மொழி",
    choose: "மொழியைத் தேர்வுசெய்",
    partial: "சில பக்கங்கள் இன்னும் ஆங்கிலத்தில் உள்ளன.",
  },
  status: {
    reported: "தெரிவிக்கப்பட்டது",
    underReview: "பரிசீலனையில்",
    verified: "சரிபார்க்கப்பட்டது",
    inCare: "சிகிச்சையில்",
    resolved: "நிறைவு",
    needsHelp: "உதவி தேவை",
    locationPending: "இடம் பதிவாகவில்லை",
  },
  common: {
    loading: "ஏற்றுகிறது",
    offline: "நீங்கள் இணையத்தில் இல்லை",
    noResults: "இங்கு இன்னும் பதிவு இல்லை",
  },
};
