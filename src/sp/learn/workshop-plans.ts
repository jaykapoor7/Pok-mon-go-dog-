import { COURSES } from "./content";

const lesson = (c: string, l: string) => { const x = COURSES.find((k) => k.id === c)!; return { c: x, l: x.lessons.find((k) => k.id === l)! }; };
/* `docs`: The Kind Hour Foundation documents StrayPaw suggests pairing
   with each session (ids from KIND_HOUR_MATERIALS). */
export const PLANS = [
  { id: "safe-street", title: "Safe around street dogs", who: "Classes 3 to 8, with a teacher present", minutes: 45, docs: ["learn-about-nature", "rethinking-indies"], steps: [
    { m: 5, t: "Ask: which dogs live near our school? What do they do all day? Write words on the board; no names of children's homes." },
    { m: 12, ...lesson("on-the-street", "a-calm-encounter") },
    { m: 12, ...lesson("on-the-street", "after-a-bite") },
    { m: 10, ...lesson("on-the-street", "observe-dont-assume") },
    { m: 6, t: "Close: each child says one thing they will do differently. Show where to find local rescue contacts." },
  ] },
  { id: "read-the-map", title: "Reading a map of animals", who: "Senior school, college, council staff", minutes: 60, docs: ["gully-gang-goa"], steps: [
    { m: 5, t: "Show a city on the StrayPaw map. Ask: what does an empty area mean?" },
    { m: 15, ...lesson("reading-the-record", "unknown-is-not-zero") },
    { m: 12, ...lesson("reading-the-record", "areas-not-spots") },
    { m: 10, ...lesson("reading-the-record", "count-the-right-thing") },
    { m: 13, ...lesson("how-populations-change", "a-number-needs-a-whole") },
    { m: 5, t: "Close: open one city's Insights and find a finding's limit together." },
  ] },
  { id: "volunteer-start", title: "First evening for new volunteers", who: "Adults joining an organisation", minutes: 50, docs: ["rethinking-indies"], steps: [
    { m: 10, ...lesson("on-the-street", "observe-dont-assume") },
    { m: 15, ...lesson("reporting-well", "practice-report") },
    { m: 15, ...lesson("how-populations-change", "a-model-street") },
    { m: 10, t: "Close: walk through what happens after a real report, from received to accepted, using the organisation's own queue." },
  ] },
];
