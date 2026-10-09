/* ════════════════════════════════════════════════════════════════════
   A look at a sighting's photograph before it can go live by itself.

   One Claude vision call per report that has already passed every rule
   in lib/auto-approve: is there an animal in the photo, and is anything
   in it that would identify a person (a face, a licence plate, a house
   number)? Answers come back as structured JSON. Anything short of a
   clear "animal, nothing identifying" — including no API key, a timeout,
   a refusal or an unparseable answer — returns `ok: false`, and the
   report simply waits for a person in the moderation queue.
   ════════════════════════════════════════════════════════════════════ */

import Anthropic from "@anthropic-ai/sdk";

export type PhotoVerdict = { ok: boolean; reason: string; animal?: boolean; identifying?: boolean };

const SCHEMA = {
  type: "object",
  properties: {
    animal_present: { type: "boolean", description: "A dog, cat or other street animal is clearly visible." },
    identifying_detail: { type: "boolean", description: "A recognisable human face, a vehicle licence plate, or a readable house number or address is visible." },
    note: { type: "string", description: "One short sentence on what the photo shows." },
  },
  required: ["animal_present", "identifying_detail", "note"],
  additionalProperties: false,
} as const;

const PROMPT = `This photograph was sent to StrayPaw, a public record of street animals in India, as a sighting report. Look at it and answer two questions about what is visible.

animal_present: is a street animal (usually a dog, sometimes a cat or another animal) clearly visible? A blurred or tiny but recognisable animal counts; a photo of only a street, a person, a document or a screen does not.

identifying_detail: is anything visible that would identify a person or a home if published: a recognisable human face, a vehicle licence plate you could read, or a readable house number or address? Hands, feet, backs of heads, distant unrecognisable people and shop signs do not count.

Then give one short note describing the photo.`;

export function photoCheckAvailable() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function checkSightingPhoto(photoUrl: string): Promise<PhotoVerdict> {
  if (!photoCheckAvailable()) return { ok: false, reason: "Photo check unavailable" };
  if (!/^https:\/\//i.test(photoUrl)) return { ok: false, reason: "Photo is not a public https link" };
  const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: photoUrl } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return { ok: false, reason: "Photo check declined" };
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
    if (!text) return { ok: false, reason: "Photo check gave no answer" };
    const out = JSON.parse(text) as { animal_present?: unknown; identifying_detail?: unknown };
    const animal = out.animal_present === true;
    const identifying = out.identifying_detail === true;
    if (!animal) return { ok: false, reason: "No animal seen in the photo", animal, identifying };
    if (identifying) return { ok: false, reason: "Photo may show a face, plate or address", animal, identifying };
    return { ok: true, reason: "Animal in photo, nothing identifying", animal, identifying };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, reason: "Photo check busy" };
    if (error instanceof Anthropic.APIError) return { ok: false, reason: `Photo check error ${error.status ?? ""}`.trim() };
    return { ok: false, reason: "Photo check failed" };
  }
}
