// ════════════════════════════════════════════════════════════════
// Education partners.
//
// StrayPaw does not write teaching material. Organisations that have spent
// years doing it write it far better, so the education area exists to carry
// theirs, under their own name.
//
// This is a registry rather than a page of hand-written blocks, because the
// intent is more than one partner. Adding the second is a row here; the page
// comes from it.
//
// Everything listed is a real organisation doing real, published work, named
// with a link to it. There is no status field and no "coming soon" shelf: a
// page either carries something somebody can use or it does not carry it.
// ════════════════════════════════════════════════════════════════

export interface EducationPartner {
  id: string;
  name: string;
  /** Expanded, because the acronym on its own is regularly got wrong. */
  fullName: string;
  city: string;
  url: string;
  /** What the organisation does, in its own terms. */
  summary: string;
  /** Named programmes, as the organisation describes them. */
  programmes: string[];
  source: string;
}

export const EDUCATION_PARTNERS: EducationPartner[] = [
  {
    id: "straw-india",
    name: "STRAW India",
    fullName: "Stray Relief and Animal Welfare (STRAW) India",
    city: "New Delhi",
    url: "https://www.strawindia.org/",
    summary:
      "A New Delhi organisation whose work is humane education: teaching children and young people about animals, coexistence and responsible behaviour, rather than running field operations.",
    programmes: [
      "Compassionate Classrooms: animal-welfare content written into school textbooks with CBSE and state education boards",
      "Animal-welfare workshops and presentations in schools and colleges",
      "Painting and essay-writing programmes, and nature walks",
    ],
    source: "strawindia.org",
  },
  {
    id: "the-kind-hour-foundation",
    name: "The Kind Hour Foundation",
    fullName: "The Kind Hour Foundation",
    city: "Lucknow",
    url: "https://www.thekindhour.org",
    summary:
      "A Lucknow animal-protection organisation that works on prevention: education, vaccination, sterilisation and community engagement. Its stated aim is to replace rescue and shelter organisations with local communities that care for the animals around them, and it believes change best happens through art.",
    programmes: [
      "School sessions for young children on animals, habitats and everyday do's and don'ts",
      "Rethinking Indies: who street dogs are, the myths about them, and what anyone can do, in English and Hindi",
      "Gully Gang: a public-art intervention with the Animal Law Centre, NALSAR Hyderabad",
    ],
    source: "thekindhour.org",
  },
];

/* ════════════════════════════════════════════════════════════════
   The Kind Hour Foundation's teaching material.

   Five session decks Kind Hour shared with StrayPaw. What follows is
   taken from them and nothing else: the lessons are the decks' own
   points, in their own order and words where the words were given, and
   the Hindi is the decks' Hindi. A deck that carried no text on a slide
   (a story told aloud, a video) is described, not reconstructed. The
   decks themselves stay with Kind Hour; a school asks them for a session.
   ════════════════════════════════════════════════════════════════ */

export type KindHourDeck = {
  id: string; title: string; audience: string; slides: number; languages: string; covers: string[];
};

export const KIND_HOUR_DECKS: KindHourDeck[] = [
  { id: "learn-about-nature", title: "Learn about nature", audience: "Young children", slides: 33, languages: "English, with Hindi on the closing slide",
    covers: ["Whom we love and care about: family, teachers, friends, birds, the dog in your locality", "We feel love and pain equally; we just speak a different language", "Wild animals, birds, water animals, grassland animals, and dogs and cats as the only domestic animals", "A do's and don'ts activity with cue cards"] },
  { id: "coexisting-with-the-planet", title: "Coexisting with the planet", audience: "Primary and middle school", slides: 100, languages: "English",
    covers: ["Types of animals and where they belong, and why zoos exist (ex-situ conservation)", "Pets as younger siblings for life; fostering and adoption", "Pain, hunger, thirst, cold and heat: what animals feel like us", "What to do for them, a 'responsible kid' checklist, and what the law says"] },
  { id: "rethinking-indies", title: "Rethinking Indies", audience: "Schools and communities", slides: 36, languages: "English and Hindi, every slide",
    covers: ["What street dogs are: Indian breeds that evolved with us, and were abandoned when foreign breeds came home", "Busting stigma: ten beliefs about street dogs", "What street dogs do for us", "What you can do, and a story"] },
  { id: "hello", title: "Hello!", audience: "Older students and adults; its opening is sensitive", slides: 42, languages: "English, with an Urdu poem",
    covers: ["An empathy session: noticing what you feel before putting it into words", "How intuition differs from what society teaches us to feel, depending on who the victim is", "Film clips and a reading of Faiz Ahmad Faiz's poem about street dogs, open to interpretation", "Why do we need to care?"] },
  { id: "gully-gang-goa", title: "Gully Gang", audience: "Colleges and clubs", slides: 67, languages: "English",
    covers: ["Representation of animals on streets and in public space", "The Gully Gang public-art intervention, with the Animal Law Centre, NALSAR Hyderabad", "Advertising and fundraising as art for a cause: document, regulate, mobilise, repeat", "A Goa version, closing with the Environment Protection Club, GCA"] },
];

/** Rethinking Indies, "Busting stigma": the ten beliefs, as the deck states them. */
export const KIND_HOUR_MYTHS: { en: string; hi: string }[] = [
  { en: "They are aggressive in nature", hi: "ये स्वभाव से आक्रामक होते हैं" },
  { en: "They are dirty, unhygienic and create nuisance", hi: "ये गंदे और अस्वच्छ होते हैं और हमारे आस-पास अव्यवस्था फैलाते हैं" },
  { en: "They increase in number when we feed them", hi: "भूखे कुत्तों को भोजन देने से उनकी आबादी बढ़ती है" },
  { en: "They have rabies", hi: "यह कुत्ते रेबीज़ फैलाते हैं" },
  { en: "They chase people for no reason", hi: "ये बिना किसी कारण लोगों के पीछे भागते हैं" },
  { en: "It is illegal to feed or take care of street dogs", hi: "इन्हें खाना खिलाना या इनकी देखभाल करना गैरकानूनी है" },
  { en: "All street dogs are low quality breeds", hi: "सड़क पर रहने वाले कुत्ते कमतर नस्ल के होते हैं" },
  { en: "Only foreign breed dogs are lovable", hi: "विदेशी नस्ल के कुत्ते ही योग्य, सुंदर और पालने लायक होते हैं" },
  { en: "Street dogs are useless and can't be trained", hi: "गली के कुत्ते बेकार हैं और उन्हें ट्रेन नहीं किया जा सकता" },
  { en: "Removing them will fix everything", hi: "गली से कुत्तों को हटा दो, सब ठीक हो जाएगा" },
];

export type KindHourLesson = { n: string; title: string; from: string; points: string[]; hi?: string };

/** The core lessons, each drawn from one deck. */
export const KIND_HOUR_LESSONS: KindHourLesson[] = [
  { n: "01", title: "Who street dogs are", from: "Rethinking Indies", hi: "आवारा कुत्ते क्या होते हैं?",
    points: ["Breeds that have evolved with Indians through wars, famines and natural disasters.", "Indian breeds that have been abandoned on streets because we got foreign breeds at home."] },
  { n: "02", title: "What they do for a street", from: "Rethinking Indies", hi: "यह कुत्ते आखिर हमारे लिए किस काम के हैं?",
    points: ["They scavenge on our waste, and keep the city clean.", "Nature's pest and rodent control.", "They offer companionship to the lonely, and teach empathy.", "They protect the streets from invaders, and the residents too."] },
  { n: "03", title: "What you can do", from: "Rethinking Indies and Coexisting with the planet", hi: "अब सवाल है, हम इनके लिए क्या कर सकते हैं?",
    points: ["Feed them. Place water, and give them shelter. Provide warm beds in winter.", "Don't shoo them away. Treat them with kindness.", "Get them sterilised; deworm and vaccinate them.", "Don't buy them: foster or adopt."] },
  { n: "04", title: "Fostering and adoption", from: "Coexisting with the planet",
    points: ["Fostering makes you the temporary guardian of an animal in distress. Community animals need fostering more than adoption: to recover from illness or surgery, or while too young for adoption.", "Adoption makes you the permanent legal guardian of an animal. It is a permanent decision."] },
  { n: "05", title: "What the law says", from: "Coexisting with the planet",
    points: ["It is our fundamental duty as citizens of India to protect and take care of all living creatures, including plants and animals.", "Stray dogs cannot be relocated. Abandoning a pet is a punishable offence.", "Teasing, feeding or disturbing animals in a zoo is punishable.", "Owning monkeys, parakeets, snakes, peacocks or turtles is illegal and punishable."] },
  { n: "06", title: "Feel first", from: "Hello!",
    points: ["What you feel when you hear a story is your intuition; what changes when the victim changes is how society shapes you.", "Don't reach for words first. Just feel. Look them in the eye."] },
];

