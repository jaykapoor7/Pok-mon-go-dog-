/* ════════════════════════════════════════════════════════════════════
   The StrayPaw Learning Academy: courses as data (decision 032).

   Original StrayPaw lessons about reading and keeping the shared record,
   staying safe around street animals, and how populations change. Safety
   steps repeat guidance StrayPaw already publishes on its resources page;
   they are not medical advice and say where to get it. Partner teaching
   material (The Kind Hour Foundation, STRAW India) is never rewritten
   here: it is credited and linked from Workshops and Resources.

   Every interactive is a classroom exercise. None of them can send a
   report, and the population model uses made-up numbers.
   ════════════════════════════════════════════════════════════════════ */

export type Interactive = "unknown-ledger" | "precision" | "units" | "encounter" | "bite-order" | "observe" | "simulation" | "denominator" | "practice-report";
export type Block = { kind: "text"; body: string } | { kind: "do"; id: Interactive; prompt: string } | { kind: "note"; body: string };
export type Lesson = { id: string; title: string; minutes: number; takeaway: string; blocks: Block[] };
export type Course = { id: string; title: string; dek: string; ink: string; audience: string; lessons: Lesson[] };

export const COURSES: Course[] = [
  {
    id: "reading-the-record", title: "Reading the record", ink: "#2f3d8f", audience: "Everyone, especially councils, journalists and students",
    dek: "What a map of street animals can and cannot tell you: unknowns, areas and units.",
    lessons: [
      {
        id: "unknown-is-not-zero", title: "Unknown is not zero", minutes: 6,
        takeaway: "When something was not recorded, say “not recorded”. Counting it as “no” makes a programme look worse, or better, than it was.",
        blocks: [
          { kind: "text", body: "Every record of an animal answers some questions and leaves others blank. Was it sterilised? Sometimes the person who met it knew. Often they did not." },
          { kind: "text", body: "A blank is not a “no”. If twenty animals were seen and only eight have a sterilisation status, the honest statement is about those eight, with the other twelve shown as unknown." },
          { kind: "do", id: "unknown-ledger", prompt: "Sort the street's animals, then watch the same figure change depending on how blanks are treated." },
          { kind: "note", body: "On StrayPaw, unknown is drawn with a hatch, never left out and never painted as “no”." },
        ],
      },
      {
        id: "areas-not-spots", title: "Areas, not spots", minutes: 5,
        takeaway: "A record is only as precise as the way it was placed. Public maps show areas, never an animal's spot.",
        blocks: [
          { kind: "text", body: "Some records carry a GPS point. Many carry a locality name. Some old registers only say which city. A map that draws them all as precise dots is inventing precision." },
          { kind: "do", id: "precision", prompt: "Move between the four ways a record can be placed and see what each one allows you to say." },
          { kind: "note", body: "StrayPaw's public areas are about 0.74 km² each. They are analysis areas, not wards, and they protect animals and the people who feed them." },
        ],
      },
      {
        id: "count-the-right-thing", title: "Count the right thing", minutes: 5,
        takeaway: "Animal profiles, requests, sightings and care events are different units. Adding them never gives a number of animals.",
        blocks: [
          { kind: "text", body: "One dog can be sighted ten times, need help twice and be vaccinated once. That is ten sightings, two requests and one care event, for one animal, who may also have a second profile with another organisation." },
          { kind: "do", id: "units", prompt: "Name the unit behind each statement." },
        ],
      },
    ],
  },
  {
    id: "on-the-street", title: "On the street", ink: "#c0603c", audience: "Children with an adult, residents, volunteers",
    dek: "Calm encounters, what to do after a bite, and how to describe what you saw.",
    lessons: [
      {
        id: "a-calm-encounter", title: "A calm encounter", minutes: 6,
        takeaway: "Give the animal room. Stand still, turn slightly away and never corner, chase or hit a dog that is signalling discomfort.",
        blocks: [
          { kind: "text", body: "Most street dogs avoid trouble. Problems usually start when a dog feels cornered, surprised or that its food or puppies are threatened." },
          { kind: "do", id: "encounter", prompt: "Choose what you would do in each moment. There is feedback for every choice." },
          { kind: "note", body: "If a dog is injured or distressed, keep your distance and contact a rescue helpline; do not try to handle it yourself." },
        ],
      },
      {
        id: "after-a-bite", title: "After a bite or scratch", minutes: 5,
        takeaway: "Wash the wound with soap and running water for at least fifteen minutes, then get anti-rabies care the same day.",
        blocks: [
          { kind: "text", body: "Rabies is preventable when treatment starts promptly, and almost always fatal once symptoms begin. Any bite or scratch that breaks the skin needs medical care, even from a dog that looks healthy." },
          { kind: "do", id: "bite-order", prompt: "Put the steps in order." },
          { kind: "note", body: "This lesson repeats the guidance on StrayPaw's resources page. It is not medical advice: a doctor decides the vaccine schedule and whether immunoglobulin is needed." },
        ],
      },
      {
        id: "observe-dont-assume", title: "Observe, don't assume", minutes: 5,
        takeaway: "Record what you can see: place, time, photo, visible condition. Leave history and outcome blank when you do not know them.",
        blocks: [
          { kind: "text", body: "A good report is short and true. “Limping on the left back leg near the bus stop at 6 pm” helps a rescuer. “Hit by a car, probably abandoned” guesses at things nobody saw." },
          { kind: "do", id: "observe", prompt: "Sort each statement: something you can see, or something you are assuming." },
        ],
      },
    ],
  },
  {
    id: "how-populations-change", title: "How populations change", ink: "#1f6f80", audience: "Older students, volunteers, officials",
    dek: "Why sterilisation programmes are measured over years, and why a count needs a denominator.",
    lessons: [
      {
        id: "a-model-street", title: "A model street", minutes: 8,
        takeaway: "Sterilisation changes a population slowly and only when a large share of animals is reached, year after year. Real places need real counts.",
        blocks: [
          { kind: "text", body: "Animal birth control (ABC) programmes sterilise and vaccinate street dogs and return them to their area. Whether a population shrinks depends on how many are reached, how many new animals arrive, and how long animals live." },
          { kind: "do", id: "simulation", prompt: "Change the share sterilised each year and see what this made-up street does over ten years." },
          { kind: "note", body: "This is a teaching model with invented numbers and simplified rules. It is not a forecast for any real place and must not be quoted as one." },
        ],
      },
      {
        id: "a-number-needs-a-whole", title: "A number needs a whole", minutes: 5,
        takeaway: "“118 dogs sterilised” is an achievement. “60% coverage” needs to know how many dogs live there, which almost nobody has counted.",
        blocks: [
          { kind: "text", body: "Programmes report what they did. Coverage is what they did divided by how many animals there are. Without a careful count of the whole population, coverage is a guess." },
          { kind: "do", id: "denominator", prompt: "Which claims does this drive's record support?" },
        ],
      },
    ],
  },
  {
    id: "reporting-well", title: "Reporting well", ink: "#d99b1c", audience: "Residents, students, new volunteers",
    dek: "Practise a report from start to finish, without sending anything.",
    lessons: [
      {
        id: "practice-report", title: "Practise a report", minutes: 6,
        takeaway: "Place, a clear photo from a safe distance, and what you saw. That is enough for an organisation to act.",
        blocks: [
          { kind: "text", body: "On StrayPaw a report goes to people who may act on it, so classroom practice happens here, in a copy of the form that cannot send." },
          { kind: "do", id: "practice-report", prompt: "Fill in the practice report. Nothing leaves this page." },
          { kind: "note", body: "When you report for real, StrayPaw shows a receipt and its true status: received is not the same as accepted by an organisation." },
        ],
      },
    ],
  },
];

export const lessonCount = COURSES.reduce((a, c) => a + c.lessons.length, 0);
export function findLesson(course: string, lesson: string) {
  const c = COURSES.find((x) => x.id === course);
  const i = c ? c.lessons.findIndex((l) => l.id === lesson) : -1;
  return c && i >= 0 ? { c, l: c.lessons[i], i, prev: c.lessons[i - 1] ?? null, next: c.lessons[i + 1] ?? null } : null;
}

/* Guidance StrayPaw already publishes on /resources, kept word for word. */
export const POST_BITE_STEPS = [
  "Wash the wound immediately with soap and running water for at least 15 minutes.",
  "Apply an antiseptic (povidone-iodine or alcohol-based) after washing.",
  "Visit a hospital or health centre for anti-rabies vaccination (ARV) as soon as possible.",
  "Complete the full course of ARV injections on schedule (typically days 0, 3, 7, 14, and 28).",
  "For deep or bleeding bites, ask about rabies immunoglobulin (RIG) in addition to ARV.",
  "Do not apply turmeric, chilli, or any home remedy to the wound.",
];
export const HELPLINES = [
  { name: "PFA National Helpline", number: "011-23719293", note: "People for Animals, New Delhi" },
  { name: "Friendicoes Emergency", number: "011-24314787", note: "Delhi rescue and ambulance" },
  { name: "BSPCA Mumbai", number: "022-24137518", note: "Mumbai rescue and shelter" },
  { name: "Blue Cross of India", number: "044-22354959", note: "Chennai rescue and ambulance" },
  { name: "CUPA Bengaluru", number: "080-26631514", note: "Bengaluru rescue and shelter" },
  { name: "Animal Help Foundation", number: "079-40203025", note: "Ahmedabad rescue and hospital" },
];
