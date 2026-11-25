import type { Edit } from "../src/types";

/* Sample edit: the engine end to end on the short "rectest" take (sample-takes/rectest).
   Copy this file, change the slug, point it at real takes. Times are seconds on the take's clock; positions are CSS px
   of the recording (1600 x 900). */
const composer = { x: 316, y: 217, w: 1040, h: 131 };
const answer = { x: 316, y: 500, w: 1040, h: 227 };

const edit: Edit = {
  slug: "sample",
  title: "Ask Kaju",
  host: "app.straypaw.org · staging data",
  music: "auto",
  segments: [
    { kind: "title", duration: 2, eyebrow: "Kaju, inside StrayPaw", text: "What do you\nwant done?", kaju: "greeting" },
    {
      kind: "screen", take: "rectest", from: 0.2, to: 8.3,
      camera: [
        { t: 0.2, zoom: 1 },                                                                    // wide
        { t: 1.15, box: composer, v: { zoom: 1.4, focus: { x: 600, y: 290 } } },              // in on the composer as the pointer arrives
        { t: 5.25, box: { x: 316, y: 440, w: 1040, h: 300 }, v: { zoom: 1.3, focus: { x: 690, y: 600 } } },   // down to the answer
      ],
      captions: [{ from: 1.5, to: 5.0, text: "Ask in plain language.", words: true }],
      callouts: [{ from: 6.9, to: 8.2, text: "Answered from your records", anchor: { box: answer }, side: "top" }],
      chimes: [6.4],                                                                            // the answer lands
    },
    { kind: "end", duration: 3, line: "The agent inside StrayPaw.", url: "app.straypaw.org" },
  ],
  thumb: { take: "rectest", t: 7.6, headline: "Ask Kaju.\nIt gets done.", eyebrow: "New in StrayPaw", kaju: "sitting", zoom: 1.5, focus: { x: 700, y: 600 }, v: { zoom: 1.25, focus: { x: 720, y: 520 } } },
};
export default edit;
