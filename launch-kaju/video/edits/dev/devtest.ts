import type { Edit } from "../../src/types";

/* Engine test, not a film. Only loaded with REMOTION_KAJU_DEV=1 (npm run test:engine builds its take and checks the result).
   It exercises what the sample does not: voice files from log.audio through a jump cut and a 2x span, ducking,
   conversation subtitles in Devanagari and Kannada with an English gloss, marks, a spotlight, camera "auto",
   a wipe, and the dark cards. The "voice" is two sine beeps, so sync can be measured in the render. */
const edit: Edit = {
  slug: "devtest",
  title: "Engine test",
  host: "app.straypaw.org · staging data",
  segments: [
    { kind: "title", duration: 1, variant: "dark", eyebrow: "Engine test", text: "Voice, subtitles,\ncuts and speed" },
    {
      kind: "screen", take: "rectest-beep", spans: [{ from: 0.5, to: 3.0 }, { from: 4.5, to: 8.0, speed: 2 }],
      camera: "auto",
      subtitles: [
        { audio: "audio/q.wav", gloss: "How many animals are on our register?" },
        { audio: "audio/a.wav", gloss: "There are 412 animals on your register." },
      ],
      callouts: [{ from: 6.6, to: 7.9, anchor: { mark: "answer" }, variant: "spotlight", text: "From your records", side: "bottom" }],
    },
    { kind: "end", duration: 2, variant: "dark", line: "The agent inside StrayPaw.", url: "app.straypaw.org", transition: "wipe" },
  ],
};
export default edit;
