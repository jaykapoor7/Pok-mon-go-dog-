/* Automatic approval only when every check passes; anything in doubt waits for a person. */
import assert from "node:assert/strict";
import { passesAutoApproval, sightingChecks } from "../src/lib/auto-approve";
import { checkSightingPhoto, photoCheckAvailable } from "../src/lib/photo-check";
import { animalSubtitle, animalTag, animalTitle, describeAnimal, givenName } from "../src/lib/animal-name";
import { isSensitivePhoto, describesInjury } from "../src/lib/sensitive-photo";
import { dogArtFor, DOG_ART, WORKS } from "../src/lib/art/sources";

const base = { photoUrl: "https://x/p.jpg", lat: 11.0, lng: 76.9, notes: "Limping near the bus stop", nickname: null, signedIn: true, forOrganisation: false, claimedDogId: null, trust: 60 };

assert.equal(passesAutoApproval(base), true, "a clean, signed-in report with a photo passes");
assert.equal(passesAutoApproval({ ...base, photoUrl: null }), false, "no photo waits");
assert.equal(passesAutoApproval({ ...base, lat: 51.5, lng: -0.1 }), false, "outside India waits");
assert.equal(passesAutoApproval({ ...base, notes: "call me 9876543210" }), false, "a phone number waits");
assert.equal(passesAutoApproval({ ...base, notes: "see www.example.com" }), false, "a link waits");
assert.equal(passesAutoApproval({ ...base, notes: "mail a@b.co" }), false, "an email waits");
assert.equal(passesAutoApproval({ ...base, claimedDogId: "2da50f17-0897-498b-8a1d-04a47f64626c" }), false, "a claimed identity waits for a person");
assert.equal(passesAutoApproval({ ...base, signedIn: false, trust: 60 }), false, "an untrusted guest waits");
assert.equal(passesAutoApproval({ ...base, signedIn: false, trust: 85 }), true, "a highly trusted guest passes");
assert.equal(passesAutoApproval({ ...base, signedIn: false, forOrganisation: true }), true, "an organisation volunteer passes");
assert.equal(sightingChecks(base).length, 5);
process.env.AUTO_APPROVE_SIGHTINGS = "off";
assert.equal(passesAutoApproval(base), false, "the switch turns it off");
delete process.env.AUTO_APPROVE_SIGHTINGS;

/* Names: filing labels are not names; the tag is short and unique. */
assert.equal(givenName("Dog · KK Pudur · Oct 2024"), null);
assert.equal(givenName("Jamshedpur dog 2482"), null);
assert.equal(givenName("unknown"), null);
assert.equal(givenName("pinky"), "Pinky");
assert.equal(givenName("Kaali B"), "Kaali B");
assert.equal(animalTag({ straypaw_id: "SP-D-PK0UBR" }), "PK0UBR");
assert.equal(animalTitle({ name: "Dog near Kovilmedu", straypaw_id: "SP-D-PK0UBR" }), "PK0UBR");
assert.equal(animalTitle({ name: "Moti", straypaw_id: "SP-D-PK0UBR" }), "Moti");

assert.equal(describeAnimal({ sex: "Female", size: "medium" }), "Female · medium");
assert.equal(describeAnimal({ sex: "M", size: "puppy" }), "Male puppy");
assert.equal(describeAnimal({ sex: null, size: "small" }), "Small dog");
assert.equal(describeAnimal({}), null);
assert.equal(animalSubtitle({ name: null, sex: "female", size: "small", zone: "Kovilmedu, Coimbatore" }), "Female · small · Kovilmedu");
assert.equal(animalSubtitle({ name: null, zone: "Kovilmedu" }), "Unnamed · Kovilmedu");
/* Sensitive photos start blurred; portraits are stable and puppies get pups. */
assert.equal(isSensitivePhoto({ photo_sensitive: true }), true);
assert.equal(isSensitivePhoto({ needs_help: true }), true);
assert.equal(isSensitivePhoto({ photo_sensitive: false, needs_help: false }), false);
assert.equal(isSensitivePhoto(null), false);
assert.equal(describesInjury("deep wound on the leg"), true);
assert.equal(describesInjury(null, ["friendly", "hit by a car"]), true);
assert.equal(describesInjury("sleeping by the tea stall", ["friendly"]), false);
assert.deepEqual(dogArtFor("abc"), dogArtFor("abc"));
assert.equal(DOG_ART.find((d) => d.src === dogArtFor("abc", "puppy").src)?.puppy, true);
assert.notEqual(DOG_ART.find((d) => d.src === dogArtFor("abc", "medium").src)?.puppy, true);
for (const d of DOG_ART) assert.ok(WORKS[d.work], `credit for ${d.src}`);
/* Without credentials the photo check is unavailable and never approves. */
async function photo() {
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
  assert.equal(photoCheckAvailable(), false);
  const v = await checkSightingPhoto("https://example.com/dog.jpg");
  assert.equal(v.ok, false, "no key: the photo check never approves");
  process.env.ANTHROPIC_API_KEY = "test-key-not-real";
  const insecure = await checkSightingPhoto("http://example.com/dog.jpg");
  assert.equal(insecure.ok, false, "non-https photos are never sent");
  delete process.env.ANTHROPIC_API_KEY;
}
photo().then(() => console.log("auto-approve, photo check, sensitive photos, portraits and naming: ok"));
