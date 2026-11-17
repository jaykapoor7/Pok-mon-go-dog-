/* Starting points for the record open on the page: what people most often want next with it, worded the way Kaju's
   rules already understand, so each works without a model. `send` runs at once; otherwise the words are placed in the
   composer for the person to finish. Health pages get none: patient work starts from the clinic's own screens. */

export type Starter = { label: string; text: string; send: boolean };
const ID = "([0-9a-f-]{36})";

export function startersFor(path: string): Starter[] {
  const p = path.split(/[?#]/)[0];
  if (new RegExp(`^/ngo/(?:cases|verification)/${ID}$`, "i").test(p)) return [
    { label: "Summarise this case", text: "Summarise this case", send: true },
    { label: "Follow up next week", text: "Remind me to follow up on this case next week", send: true },
    { label: "Add a note", text: "Note: ", send: false },
  ];
  if (new RegExp(`^/ngo/animals/${ID}$`, "i").test(p)) return [
    { label: "Record a vaccination today", text: "Vaccinated today", send: true },
    { label: "Check on it next week", text: "Remind me to check on this animal next week", send: true },
    { label: "Add a note", text: "Note: ", send: false },
  ];
  if (new RegExp(`^/(?:ngo/submissions|gov/verification)/${ID}$`, "i").test(p)) return [
    { label: "Check this package", text: "Check this package", send: true },
  ];
  return [];
}
