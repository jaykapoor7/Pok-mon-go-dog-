import assert from "node:assert/strict";
import { locationCell } from "../src/lib/location-cell";
import { latLngToCell } from "h3-js";

async function main() {
assert.equal(await locationCell(null, null), null);
assert.equal(await locationCell(11, 76.95), latLngToCell(11, 76.95, 8));
assert.equal(await locationCell(0, 0), latLngToCell(0, 0, 8));
for (const [lat, lng] of [[11, null], [null, 76.95], [NaN, 76.95], [91, 0], [0, 181]]) {
  await assert.rejects(locationCell(lat, lng), /valid latitude and longitude/);
}
console.log("Location cells use explicit coordinate pairs and preserve unknown locations.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
