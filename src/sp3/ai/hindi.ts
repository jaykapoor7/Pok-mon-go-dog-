/* Hindi written in Devanagari, turned into the plain words Kaju's fixed rules already understand, so a field worker who
   types "खुले केस कितने हैं" gets the same answer as "how many open cases". Only for choosing what to look up: the
   model, when it is on, reads the original Hindi, and record names are never translated. Words not listed pass through
   unchanged; grammatical particles are dropped. Deterministic, no model. */

const WORDS: [RegExp, string][] = [
  [/कितने|कितनी|कितना/g, "how many"], [/कुत्तों|कुत्ते|कुत्ता|कुतिया|पिल्ले|पिल्ला/g, "dogs"], [/जानवरों|जानवर|पशुओं|पशु/g, "animals"],
  [/मामलों|मामले|केसों/g, "cases"], [/मामला|केस/g, "case"], [/खुले|खुला|चालू/g, "open"], [/बंद/g, "closed"],
  [/नसबंदी|बधियाकरण/g, "sterilised"], [/टीकाकरण|टीका|टीके|वैक्सीन/g, "vaccinated"], [/रेबीज़|रेबीज/g, "rabies"],
  [/फ़ॉलो-अप|फॉलो-अप|फॉलोअप|फ़ॉलोअप/g, "follow-up"], [/बकाया|लंबित|पेंडिंग|बाकी|बाक़ी/g, "pending"], [/देर से|देरी|पिछड़े/g, "overdue"],
  [/सारांश|सार/g, "summary"], [/रिपोर्ट/g, "report"], [/नोट/g, "note"], [/पैकेज/g, "package"], [/कार्य|काम/g, "task"],
  [/याद दिलाओ|याद दिलाना|याद दिलाएं|याद दिलाइए/g, "remind me"], [/दिखाओ|दिखाइए|दिखाएं|दिखाना|दिखा दो/g, "show"], [/बताओ|बताइए|बताएं|बता दो/g, "tell me"],
  [/जोड़ो|जोड़ें|जोड़िए|जोड़ दो/g, "add"], [/बनाओ|बनाइए|बनाएं|बना दो/g, "make"], [/जांचो|जाँचो|जांच|जाँच|चेक/g, "check"],
  [/आज/g, "today"], [/अभी/g, "now"], [/इस हफ्ते|इस हफ़्ते|इस सप्ताह/g, "this week"], [/पिछले हफ्ते|पिछले हफ़्ते|पिछले सप्ताह/g, "last week"],
  [/अगले हफ्ते|अगले हफ़्ते|अगले सप्ताह/g, "next week"], [/इस महीने/g, "this month"], [/पिछले महीने/g, "last month"], [/हफ्ते|हफ़्ते|सप्ताह/g, "week"], [/महीने|महीना/g, "month"],
  [/मेरे|मेरा|मेरी|मुझे/g, "my"], [/हमारे|हमारा|हमारी/g, "our"], [/इस|यह|ये/g, "this"], [/बिना/g, "without"], [/किसी को नहीं सौंपे|असाइन नहीं/g, "unassigned"],
  [/घायल|ज़ख्मी|जख्मी/g, "injured"], [/काटा|काटने|काटे/g, "bite"], [/वार्ड/g, "ward"], [/गंभीर/g, "critical"],
  [/क्या/g, "what"], [/कहाँ|कहां/g, "where"], [/कौन/g, "who"], [/कब/g, "when"], [/कैसे/g, "how"],
  [/नमस्ते|नमस्कार/g, "hello"], [/धन्यवाद|शुक्रिया/g, "thanks"], [/मदद/g, "help"], [/और/g, "and"], [/में/g, "in"], [/से/g, "from"],
  [/(?<![ऀ-ॿ])(?:के|की|का|को|है|हैं|था|थे|हुई|हुए|हुआ|हो|गए|गई|गया|लिए|पर|ने|भी|तो|ही|एक|करो|करें|कीजिए|कर दो|दो|दें)(?![ऀ-ॿ])/g, " "],
];
const DIGITS = "०१२३४५६७८९";
/* Whole words only: "सार" must not match inside "अनुसार", nor "से" inside another word. Devanagari vowel signs fall
   inside the same block, so a letter next to the match means it is part of a longer word. */
const whole = (re: RegExp) => new RegExp(`(?<![\u0900-\u097F])(?:${re.source})(?![\u0900-\u097F])`, "g");
const RULES = WORDS.map(([re, to]) => [whole(re), to] as const);

export const hasDevanagari = (q: string) => /[ऀ-ॿ]/.test(q);

/** Devanagari words to the English words the router reads; anything else is left as it was. */
export function fromDevanagari(q: string): string {
  if (!hasDevanagari(q)) return q;
  let s = q.replace(/[०-९]/g, (d) => String(DIGITS.indexOf(d))).replace(/[।॥]/g, ".");
  for (const [re, to] of RULES) s = s.replace(re, ` ${to} `);
  s = s.replace(/\s+/g, " ").trim();
  /* Hindi puts the verb last ("this case summary show"); the router reads commands verb first. */
  const verb = s.match(/\s(show|tell me|remind me|add|make|check)\s*[.?!]?$/);
  return verb ? `${verb[1]} ${s.slice(0, verb.index).trim()}` : s;
}
